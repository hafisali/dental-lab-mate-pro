## 2025-05-18 - Explicit field selection in superadmin lab and tenant detail routes
**Learning:** Using Prisma `include: { users: true, subscription: true }` in detail endpoints fetches all database columns across relational boundaries, increasing query scanning overhead, JSON payload size, and memory allocation.
**Action:** Replace `include` with explicit `select` field projections on both the parent entity and nested relations in detail endpoints to prune unused fields.
