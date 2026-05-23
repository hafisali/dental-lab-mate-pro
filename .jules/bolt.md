## 2025-05-14 - Parallelizing Analytics Dashboard Queries
**Learning:** Sequential `await` calls in a dashboard-style API endpoint (like analytics) significantly increase latency. Grouping independent queries into a single `Promise.all` block and using `groupBy` for aggregations instead of sequential loops (N+1 pattern) reduces response time from seconds to milliseconds.
**Action:** Always look for sequential database queries in API routes and refactor them into `Promise.all`. Use `groupBy` for entity-related counts instead of looping and querying per-ID.
