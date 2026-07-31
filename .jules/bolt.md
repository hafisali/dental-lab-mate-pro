## 2025-07-31 - JS Date Subtracting Month Overflow
**Learning:** In chronological time-series DB queries (like fetching the last 6 months' data), using `d.setMonth(d.getMonth() - i)` on dates near the end of a month (e.g. the 31st) can cause JS to skip months (e.g. subtracting 1 month from Jan 31st yields Feb 31st, which rolls over to March 3rd).
**Action:** Always call `d.setDate(1)` before doing month arithmetic (`d.setMonth(...)`) to prevent rollover/underflow bugs when generating monthly date ranges.
