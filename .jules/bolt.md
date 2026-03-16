## 2025-05-15 - [N+1 Query Optimization in Analytics]
**Learning:** Found an N+1 query pattern in the technician workload calculation where each technician's active and completed case counts were fetched via separate `prisma.case.count` calls. This led to $1 + 2N$ database roundtrips.
**Action:** Replaced the per-technician queries with a single `prisma.case.groupBy` on `technicianId` and `status`. This reduces the roundtrips to 2 (one for technicians, one for counts) and significantly improves performance as the number of technicians grows.
