## 2025-05-15 - [Analytics API Optimization]
**Learning:** Dashboard and analytics endpoints in this codebase often suffer from sequential `await` bottlenecks and N+1 query patterns when aggregating stats for multiple entities (e.g., technicians).
**Action:** Use `Promise.all` with dynamically generated promise arrays for time-series data and Prisma `groupBy` for entity aggregations to achieve O(1) database round-trips.
