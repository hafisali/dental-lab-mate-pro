# Bolt's Performance Journal ⚡

## Performance Philosophy
- Speed is a feature.
- Every millisecond counts.
- Measure first, optimize second.
- Don't sacrifice readability for micro-optimizations.
- Prioritize N+1 query patterns and sequential I/O bottlenecks.

## Critical Learnings

### 2025-05-14 - Analytics API Bottlenecks
**Learning:** The analytics route in `src/app/api/analytics/route.ts` contains several performance anti-patterns:
1. **N+1 queries:** Technician workload is calculated by looping over all technicians and firing two count queries for each.
2. **Sequential Database I/O:** Multiple independent database queries are executed one after another, leading to cumulative latency.
3. **Inefficient Aggregation:** Top dentist revenue is calculated by fetching all case records for each dentist and summing the amounts in-memory, instead of using database-level aggregation.
4. **Sequential Loops:** Monthly case volumes are calculated in a sequential for-loop, causing 6 round-trips to the database one by one.

**Action:**
1. Use `prisma.case.groupBy` for bulk aggregations (technician workload, dentist revenue).
2. Use `Promise.all` to parallelize all independent database queries.
3. Replace sequential loops with parallelized `Promise.all` maps.
