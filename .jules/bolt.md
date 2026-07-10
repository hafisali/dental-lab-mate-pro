## 2026-07-10 - [API Optimization: Parallelization & GroupBy]
**Learning:** Sequential database queries in dashboard/analytics endpoints create significant latency. Aggregating N queries into one Promise.all and replacing O(N) sequential counts with a single groupBy query dramatically improves performance.
**Action:** Always look for sequential await blocks and loops containing database queries in API routes and refactor them into parallelized Promise.all calls with groupBy where applicable.
