## 2025-05-15 - [Analytics API Optimization]
**Learning:** The Analytics API in `src/app/api/analytics/route.ts` contains multiple performance anti-patterns:
1. **Sequential Awaits:** Independent database queries for metrics (overdue cases, status counts, etc.) are executed sequentially, increasing overall latency.
2. **Sequential Loops:** The 6-month case volume time-series is calculated using a loop with sequential `await prisma.case.count` calls.
3. **N+1 Queries:** Technician workload is calculated by iterating over all technicians and performing two separate count queries for each.
4. **Redundant Data Fetching:** Delivered cases are fetched twice: once for turnaround time and once for on-time rate.
5. **Inefficient Aggregations:** Top dentist revenue is calculated by fetching full case records and summing them in memory, which is inefficient for large datasets.

**Action:** Refactor the API to use `Promise.all` for parallel execution, consolidate redundant queries, and utilize Prisma's `groupBy` for efficient database-level aggregations of workload and revenue metrics.
