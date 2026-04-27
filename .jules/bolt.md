## 2025-05-14 - Parallelizing Analytics Queries
**Learning:** Sequential database queries in dashboard/analytics endpoints significantly increase response latency due to cumulative round-trip times, especially when aggregating data across multiple models or time periods.
**Action:** Always use `Promise.all` to batch independent Prisma queries. For aggregations across entities (like technician workload or top dentists), use `prisma.groupBy` to offload work to the database instead of fetching full records and reducing in memory.
