## 2025-05-14 - [API Contract Consistency]
**Learning:** Performance refactors of API endpoints can accidentally introduce breaking changes if the database model (e.g., Prisma include) is returned directly or mapped differently than the original implementation (e.g., objects vs. flat strings).
**Action:** Always verify the exact shape of the original API response before refactoring, and explicitly map data to match that contract even if the underlying query structure changes.
