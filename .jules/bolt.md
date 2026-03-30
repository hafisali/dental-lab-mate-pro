## 2025-05-15 - [N+1 Revenue Aggregation in Dashboard]
**Learning:** Found an N+1 query pattern where monthly revenue was being calculated by running sequential Prisma aggregate calls inside a loop for each of the last 6 months. While seemingly clean, this introduced 6 extra database round-trips for every dashboard load.
**Action:** Consolidate sequential time-series queries into a single bulk fetch within a `Promise.all` block. Perform grouping and aggregation in-memory in Node.js to minimize database latency and connection overhead.
