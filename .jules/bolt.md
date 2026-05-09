# Bolt's Performance Journal

## 2025-05-14 - [Analytics API Optimization]
**Learning:** Sequential database queries (Waterfalls) and N+1 patterns in analytics dashboards are the primary performance killers. Aggregating data (like revenue) by fetching full records instead of using `groupBy` causes unnecessary memory pressure and network overhead.
**Action:** Always parallelize independent queries with `Promise.all`. Use `groupBy` for aggregations and `Map` for O(1) in-memory correlation. Consolidate multiple queries targeting the same model/status into a single fetch when possible.
