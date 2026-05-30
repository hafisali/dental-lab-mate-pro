## 2025-05-22 - Parallelizing Complex Analytics Queries
**Learning:** Sequential database queries in analytics endpoints are a major bottleneck. Moving from sequential `await` to `Promise.all` for independent aggregations (counts, sums, groupings) provides the most significant performance win in this architecture. Additionally, using Prisma `groupBy` with `_sum` for revenue calculation is much faster than fetching and summing records in memory.
**Action:** Always look for loops containing `await` in API routes. Use `Promise.all` with `Array.from` or `Map` to parallelize time-series and aggregate lookups.

## 2025-05-22 - O(1) Data Correlation with Maps
**Learning:** When fetching metadata for IDs retrieved via `groupBy`, fetching all relevant metadata in one `findMany` and using a `Map` for O(1) lookup during post-processing is significantly more efficient than individual lookups or nested loops.
**Action:** Use `Map` to correlate aggregated results with metadata from related models.
