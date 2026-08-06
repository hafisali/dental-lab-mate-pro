# Bolt's Journal - Critical Learnings Only

This journal tracks critical performance lessons, anti-patterns, and insights across agent iterations.

## 2025-02-18 - Database grouping instead of fetching all records
**Learning:** Fetching all records from a table in-memory to group and aggregate them (e.g. `findMany({ select: { plan: true } })`) causes severe performance bottlenecks as the table grows. This results in unnecessary memory usage and database roundtrips.
**Action:** Use database aggregation functions like Prisma's `.groupBy()` to perform aggregations at the database level, returning only a small grouped result set and executing within existing parallelized `Promise.all` blocks.
