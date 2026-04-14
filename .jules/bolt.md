## 2026-04-14 - Parallel Query Optimization in Dashboard and Analytics
**Learning:** Sequential database queries in dashboard and analytics endpoints were causing high latency. Aggregating 15+ independent queries into a single `Promise.all` block reduced round-trips significantly. Additionally, replacing N+1 query patterns for technician workload with Prisma `groupBy` improved database efficiency.
**Action:** Prioritize batching independent Prisma queries with `Promise.all` and offload aggregations (sum, count) to the database using `groupBy` instead of in-memory processing.
