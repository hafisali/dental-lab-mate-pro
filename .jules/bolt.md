
## 2026-04-30 - Dashboard Monthly Revenue Parallelization
**Learning:** Sequential loops for time-series data aggregation (like fetching revenue for the last 6 months) introduce unnecessary database round-trip latency. Parallelizing these with Promise.all reduces the bottleneck to the single slowest query.
**Action:** Always look for sequential Prisma queries in loops and parallelize them when they are independent.
