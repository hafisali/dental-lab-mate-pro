## 2025-05-14 - Dashboard API Optimization & Date Handling
**Learning:** Sequential database queries in a loop for time-series data (like monthly revenue) create significant latency (N*RTT). Additionally, using `setMonth` without `setDate(1)` first can cause "month-skipping" bugs when the current day is the 31st (e.g., March 31st - 1 month = March 3rd).
**Action:** Always parallelize time-series queries using `Promise.all` and ensure date objects are normalized to the 1st of the month before performing month-level arithmetic.
