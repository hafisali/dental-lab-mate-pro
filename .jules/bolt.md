## 2025-05-01 - Parallelized Analytics Dashboard & Optimized Tech Metrics

**Learning:** The analytics dashboard was performing ~15 sequential database queries, leading to a high "time to first byte" (TTFB). Specifically, a 6-month case volume loop and a per-technician count loop created N+1 query patterns that scaled with data and staff count.

**Action:**
1. Grouped all independent top-level database queries into a single `Promise.all` block.
2. Refactor sequential loops (monthly volumes) to generate promise arrays for concurrent execution.
3. Replaced N*2 sequential technician counts with a single `prisma.case.groupBy` query to aggregate data at the database level.
4. Consolidated redundant queries for delivered cases into a single fetch.

Next time: Always look for loops containing `await prisma...` calls, especially in dashboard/analytics routes where data is read-only and independent.
