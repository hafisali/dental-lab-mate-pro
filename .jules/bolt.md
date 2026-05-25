## 2025-05-14 - Optimized Analytics and Dashboard APIs
**Learning:** Sequential database queries and N+1 patterns in API routes significantly impact perceived latency, especially as the number of entities (like technicians) grows.
**Action:** Always prefer `Promise.all` for independent queries and `groupBy` for aggregations over multiple entities. Use type casting with explicit interfaces to maintain type safety while avoiding `any` warnings from Prisma's dynamic return types.

## 2025-05-14 - Preventing the '31st of the month' bug
**Learning:** When calculating historical monthly dates (e.g., last 6 months), simply calling `setMonth(now.getMonth() - i)` can skip months if today is the 31st and the target month has fewer days.
**Action:** Always call `setDate(1)` before `setMonth()` when iterating through months to ensure stable date calculations.
