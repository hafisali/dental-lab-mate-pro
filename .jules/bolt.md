## 2025-05-15 - Dashboard Query Parallelization
**Learning:** Sequential database queries within a loop (e.g., for time-series data like 6-month revenue) significantly increase API latency. Parallelizing these with `Promise.all` alongside other independent queries is a major performance win in this codebase. Also, `new Date().setMonth()` without `setDate(1)` first causes month-skipping bugs on the 31st.
**Action:** Always check for sequential `await` calls in loops and refactor to `Promise.all`. Always use `setDate(1)` before `setMonth()` for reliable date offsets.
