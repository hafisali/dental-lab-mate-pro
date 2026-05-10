## 2026-05-10 - [Bottleneck] Sequential Database Queries in Analytics and Dashboard
**Learning:** Sequential 'await' calls in loops and top-level database queries significantly increase API response times due to cumulative network latency and database round-trips. Parallelizing these with Promise.all reduces the total time to the duration of the slowest query.
**Action:** Always wrap independent database queries in Promise.all and refactor sequential loops into parallelized maps.
