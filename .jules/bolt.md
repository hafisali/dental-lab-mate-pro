# Bolt's Journal

## 2026-10-19 - Parallelizing Sequential Date Range Aggregations
**Learning:** Sequential loops for historical month aggregations (e.g. 6-month revenue or case volume loops) introduce N+1 query bottlenecks and risk date rollover bugs if `d.setDate(1)` is not called before `d.setMonth()`.
**Action:** Always pre-calculate date window intervals up front with `setDate(1)` and execute month aggregation queries concurrently in a single `Promise.all` block.
