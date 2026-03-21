## 2025-05-22 - Optimize Analytics API Route
**Learning:** Sequential database queries in a loop (N+1) create significant latency. While fetching all records for in-memory aggregation can reduce round-trips, it can lead to memory pressure for large datasets.
**Action:**
1. Used `Promise.all` to parallelize multiple `count` queries for the 6-month case volume history.
2. Used Prisma's `groupBy` to fetch technician case counts in a single batch query, resolving the N+1 bottleneck.
