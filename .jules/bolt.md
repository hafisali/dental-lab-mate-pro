## 2025-05-15 - [Mixed-Type Promise.all Inference]
**Learning:** Destructuring `Promise.all` results that mix single objects (aggregations) and arrays (spread results) can cause TypeScript to lose precise inference, often defaulting the destructured variables to the array's item type or `any`. This triggers `no-explicit-any` and property-access errors during the build.
**Action:** Use explicit casting (e.g., `as Promise<{ _sum: { field: type | null } }>` or `as any`) for Prisma aggregation calls within the `Promise.all` array to preserve type safety and satisfy build/lint checks.
