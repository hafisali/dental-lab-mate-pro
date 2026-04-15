## 2025-05-14 - Optimized Analytics and Dashboard Routes
**Learning:** Sequential execution of multiple Prisma queries in Next.js API routes creates significant latency bottlenecks. Using `Promise.all` to parallelize independent queries and replacing N+1 counting patterns with `groupBy` or database-level aggregation dramatically improves response times.
**Action:** Always prefer `Promise.all` for fetching dashboard/analytics metrics and use `prisma.model.groupBy` for multi-entity aggregations to minimize data transfer and DB round-trips.
