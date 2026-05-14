## 2025-05-15 - [Dashboard Performance]
**Learning:** Sequential `await` calls in loops for time-series data (like 6-month revenue) cause multiple unnecessary database round-trips.
**Action:** Use `Promise.all` to parallelize these queries. When calculating monthly offsets, always use `d.setDate(1)` before `d.setMonth()` to prevent skipping months when the current day is the 31st.
