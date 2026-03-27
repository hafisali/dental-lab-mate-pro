## 2025-05-14 - [Resolved N+1 Queries in Analytics Route]
**Learning:** Identifying N+1 query patterns in loops (like fetching monthly counts or technician stats) and replacing them with bulk fetches or `groupBy` operations significantly reduces database round-trips. In this case, `monthlyCaseVolumes` went from 6 queries to 1, and `techWorkload` went from 2N queries to 1.
**Action:** Always look for loops containing database queries and refactor them to use Prisma's `findMany` with filters or `groupBy` for aggregation.
