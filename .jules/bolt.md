
## 2025-05-14 - [Date-skipping bug and Parallelization in Time-series]
**Learning:** Sequential database queries in loops for time-series data (e.g., monthly revenue) create significant bottlenecks. Additionally, JavaScript's `setMonth` can skip months if the current day is the 31st (e.g., March 31st minus 1 month becomes March 2nd/3rd because February has fewer than 31 days).
**Action:** Always use `Promise.all` to parallelize independent time-series queries. To fix the date bug, call `d.setDate(1)` BEFORE calling `d.setMonth(d.getMonth() - i)` to ensure stable month calculation.
