# Bolt's Performance Journal

This journal tracks critical performance learnings, anti-patterns, and insights across agent iterations to prevent regression and ensure maximum speed.

## 2025-02-15 - Chronological Month Calculations & Rollover Bugs
**Learning:** When performing chronological month calculations in JavaScript (e.g. subtracting months with `d.setMonth(d.getMonth() - i)`), always set the day of the month to 1 (`d.setDate(1)`) beforehand. Otherwise, on months with 31 days (such as Jan 31st rolling over to March instead of February), the date calculations can cause unexpected/incorrect month aggregations.
**Action:** Always call `setDate(1)` on a `Date` object prior to adjusting its month chronologically.
