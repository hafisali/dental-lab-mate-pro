## 2025-05-15 - [Analytics API Optimization]
**Learning:** The analytics API endpoint was performing ~15 sequential database queries and multiple N+1 patterns for technician and dentist metrics. Prisma's `groupBy` and `_sum` aggregations are significantly more efficient than fetching full records and aggregating in JavaScript. Parallelizing all independent queries using `Promise.all` reduces latency from $O(N)$ to $O(max(N))$.

**Action:** Always look for sequential `await` calls in dashboard/analytics APIs and parallelize them. Replace per-entity count/sum loops with bulk `groupBy` queries followed by in-memory `Map` correlation for O(1) lookups.
