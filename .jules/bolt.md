# Bolt's Performance Journal

## 2025-02-12 - Parallelizing Monthly Metrics and Safe Date Calculation
**Learning:** Sequential DB loops on months suffer from high latency due to multiple serial roundtrips. Additionally, doing chronological month calculations directly with `setMonth(getMonth() - i)` on a current date object can result in unexpected date-rollover bugs when today has 31 days (e.g. Jan 31st minus 1 month rolling over to March 3rd instead of February 28th).
**Action:** Always wrap independent monthly database query loops in a parallelized `Promise.all` block, and prevent date-rollover bugs by setting the day of the month to `1` using `d.setDate(1)` before subtracting/adding months.
