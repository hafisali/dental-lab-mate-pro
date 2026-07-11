## 2025-05-14 - [Analytics API Optimization]
**Learning:** Sequential database queries (N+1 problems and serial `await` calls) in API routes significantly increase latency. Parallelizing queries with `Promise.all` and replacing per-item counts with `groupBy` provides a massive performance boost.
**Action:** Always look for independent Prisma calls that can be grouped into `Promise.all` and use `groupBy` instead of looping over records to fetch related counts.
