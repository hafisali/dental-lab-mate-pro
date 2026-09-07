# Bolt's Journal

## 2026-09-07 - Do not mock or omit relation fields to optimize API routes
**Learning:** Stripping database relations or mocking them with empty arrays (`invoices: []`) in API route handlers to reduce query time causes silent data loss and functional UI regressions for client consumers that expect complete model records.
**Action:** Always maintain full schema backward-compatibility and real model data. Prioritize non-destructive optimizations such as `Promise.all` query parallelization, explicit field `select` clauses, and database-level filtering.
