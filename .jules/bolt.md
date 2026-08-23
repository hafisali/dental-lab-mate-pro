## 2025-05-18 - Avoid Modifying Default Pagination Limits
**Learning:** Increasing default query limits (e.g. from 20 to 100) when pagination parameters are omitted causes a 5x increase in database load and response payload sizes for default requests. Always inspect existing UI calls and preserve default pagination limits when optimizing endpoints.
**Action:** When tuning API routes, maintain default `skip`/`take` limits and verify frontend usage before altering pagination behavior.
