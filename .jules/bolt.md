## 2025-05-15 - [Database N+1 and Sequential Query Bottlenecks]
**Learning:** Found N+1 query patterns in `analytics` (counting cases per technician) and sequential query patterns in `dashboard` (fetching monthly revenue in a loop). Also identified a risky date calculation pattern when aggregating by month in-memory.
**Action:** Use Prisma `groupBy` to resolve N+1 patterns for counts/aggregations. Use `Promise.all` for parallelizing independent queries. For in-memory time-series aggregation, ensure `endOfMonth` calculations use `23:59:59.999` to avoid missing data from the last day.
