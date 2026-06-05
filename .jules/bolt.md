## 2025-05-14 - [Analytics API Optimization]
**Learning:** Sequential `await` calls for independent queries and N+1 patterns in aggregations are major performance drains in Prisma-based API routes. Using `Promise.all` for parallelization and `groupBy` for database-level aggregation provides significant speedups.
**Action:** Always check for loops with `await` or multiple sequential `await` calls. Use `groupBy` for any count/sum aggregations involving related entities instead of fetching full records.
