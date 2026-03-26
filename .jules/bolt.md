## 2024-03-26 - Optimized Dashboard Revenue Fetching
**Learning:** Sequential `prisma.payment.aggregate` calls in a loop created an N+1 query pattern for the dashboard's monthly revenue chart, adding latency for each historical month requested.
**Action:** Replace sequential aggregations with a single `prisma.payment.findMany` bulk fetch using a calculated lookback date. Use in-memory filtering and reduction in Node.js to group the data, which significantly reduces database round-trips.
