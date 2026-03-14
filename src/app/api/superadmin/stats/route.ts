import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [
      totalLabs,
      activeLabs,
      totalUsers,
      activeUsers,
      totalCases,
      totalDentists,
      totalRevenue,
      recentLogins,
      recentRegistrations,
    ] = await Promise.all([
      prisma.lab.count(),
      prisma.lab.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.case.count(),
      prisma.dentist.count(),
      prisma.case.aggregate({ _sum: { amount: true } }),
      prisma.loginActivity.count({ where: { action: "LOGIN_SUCCESS", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.loginActivity.count({ where: { action: "REGISTER", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);

    return NextResponse.json({
      totalLabs,
      activeLabs,
      totalUsers,
      activeUsers,
      totalCases,
      totalDentists,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentLogins,
      recentRegistrations,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
