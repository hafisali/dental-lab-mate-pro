import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireLabId } from "@/lib/tenant";
import { getPlanLimits, type PlanTier } from "@/lib/plans";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const labId = requireLabId(session);

    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      select: {
        planTier: true,
        storageUsedMB: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
      },
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    const tier = lab.planTier as PlanTier;
    const limits = getPlanLimits(tier);

    // Count current usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [userCount, patientCount, caseCount] = await Promise.all([
      prisma.user.count({ where: { labId } }),
      prisma.patient.count({ where: { labId } }),
      prisma.case.count({
        where: { labId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    const storageUsedMB = lab.storageUsedMB || 0;

    const usage = {
      users: userCount,
      patients: patientCount,
      casesThisMonth: caseCount,
      storageMB: storageUsedMB,
    };

    const planLimits = {
      maxUsers: limits.maxUsers,
      maxPatients: limits.maxPatients,
      maxCasesPerMonth: limits.maxCasesPerMonth,
      maxStorageMB: limits.maxStorageMB,
    };

    // Calculate percentages (-1 means unlimited)
    const percentages = {
      users: limits.maxUsers === -1 ? 0 : Math.round((userCount / limits.maxUsers) * 100),
      patients: limits.maxPatients === -1 ? 0 : Math.round((patientCount / limits.maxPatients) * 100),
      casesThisMonth: limits.maxCasesPerMonth === -1 ? 0 : Math.round((caseCount / limits.maxCasesPerMonth) * 100),
      storageMB: limits.maxStorageMB === -1 ? 0 : Math.round((storageUsedMB / limits.maxStorageMB) * 100),
    };

    return NextResponse.json({
      plan: {
        tier,
        name: limits.name,
        price: limits.price,
        yearlyPrice: limits.yearlyPrice,
        trialEndsAt: lab.trialEndsAt,
        subscriptionId: lab.stripeSubscriptionId,
      },
      limits: planLimits,
      usage,
      percentages,
    });
  } catch (error: any) {
    console.error("[BILLING_USAGE]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
