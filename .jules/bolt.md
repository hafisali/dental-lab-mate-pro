## 2025-05-15 - [Analytics API Parallelization & N+1 Optimization]
**Learning:** Sequential 'await' calls in analytics endpoints create massive latency. Complex statistics like technician workload and top dentist revenue can be efficiently calculated using Prisma's 'groupBy' instead of manual N+1 queries or fetching full records.
**Action:** Always wrap independent database queries in 'Promise.all'. Use 'groupBy' for aggregations (count/sum) even when joined metadata is needed; fetch metadata in a secondary parallel query using the resulting IDs to minimize data transfer.
