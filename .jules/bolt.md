## 2026-07-16 - Technician Workload Optimization Pattern
**Learning:** In this codebase, technician workloads were being calculated using a sequential loop over active technicians, executing two separate `count` queries per technician (N+1 * 2 round-trips). This can be replaced with a single `prisma.case.groupBy` query on `technicianId` and `status` to fetch all stats in one database call.
**Action:** Use `groupBy` for multi-resource aggregation instead of per-record counting loops. Always parallelize independent dashboard/analytics queries using `Promise.all` to reduce TTI.
