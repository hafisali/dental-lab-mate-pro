# Bolt's Journal - Critical Learnings Only

## 2026-03-14 - Batch Grouping for 2N+1 Relation Queries in Superadmin Labs
**Learning:** In the superadmin labs endpoint, finding the last login for each lab previously executed two queries per lab inside a `Promise.all(labs.map(...))` block: one to get the user emails for the lab, and another to fetch the latest login activity. For 50 labs, this resulted in 101 database queries. Eager-loading `users: { select: { email: true } }` on `prisma.lab.findMany` combined with a single `prisma.loginActivity.groupBy({ by: ['email'], _max: { createdAt: true } })` collapsed the 2N+1 queries down to exactly 2 queries.
**Action:** Whenever retrieving aggregate stats across relations for multiple parent models, check if the child relation can be eager-loaded and batch-aggregated via Prisma `groupBy` with in-memory map resolution instead of running N+1 queries.
