## 2025-05-22 - Parallelizing Time-Series Queries
**Learning:** Sequential database queries in a loop for time-series data (like monthly revenue in the dashboard) creates an N+1 query pattern that serializes database round-trips, significantly increasing latency as the number of time buckets grows.
**Action:** Pre-calculate date ranges and use `Promise.all` to execute all time-bucket queries concurrently. This was applied to `src/app/api/dashboard/route.ts` to reduce 6 sequential queries to 1 parallelized block.
