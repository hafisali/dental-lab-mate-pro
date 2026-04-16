# Bolt's Performance Journal

## 2025-05-15 - [Analytics Optimization] Parallelize Queries & Fix N+1 Tech Workload
**Learning:** The analytics route had a significant "waterfall" bottleneck, executing ~15 sequential database queries. Additionally, technician workload was calculated using an N+1 pattern (looping over technicians to count cases).
**Action:** Use `Promise.all` to group all independent Prisma queries into a single concurrent set. Replace loop-based counting with `prisma.case.groupBy` on `technicianId` and `status` to fetch all technician metrics in one round-trip. Always define explicit interfaces for `groupBy` results to satisfy the project's strict ESLint rules against `any`.
