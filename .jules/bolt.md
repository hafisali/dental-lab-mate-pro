## 2026-06-11 - Analytics API Parallelization and N+1 Fix
**Learning:** The `analytics/route.ts` endpoint was performing several sequential database queries and an N+1 pattern for technician workload, which significantly slows down response times as the dataset grows. Prisma's `groupBy` and `Promise.all` are essential for consolidating these operations.
**Action:** Parallelize independent queries and use `groupBy` to aggregate related data in a single database round-trip.
