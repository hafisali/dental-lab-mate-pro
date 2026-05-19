## 2025-05-14 - [API Optimization]
**Learning:** Sequential `await` calls in API routes create significant performance bottlenecks. N+1 query patterns for aggregations (like technician workload) can be replaced with Prisma `groupBy` and in-memory Map correlation for O(1) efficiency.
**Action:** Always wrap independent Prisma queries in `Promise.all` and use `groupBy` for bulk aggregation instead of looping counts.

## 2025-05-14 - [Date Bug]
**Learning:** Calculating months without setting the day to 1st (e.g., `d.setMonth(d.getMonth() - i)`) causes "31st of the month" bugs where months are skipped if the current month has more days than the target month.
**Action:** Always use `d.setDate(1)` before modifying the month in time-series calculations.
