## 2025-05-23 - Sequential Async Loops in Dashboard/Analytics
**Learning:** Multiple API routes in this codebase (e.g., `/api/dashboard`, `/api/analytics`) implement historical data fetching (last 6 months) using sequential `for` loops, causing avoidable latency due to serial database round-trips.
**Action:** Audit and replace sequential async loops with `Promise.all` + `.map()` to enable parallel query execution.
