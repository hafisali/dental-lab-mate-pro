# Bolt's Journal - Critical Learnings

## 2026-05-07 - [Optimizing Heavy Analytics API]
**Learning:** Consolidating multiple independent Prisma queries into a single `Promise.all` block, combined with replacing N+1 patterns with `groupBy`, can reduce database round-trips from O(N) to O(1). Reusing time-series results for current-month metrics further eliminates redundant queries.
**Action:** Always look for sequential `await` calls in API routes and refactor into parallelized `Promise.all`. Prioritize database-level aggregations (`groupBy`, `_sum`, `_count`) over in-memory processing of large datasets.
