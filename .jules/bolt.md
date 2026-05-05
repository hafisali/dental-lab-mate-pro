## 2025-05-14 - Analytics API Bottlenecks
**Learning:** The `src/app/api/analytics/route.ts` endpoint suffers from multiple performance anti-patterns: sequential database queries in loops (N+1 equivalent for time-series) and per-record count queries for technicians. These patterns cause significant latency as the database size grows.
**Action:** Always prefer `Promise.all` for independent queries and `groupBy` with `Map`-based merging for aggregations instead of sequential `await` in loops or per-item count queries.
