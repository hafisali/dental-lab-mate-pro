## 2025-05-14 - [Optimize Analytics API Route]
**Learning:** Sequential `await` calls in API routes for independent data aggregates create significant latency. Independent queries like monthly volumes, overdue cases, and status counts should be parallelized. Additionally, N+1 query patterns for entity-specific stats (e.g., technician workload) are much more efficient when replaced with a single `groupBy` database call followed by in-memory mapping.
**Action:** Use `Promise.all` for all independent database operations and prioritize `groupBy` over multiple `count` queries in loops.
