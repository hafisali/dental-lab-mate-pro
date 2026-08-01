# Bolt's Performance Optimization Journal

This journal tracks critical learnings, architectural bottlenecks, and codebase-specific anti-patterns in this application.

## 2025-02-12 - Parallelizing Legacy Sequential DB Operations
**Learning:** Legacy endpoints like `src/app/api/notifications/route.ts` executed sequential `await` queries (e.g., retrieving items first, and then querying counts second). This results in multiple round-trips to the database which accumulates latency.
**Action:** Parallelize independent database queries using `Promise.all` to compress response latency down to the longest single query. Always preserve tenant safety checks (such as calling `requireLabId(session)`) even if their returned values are not strictly used in the query.
