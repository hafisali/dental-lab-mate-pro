## 2026-09-29 - Atomic deleteMany with Tenant Filter

**Learning:** In Prisma + multi-tenant Next.js route handlers, validating tenant access with `findFirst` followed by `delete` causes an unnecessary sequential database round-trip (TOCTOU pattern).
**Action:** Replace the two-step `findFirst` + `delete` pattern with `deleteMany({ where: { id, ...getTenantWhere(labId) } })` and check `count === 0` to return a 404 response if the item was not found or didn't belong to the tenant.
