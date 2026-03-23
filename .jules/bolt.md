## 2025-05-22 - Initial Performance Audit
**Learning:** Identified several N+1 query patterns in dashboard and analytics APIs. Specifically, monthly revenue and case volume calculations use loops with individual database calls.
**Action:** Plan to optimize these by fetching data in bulk and aggregating in-memory or using Prisma's `groupBy` where applicable.
