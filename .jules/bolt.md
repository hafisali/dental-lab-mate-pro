# Bolt's Journal - Dental Lab Mate Pro

## 2025-05-14 - Initial Optimization Hunt
**Learning:** Found several N+1 and sequential query patterns in the analytics and dashboard API routes. Specifically, technician workload and monthly volumes are fetched using loops with individual database calls.
**Action:** Replace sequential loop-based queries with `Promise.all` for parallel execution or `groupBy` for bulk data retrieval.
