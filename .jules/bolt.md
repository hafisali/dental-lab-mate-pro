## 2025-05-14 - Prisma groupBy count type behavior
**Learning:** Prisma `groupBy` results for count aggregations (e.g., `_count: { id: true }`) return a `number` type in the result object, not a boolean. Defining interfaces with `{ id: true }` causes TypeScript build errors when performing arithmetic operations.
**Action:** Always define count aggregation types in interfaces as `number` (e.g., `_count: { id: number }`) to ensure compatibility with post-processing logic.

## 2025-05-14 - Parallelizing Analytics Queries
**Learning:** Complex analytics endpoints in this codebase often suffer from sequential database round-trips (~17+). Using `Promise.all` for independent queries and `groupBy` for aggregations (like technician workload) provides significant performance gains.
**Action:** Use a 2-layer `Promise.all` pattern: top-level for independent data and a nested layer for dependent metadata resolution (e.g., fetching names for IDs found via `groupBy`).
