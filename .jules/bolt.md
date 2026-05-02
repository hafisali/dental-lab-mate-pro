## 2025-05-15 - Parallelize Dashboard Revenue Queries
**Learning:** Sequential database queries within loops (e.g., for time-series data like 6-month revenue) are a common anti-pattern in this codebase that significantly increases API latency.
**Action:** Always parallelize independent time-series or multi-resource database queries using `Promise.all` to minimize total response time.
