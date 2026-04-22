## 2025-05-15 - Parallelization and N+1 Elimination in Analytics
**Learning:** The analytics route was making 11+ sequential database queries and had N+1 patterns for technician workloads (looping counts per tech) and monthly volumes (looping counts per month). This results in high latency that scales poorly with data size.
**Action:** Parallelize independent queries using `Promise.all` and replace per-entity loops with single `groupBy` queries followed by in-memory aggregation to drastically reduce database round-trips and API response time.
