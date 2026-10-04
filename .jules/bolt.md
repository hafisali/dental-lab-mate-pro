## 2026-10-04 - Cash Flow API Parallelization & Payload Pruning
**Learning:** Sequential DB calls across loops and aggregates create severe latent bottle-necks in financial reporting endpoints; batching independent aggregates and selects into a single `Promise.all` reduces DB network round-trips from ~11 down to 1.
**Action:** Use `Promise.all` across all independent aggregation sub-queries and apply explicit `select` blocks on relational models.
