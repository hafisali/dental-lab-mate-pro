# Bolt Journal - Critical Learnings

## 2026-09-28 - Optimizing WhatsApp Reminders & Eliminating N+1 Relational Queries
**Learning:** Calling relational `findUnique` queries inside a loop for batch operations (like cron tasks) introduces severe N+1 database round-trips. Pre-fetching relations in batch `findMany` queries and updating helper methods to accept pre-fetched objects dramatically reduces DB overhead and latency. Parallelizing batch notifications using `Promise.allSettled` ensures concurrent processing without letting a single failure block the pipeline.
**Action:** Always inspect batch processing loops for repeated `findUnique` calls on related models, pre-fetch relations in `findMany`, and use `Promise.allSettled` for concurrent async tasks.
