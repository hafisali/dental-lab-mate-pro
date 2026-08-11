# Bolt Journal - Critical Learnings Only

## 2025-05-18 - JavaScript Date Month Rollover Safeguard
**Learning:** When executing chronological month-by-month database aggregations using `d.setMonth(d.getMonth() - i)`, doing so on a day like the 31st (e.g. July 31st minus 1 month) will cause a rollover to next month because the target month (e.g. February/June) has fewer than 31 days.
**Action:** Always call `d.setDate(1)` on the Date object before performing chronological relative month calculations to ensure stable dates.
