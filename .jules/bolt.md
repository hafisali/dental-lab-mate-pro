## 2026-07-05 - Parallelizing Analytics Queries with groupBy
**Learning:** Sequential database queries and loop-based aggregations (like count per technician) create significant latency bottlenecks. Combining independent queries into a single `Promise.all` block and replacing (N)$ count loops with a single `groupBy` query reduces database round-trips from ~16+2N to 1 sequential block.
**Action:** Always identify independent Prisma queries and parallelize them. For aggregations over a list of entities (like technician workloads), use `groupBy` to fetch all counts in one round-trip.
