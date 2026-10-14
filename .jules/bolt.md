# Bolt's Journal - Critical Learnings

## 2026-10-14 - Parallelizing Session Auth with Request Body Parsing in Next.js
**Learning:** In Next.js route handlers receiving POST requests (such as multipart uploads or JSON payloads), awaiting `getServerSession` sequentially before `req.formData()` or `req.json()` introduces unnecessary blocking latency on request stream consumption.
**Action:** Use `Promise.all([getServerSession(authOptions), req.formData()])` or `Promise.all([getServerSession(authOptions), req.json()])` to process authentication token validation concurrently with incoming request stream parsing.
