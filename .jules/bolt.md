## 2026-04-18 - Optimized Analytics API with Parallel Queries and Aggregations
**Learning:** Sequential database queries and N+1 patterns in API routes significantly degrade performance as data scales. In this codebase, the analytics route was making over 20 sequential calls, including a loop that queried the database for each technician.
**Action:** Always parallelize independent Prisma queries using `Promise.all`. Use `groupBy` for aggregations (like status counts per technician or revenue per dentist) to minimize database round-trips. Define explicit interfaces for `groupBy` results to satisfy ESLint and ensure type safety.

## 2026-04-18 - Database Indexing for Analytics and Search
**Learning:** Fields used in `groupBy` (like `Case.workType`) and frequent search filters (like `Patient.phone`) benefit from database indexes to maintain query performance.
**Action:** Proactively identify searchable and groupable fields and add `@@index` to the Prisma schema. Ensure `npx prisma generate` is run after schema changes to update the client.
