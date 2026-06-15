## 2025-05-15 - Optimizing Analytics Data Fetching
**Learning:** Sequential `await` calls and N+1 query patterns in dashboard/analytics routes are major performance killers. Offloading aggregations (counts, sums) to Prisma's `groupBy` and `aggregate` is significantly faster than in-memory processing of large result sets. Parallelizing independent queries via `Promise.all` can reduce sequential round-trips from dozens to just a few.
**Action:** Always look for loops containing database calls and replace them with `groupBy` or `findMany` with `in` filters. Consolidate all independent top-level `await` calls into a single `Promise.all` block.

## 2025-05-15 - Prisma Type Casting for aggregations
**Learning:** Prisma's `groupBy` return types are complex and often result in TypeScript errors when trying to use them with strict interfaces.
**Action:** Use `as unknown as Promise<Interface[]>` to reconcile Prisma's dynamic return types with local strictly-typed interfaces, especially when using parallelized `Promise.all` blocks that require predictable types for post-processing.
