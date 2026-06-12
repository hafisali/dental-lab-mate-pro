## 2026-06-12 - Analytics and Dashboard Parallelization
**Learning:** Sequential await calls in API routes create a performance bottleneck that scales linearly with the number of data points (e.g., 6 months of data = 6x round-trips). Parallelizing independent queries with Promise.all and using database-level aggregations like groupBy significantly reduces latency.
**Action:** Always check for loops containing awaits and replace them with Promise.all. Use Prisma's groupBy for aggregating related counts instead of fetching and summing in-memory.
