# Bolt's Journal - Critical Learnings

## 2025-05-14 - Optimizing Analytics with Parallelism and GroupBy
**Learning:** Sequential `await` calls in analytics routes create significant latency as each database round-trip adds up. Prisma's `groupBy` is significantly more efficient than application-level loops for aggregating counts and sums (like technician workload or dentist revenue). However, `groupBy` results require explicit interface definitions and `as unknown as Promise<T[]>` casting to satisfy strict `@typescript-eslint/no-explicit-any` rules in this codebase.
**Action:** Always look for sequential database calls that can be parallelized with `Promise.all`. Use `groupBy` for any metric that aggregates data by a foreign key or enum. Reuse results from time-series arrays (e.g., the last element of a 6-month count array) for current-month stats to avoid redundant queries.
