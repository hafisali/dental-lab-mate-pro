# Bolt's Performance Journal ⚡

## 2025-05-23 - Analytics API Optimization
**Learning:** Found sequential database queries and N+1 patterns in the analytics API. Specifically, monthly volumes were fetched in a loop, and technician workload was queried per technician.
**Action:** Parallelize independent queries with `Promise.all` and use `groupBy` for aggregations to minimize database round-trips.
