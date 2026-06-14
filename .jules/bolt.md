## 2025-05-15 - [N+1 Query Pattern in Technician Workload]
**Learning:** The technician workload calculation was performing two database queries per technician within a `Promise.all(map(...))` block. This resulted in 2N sequential-style queries that increased as the lab staff grew.
**Action:** Use Prisma `groupBy` on `technicianId` and `status` to fetch all workload stats in a single O(1) database round-trip, then correlate the data in-memory using a `Map`.

## 2025-05-15 - [Sequential Await Bottleneck in Analytics API]
**Learning:** The Analytics API was performing over 15 separate database queries using sequential `await` calls. Each `await` added network latency to the total response time.
**Action:** Parallelize independent queries using a single top-level `Promise.all` block. Consolidated related queries (like overdue and due-soon cases) into single `findMany` calls with broader filters to further reduce round-trips.
