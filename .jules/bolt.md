## 2025-05-15 - [API Waterfall & N+1 Optimization]
**Learning:** Sequential `await` calls in API routes create significant latency waterfalls. Prisma `count` queries in loops (N+1) are particularly expensive. Consolidating all independent database operations into a single top-level `Promise.all` block, combined with `groupBy` for aggregations, reduces API response time to the duration of the single slowest query.
**Action:** Always identify independent database fetches and wrap them in `Promise.all`. Replace per-item counts/aggregations with `groupBy` or batch queries.
