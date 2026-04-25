## 2025-05-14 - Optimized Analytics API performance
**Learning:** The `Analytics` API was performing sequential database queries for monthly volumes and technician workload, leading to O(N) database round-trips where N is the number of months or technicians.
**Action:** Parallelized all independent queries using `Promise.all` and replaced the technician N+1 loop with a single `prisma.case.groupBy` call. This reduces the total number of database round-trips from ~20+ to just 1 major concurrent block.
