## 2026-05-20 - [Analytics API Optimization]
**Learning:** Sequential database queries and N+1 patterns (especially in loops) are a major performance bottleneck. Consolidating queries and using Prisma's `groupBy` for aggregations significantly reduces database round-trips and data transfer.
**Action:** Always audit API routes for sequential `await` calls that can be parallelized with `Promise.all` and replace in-loop queries with set-based logic or aggregations.
