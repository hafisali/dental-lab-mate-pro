## 2025-05-14 - Sequential Query Anti-pattern in Dashboard/Analytics
**Learning:** The codebase frequently uses sequential `for` loops to fetch monthly time-series data (e.g., revenue) and performs redundant `count` queries for specific statuses that are already included in `groupBy` results.
**Action:** Always check for opportunities to parallelize independent queries using `Promise.all` and derive multiple metrics from a single `groupBy` or `findMany` result to minimize database round-trips.
