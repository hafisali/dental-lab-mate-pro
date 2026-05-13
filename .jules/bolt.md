## 2025-05-14 - [Analytics API Optimization Patterns]
**Learning:** Consolidating independent Prisma queries into a single `Promise.all` block and using `groupBy` for aggregations (like technician workload) drastically reduces database roundtrips from O(N) or O(Sequential) to O(Parallel/1). However, Prisma's `groupBy` return types are dynamic and require explicit interface casting (`as unknown as Promise<Interface[]>`) to satisfy strict ESLint `@typescript-eslint/no-explicit-any` rules.
**Action:** Always prefer `groupBy` for entity counts/sums and parallelize top-level data fetching. Use specific interfaces and `unknown` casting for complex Prisma results in `Promise.all` blocks.

## 2025-05-14 - [Environment Setup for Verification]
**Learning:** The development environment requires `npm install` to be executed before `npm run build` or `npx eslint` to avoid `ERR_MODULE_NOT_FOUND` for core packages like `eslint`.
**Action:** Ensure a full `npm install` is completed before running verification tools if dependencies are missing.
