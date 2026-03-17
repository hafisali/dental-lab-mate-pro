## 2025-05-22 - [Optimize technician workload calculation performance]
**Learning:** In analytics APIs that require multiple counts for many related entities, an N+1 query pattern (looping over entities and executing separate `count` queries) is a significant bottleneck. This can be optimized using `prisma.case.groupBy` to fetch all relevant counts in a single database round-trip and aggregating in-memory.
**Action:** Always check for N+1 query patterns in analytical or reporting routes and refactor them into bulk queries with manual aggregation where appropriate.
