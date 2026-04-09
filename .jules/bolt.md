# Bolt's Performance Journal

## 2025-05-14 - N+1 Query Pattern in Analytics
**Learning:** Sequential database queries within a loop (N+1 pattern) significantly increase latency, especially as the number of records (e.g., technicians) grows.
**Action:** Use `groupBy` or bulk fetching followed by in-memory aggregation to reduce database round-trips to a single query.
