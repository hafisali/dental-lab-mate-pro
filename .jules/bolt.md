## 2026-04-21 - Parallelizing and Aggregating Analytics Queries
**Learning:** Sequential database queries and N+1 count patterns in analytics dashboards significantly increase latency. Prisma's `groupBy` is highly effective for aggregating revenue and status counts at the database level, avoiding large data transfers and in-memory processing.
**Action:** Always prefer `Promise.all` for independent database queries and use `groupBy` for metrics instead of fetching full records and reducing in memory.
