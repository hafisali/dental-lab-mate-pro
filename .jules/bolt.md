## 2025-05-14 - [Backend] Reducing Database Round-trips in Analytics
**Learning:** The analytics route was suffering from an N+1 query pattern where two count queries were being executed for every technician. This scales poorly as more technicians are added to the lab.
**Action:** Use Prisma's `groupBy` to fetch all status counts for all relevant technicians in a single query. Aggregating these groups in memory is significantly faster than multiple database round-trips, especially when the number of technicians is small to moderate (typical for a dental lab).
