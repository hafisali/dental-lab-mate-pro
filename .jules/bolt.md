# Bolt's Journal - Performance Learnings

## 2025-05-15 - [Sequential Database Queries]
**Learning:** Sequential database queries in API routes (especially for analytics and dashboards) lead to significantly higher response times as the number of queries increases. Using `Promise.all` to parallelize independent queries can reduce latency by a factor proportional to the number of queries.
**Action:** Always check for sequential `await` calls in API routes and refactor them into `Promise.all` blocks when the queries are independent.

## 2025-05-15 - [N+1 Count Queries]
**Learning:** Fetching counts for each item in a list (e.g., technician workloads) using individual `count` queries creates an N+1 problem. `groupBy` is a much more efficient way to aggregate these counts in a single database round-trip.
**Action:** Use `prisma.model.groupBy` for aggregating metrics across multiple entities instead of looping and querying for each entity.
