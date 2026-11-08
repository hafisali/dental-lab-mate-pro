# Bolt's Journal - Critical Learnings Only

## 2026-03-14 - Dashboard Monthly Revenue N+1 Query Consolidation
**Learning:** Sequential database queries inside loops (such as calculating last 6 months' revenue or breakdown) introduce high network latency and N+1 roundtrips. Consolidating into a single time-windowed query and computing aggregates in memory reduces database roundtrips and significantly drops API latency.
**Action:** When calculating historical monthly metrics, query the full date range in a single query (or parallelized stage) and aggregate in memory.
