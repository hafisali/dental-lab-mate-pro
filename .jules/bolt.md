# Bolt's Performance Journal

This journal tracks critical performance lessons, anti-patterns, and insights across agent iterations in this codebase.

## 2025-02-14 - Parallelize Monthly Metrics and Eliminate Redundant Count Queries
**Learning:** Sequential DB queries in loops (like fetching monthly metrics) create a major bottleneck. Redundant count queries can be derived from existing grouped query results to minimize DB roundtrips.
**Action:** Replace sequential loops with parallelized `Promise.all` blocks and derive metrics (e.g. pending/delivered counts) in-memory from `groupBy` results.
