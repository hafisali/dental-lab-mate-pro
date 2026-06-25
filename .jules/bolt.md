
## 2026-06-25 - [Analytics API Bottlenecks]
**Learning:** Sequential `await` calls for dashboard metrics created a cumulative latency bottleneck of ~15+ database round-trips. Furthermore, manual loops for technician workload created an N+1 query pattern.
**Action:** Consolidate independent metrics into a single top-level `Promise.all` block. Use Prisma `groupBy` and `aggregate` for revenue and volume calculations to offload processing to the database and minimize data transfer.
