## 2026-06-27 - [Optimized Analytics API Performance]
**Learning:** The Analytics API was suffering from sequential await bottlenecks (11+ sequential queries) and an N+1 pattern in technician workload calculation (2N+1 queries).
**Action:** Parallelized all independent top-level queries into a single `Promise.all` block and replaced the technician loop with a single Prisma `groupBy` query. This reduced database roundtrips from O(N) to O(1) sequential blocks.
