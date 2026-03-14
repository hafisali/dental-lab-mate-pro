import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

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

    const where: any = { ...getTenantWhere(labId) };
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get current month range for attendance summary
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
