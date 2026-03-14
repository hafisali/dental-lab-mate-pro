import prisma from "./prisma";
import { getPlanLimits, type PlanTier } from "./plans";

/**
 * Requires a valid labId from the session. Throws if missing (non-SUPERADMIN).
 * SUPERADMIN users can optionally scope to a lab.
 */
export function requireLabId(session: any): string {
  const user = session?.user as any;
  if (!user) throw new Error("Unauthorized");

  if (user.role === "SUPERADMIN") {
    return user.labId || "";
  }

  if (!user.labId) {
    throw new Error("No clinic associated with this account. Please contact support.");
  }

  return user.labId;
}

/**
 * Build a where clause that includes labId scoping.
 * For SUPERADMIN without labId, returns empty object (see all).
 */
export function getTenantWhere(labId: string): { labId?: string } {
  return labId ? { labId } : {};
}

/**
 * Check if the lab has reached its limit for a given resource.
 */
export async function checkResourceLimit(
  labId: string,
  resource: "users" | "patients" | "cases" | "storage"
): Promise<{ allowed: boolean; current: number; max: number }> {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    select: { planTier: true, storageUsedMB: true },
  });

  if (!lab) return { allowed: false, current: 0, max: 0 };

  const limits = getPlanLimits(lab.planTier as PlanTier);

  switch (resource) {
    case "users": {
      const count = await prisma.user.count({ where: { labId } });
      const max = limits.maxUsers;
      return { allowed: max === -1 || count < max, current: count, max };
    }
    case "patients": {
      const count = await prisma.patient.count({ where: { labId } });
      const max = limits.maxPatients;
      return { allowed: max === -1 || count < max, current: count, max };
    }
    case "cases": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const count = await prisma.case.count({
        where: { labId, createdAt: { gte: startOfMonth } },
      });
      const max = limits.maxCasesPerMonth;
      return { allowed: max === -1 || count < max, current: count, max };
    }
    case "storage": {
      const current = lab.storageUsedMB;
      const max = limits.maxStorageMB;
      return { allowed: max === -1 || current < max, current, max };
    }
    default:
      return { allowed: true, current: 0, max: -1 };
  }
}

/**
 * Generate a URL-safe slug from a lab name.
 * Appends random suffix if collision exists.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  if (!slug) slug = "clinic";

  const existing = await prisma.lab.findUnique({ where: { slug } });
  if (!existing) return slug;

  // Add random suffix
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}
