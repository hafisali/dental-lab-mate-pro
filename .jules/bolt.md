## 2026-09-10 - Prisma Interactive Transaction Concurrency Anti-Pattern
**Learning:** Executing `Promise.all` with transaction client operations (`tx`) inside `prisma.$transaction(async (tx) => ...)` causes transaction connection conflicts or failures because interactive transaction handles operate sequentially over a single connection context.
**Action:** Always execute `tx` queries sequentially inside interactive transactions (`for...of` loop or sequential `await`) rather than wrapping `tx` updates in `Promise.all`.
