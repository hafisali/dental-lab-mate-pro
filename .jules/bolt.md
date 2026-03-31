## 2025-05-22 - [Optimized Sequential Queries in Analytics API]
**Learning:** Sequential `await` calls in a loop (N+1 pattern) for independent database queries like counts or aggregates can significantly increase API latency, especially for historical data fetches (e.g., last 6 months).
**Action:** Use `Promise.all` to parallelize independent database queries in API routes to reduce total response time to the duration of the single longest query.
