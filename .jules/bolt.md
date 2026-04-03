## 2025-05-15 - [Batch Fetching for Dashboard Metrics]
**Learning:** The dashboard previously used a sequential loop of database queries (N+1 pattern) to calculate monthly revenue for the last 6 months. This resulted in 6 separate database round-trips for a single component.
**Action:** Replace sequential loops of database aggregates/counts with a single batch fetch using `findMany` and in-memory aggregation. This is significantly more efficient for the small datasets typically seen in dashboard summaries.
