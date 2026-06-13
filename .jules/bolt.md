## 2025-05-15 - [Prisma versioning and schema validation]
**Learning:** Running `npx prisma generate` without first running `npm install` can result in the CLI using the latest version of Prisma (e.g., 7.x) instead of the project-pinned version (e.g., 6.x). This can trigger schema validation errors (like P1012 regarding the `url` property in `datasource`) because newer Prisma versions have different configuration requirements.
**Action:** Always run `npm install` before `npx prisma generate` to ensure the correct version of the Prisma CLI is used, avoiding false-positive validation errors.

## 2025-05-15 - [Efficient Analytics Aggregation]
**Learning:** Sequential `await` calls in dashboard APIs create a waterfall bottleneck. Parallelizing 10+ queries with `Promise.all` and replacing N+1 per-technician queries with a single `groupBy` and in-memory Map aggregation significantly improves response times for data-heavy routes.
**Action:** Use `Promise.all` for independent metrics and `groupBy` for bulk aggregation when refactoring analytics or dashboard endpoints.
