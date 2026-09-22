# Bolt's Journal - Critical Learnings

## 2026-09-22 - Optimizing Invitations API Queries & Payload
**Learning:** Parallelizing invitation duplicate check and lab lookup with `Promise.all` in POST `/api/invitations` eliminates a sequential database round trip prior to email dispatch. Using explicit `select` projections on `findMany` in GET `/api/invitations` reduces response payload size and database memory overhead.
**Action:** Always check for opportunities to parallelize tenant/relational lookups and select specific fields in Prisma queries for list endpoints.
