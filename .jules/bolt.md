## 2025-05-22 - [Optimization of dashboard revenue query]
**Learning:** Sequential `prisma.aggregate` calls in a loop (N+1 query pattern) can be significantly faster when replaced with a single `prisma.findMany` call and in-memory aggregation, even if it shifts some work to the JS runtime. This reduces database roundtrip latency which is often the primary bottleneck.
**Action:** Always look for loops containing database calls and attempt to batch them into single queries using `findMany`, `groupBy`, or `in` filters.
