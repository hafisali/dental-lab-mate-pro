## 2025-05-15 - Parallelizing Prisma Queries and Solving N+1 in Analytics
**Learning:** Sequential database round-trips in complex analytics dashboards significantly increase API latency. Using `Promise.all` to parallelize independent queries and replacing N+1 patterns (like counting cases per technician in a loop) with `groupBy` aggregations can reduce latency by an order of magnitude.
**Action:** Always audit for sequential `await` calls and loops containing database queries. Use `Promise.all` for parallel execution and `groupBy` or `$queryRaw` to batch aggregate data.
