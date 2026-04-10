## 2025-05-22 - [Analytics API Optimization]
**Learning:** Found multiple performance anti-patterns in a single analytics endpoint: N+1 queries for technician workload, sequential database queries for monthly trends, and excessive data fetching (over-fetching) for revenue calculations.
**Action:** Use `prisma.case.groupBy` for aggregations like counts and sums instead of fetching full records. Use `Promise.all` to parallelize independent database queries. Always check if a loop contains database calls and refactor to batch or parallelize them.
