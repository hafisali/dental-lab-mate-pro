## 2025-05-14 - Sequential Awaits in Analytics
**Learning:** The `src/app/api/analytics/route.ts` endpoint is a major performance bottleneck due to numerous sequential database queries and N+1-like patterns for technician stats. Parallelizing these and using `groupBy` can significantly reduce response time.
**Action:** Use `Promise.all` for independent queries and `groupBy` for aggregated technician stats.

## 2025-05-14 - Date Rollover Bug
**Learning:** Using `setMonth()` on a `Date` object without first setting the day to 1 can cause the "31st of the month" bug, where months are skipped during calculations.
**Action:** Always call `setDate(1)` before `setMonth()` when calculating monthly ranges.
