## 2025-05-22 - Parallelizing Prisma Queries for API Performance
**Learning:** Sequential `await` calls for independent database queries create a performance bottleneck equal to the sum of all query times. Consolidating redundant queries and using `Promise.all` can reduce latency to approximately the time of the single slowest query.
**Action:** Always look for independent Prisma queries that can be parallelized, especially in analytics or dashboard endpoints.

## 2025-05-22 - Optimizing Technician Workload with GroupBy
**Learning:** Using a loop to perform count queries for multiple technicians ($O(N)$) is highly inefficient. A single `groupBy` query on the related model is much faster and reduces database round-trips from $2N$ to 1.
**Action:** Use `groupBy` for aggregate statistics across related records instead of querying in a loop.
