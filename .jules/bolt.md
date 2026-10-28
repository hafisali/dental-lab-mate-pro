## 2025-05-18 - Batch Notification N+1 and Sequential Dispatch Optimization

**Learning:** When batch processing cron jobs or scheduled tasks (such as sending appointment reminders), helper functions often re-query the database per record (`findUnique`) and perform sequential network I/O in loops. Pre-fetching relations in `findMany` queries and overloading helper signatures to accept pre-fetched models along with `Promise.allSettled` concurrent dispatch eliminates N+1 queries and dramatically reduces batch completion latency.
**Action:** Always pre-fetch nested relations (`include: { patient: true, dentist: true }`) for batch processing tasks, overload helper functions to accept pre-fetched models, and process independent dispatches concurrently using `Promise.allSettled`.
