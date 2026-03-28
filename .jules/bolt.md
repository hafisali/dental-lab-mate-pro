## 2025-03-28 - [N+1 Query Pattern in Dashboard API]
**Learning:** The dashboard's monthly revenue calculation used a sequential loop with multiple `prisma.payment.aggregate` calls, leading to N+1 database round-trips. This pattern significantly increases latency as the number of data points (months) or concurrent users grows.
**Action:** Always favor bulk fetching data for a range and performing in-memory aggregation in Node.js. This reduces database overhead and allows for better parallelism when integrated into a `Promise.all` block.
