## 2025-05-15 - Parallelizing Analytics Metrics
**Learning:** The analytics API was performing ~16 sequential database round-trips, including an N+1 pattern for technician workload. By using `Promise.all` and Prisma's `groupBy`, sequential DB latency was reduced to a single block.
**Action:** Always check for independent database queries in complex API routes and parallelize them. Use `groupBy` to avoid counting related records in a loop.
