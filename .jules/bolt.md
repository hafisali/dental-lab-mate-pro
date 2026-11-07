# Bolt's Journal

## Critical Learnings

## 2025-05-14 - Selective projections on nested relations in billing transactions
**Learning:** When recording a payment that updates an invoice status, fetching the full `invoice` record with all fields and full payment objects (`include: { payments: true }`) creates unnecessary overhead. Using a targeted `select: { total: true, payments: { select: { amount: true } } }` reduces database round-trip data size to just the numeric fields needed for the status recalculation.
**Action:** In transactional or post-mutation status recalculation checks, always use minimal nested `select` projections rather than full `include`s.
