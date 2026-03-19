## 2025-05-15 - [Database N+1 Query Optimization]
**Learning:** Dashboard and analytics routes frequently use loops to fetch monthly data (e.g., 6 iterations for 6 months), leading to multiple sequential database roundtrips. Prisma's `groupBy` or a single `findMany` followed by in-memory filtering is significantly more efficient.
**Action:** Always check for `for` loops or `Promise.all(array.map(...))` containing Prisma queries. Batch these into a single query using `in` operators, `groupBy`, or date range filters.
