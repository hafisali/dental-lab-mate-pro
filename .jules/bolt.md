## 2025-05-15 - [Analytics API Bottlenecks]
**Learning:** The Analytics API (`src/app/api/analytics/route.ts`) was suffering from significant performance issues due to sequential `await` calls for ~15+ independent database queries, an N+1 pattern for technician workload (2 queries per technician), and redundant queries for delivered cases.
**Action:** Use `Promise.all` to parallelize all independent queries, leverage Prisma `groupBy` for aggregations to eliminate N+1 patterns, and consolidate related data fetches into single queries.
