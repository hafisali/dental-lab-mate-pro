## 2026-05-18 - Analytics API Waterfall Optimization
**Learning:** The analytics and dashboard APIs suffered from heavy 'Waterfall' latency due to sequential database queries and N+1 patterns (especially for technician workload). Parallelizing independent queries with `Promise.all` and using `groupBy` for aggregations significantly improves response times.
**Action:** Always check for sequential `await` calls in loops or large data fetch blocks. Use `Promise.all` for independent fetches and `groupBy` for aggregate stats instead of multiple counts.
