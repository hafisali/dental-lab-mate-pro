## 2025-05-15 - [N+1 Query Resolution in Analytics API]
**Learning:** Sequential await calls in loops (e.g., fetching 6 months of counts) and N+1 query patterns (e.g., fetching counts for each technician) significantly degrade API response times as the dataset or list size grows.
**Action:** Use `Promise.all` for a small, fixed number of concurrent queries and `prisma.groupBy` or bulk fetching with in-memory aggregation for lists to reduce database round-trips to O(1).
