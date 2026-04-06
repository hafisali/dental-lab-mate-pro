## 2025-05-15 - [Analytics Optimization]
**Learning:** Sequential database queries and N+1 patterns in complex analytical routes (like `src/app/api/analytics/route.ts`) significantly increase response latency due to multiple round-trips. Using `Promise.all` for independent queries and `groupBy` for bulk aggregations drastically reduces database overhead.
**Action:** Always check for loops containing `prisma.count` or `prisma.aggregate` and refactor them to use `Promise.all` or `groupBy` to minimize round-trips.
