import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma, StaffStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Allow dynamic year & month filtering for calendar/payroll navigation (default to current month)
    const now = new Date();
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month"); // 1-indexed (1..12) or 0-indexed (0..11)

    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth();

    if (yearParam) {
      const parsedYear = parseInt(yearParam, 10);
      if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear < 2100) {
        targetYear = parsedYear;
      }
    }

    if (monthParam) {
      const parsedMonth = parseInt(monthParam, 10);
      if (!isNaN(parsedMonth)) {
        // Handle both 0-indexed (0..11) and 1-indexed (1..12) inputs safely
        targetMonth = parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth - 1 : Math.max(0, Math.min(11, parsedMonth));
      }
    }

    // Always set date to 1st to prevent month rollover/overflow bugs
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const where: Prisma.StaffWhereInput = { ...getTenantWhere(labId) };
    if (status) {
      where.status = status as StaffStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Performance optimization: scope attendance and payment relational queries strictly to
    // the target month date range. This prevents fetching unbounded historical attendance/payroll
    // data as the database grows, keeping API payload compact and query execution fast.
    const staff = await prisma.staff.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        attendance: {
          where: {
            date: { gte: monthStart, lte: monthEnd },
          },
        },
        payments: {
          where: {
            date: { gte: monthStart, lte: monthEnd },
          },
        },
        _count: {
          select: {
            attendance: true,
            payments: true,
          },
        },
      },
    });

    // Add attendance summary to each staff member
    const staffWithSummary = staff.map((s) => {
      const presentDays = s.attendance.filter((a) => a.status === "PRESENT").length;
      const absentDays = s.attendance.filter((a) => a.status === "ABSENT").length;
      const halfDays = s.attendance.filter((a) => a.status === "HALF_DAY").length;
      const leaveDays = s.attendance.filter((a) => a.status === "LEAVE").length;
      const monthlyPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        ...s,
        attendanceSummary: { presentDays, absentDays, halfDays, leaveDays },
        monthlyPaid,
      };
    });

    return NextResponse.json(staffWithSummary);
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const body = await req.json();

    if (body.type === "attendance") {
      // Record or update attendance
      const dateOnly = new Date(body.date);
      dateOnly.setHours(0, 0, 0, 0);

      const attendance = await prisma.staffAttendance.upsert({
        where: {
          staffId_date: {
            staffId: body.staffId,
            date: dateOnly,
          },
        },
        update: {
          status: body.status,
          notes: body.notes || null,
        },
        create: {
          staffId: body.staffId,
          date: dateOnly,
          status: body.status,
          notes: body.notes || null,
        },
        include: {
          staff: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json(attendance, { status: 201 });
    }

    if (body.type === "payment") {
      // Record salary payment
      const payment = await prisma.staffPayment.create({
        data: {
          staffId: body.staffId,
          date: body.date ? new Date(body.date) : new Date(),
          amount: body.amount,
          method: body.method || "CASH",
          remarks: body.remarks || null,
          deductions: body.deductions || 0,
          bonuses: body.bonuses || 0,
        },
        include: {
          staff: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json(payment, { status: 201 });
    }

    // Create new staff member
    const newStaff = await prisma.staff.create({
      data: {
        name: body.name,
        role: body.role || "Technician",
        phone: body.phone || "",
        email: body.email || null,
        salary: body.salary || 0,
        joinedDate: body.joinedDate ? new Date(body.joinedDate) : new Date(),
        status: body.status || "ACTIVE",
        labId,
      },
    });

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error) {
    console.error("Staff POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
