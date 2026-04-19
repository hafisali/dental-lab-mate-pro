## 2025-05-15 - Optimizing Analytics with Parallelism and DB Aggregation
**Learning:** Sequential Prisma queries and N+1 count patterns in API routes (like analytics) significantly increase latency. In-memory aggregation of large datasets (like summing revenue from all case records) is inefficient compared to database-level `groupBy`.
**Action:** Use `Promise.all` to parallelize all independent queries. Replace loops of counts or record-based summing with `prisma.model.groupBy` or `prisma.model.aggregate` to offload work to the database and reduce payload size.
