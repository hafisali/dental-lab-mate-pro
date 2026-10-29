## 2025-05-20 - Batch Reminder N+1 & Parallelization Optimization

**Learning:** Batch background tasks that process multiple items (like WhatsApp reminder dispatching) can suffer from dual performance bottlenecks: sequential DB queries for initial date ranges and N+1 relational lookup queries inside iteration loops. Pre-fetching relations upfront with `include` and executing notification dispatch tasks concurrently using `Promise.allSettled` eliminates both bottlenecks safely without risk of a single failed notification aborting the entire batch.

**Action:** When designing or refactoring batch notification/cron jobs in Prisma/TypeScript, pre-fetch relational dependencies (`patient`, `dentist`, etc.) in the initial list query and pass full entity objects into individual sender functions. Concurrently dispatch notifications via `Promise.allSettled` with internal `try/catch` error logging.
