# Bolt's Performance Journal ⚡

## 2025-05-14 - [Initial Optimization]
**Learning:** Found several performance bottlenecks in `src/app/api/analytics/route.ts`: N+1 queries for technician workloads, sequential loop for time-series data, and fetching full relations for simple aggregations.
**Action:** Parallelize independent queries using `Promise.all`, use `groupBy` for aggregations instead of fetching full records, and reuse computed data to avoid redundant queries.
