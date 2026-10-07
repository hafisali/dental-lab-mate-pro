## 2026-03-14 - Parallelizing User Registration Flow & Password Hashing
**Learning:** During user registration, CPU-bound password hashing (`bcrypt.hash`) and post-registration tasks (`otpCode.create` & `logActivity`) can be safely executed concurrently with independent database operations using `Promise.all`, significantly reducing route latency.
**Action:** Look for sequential `bcrypt` hashing or post-creation auditing/OTP generation in auth routes and parallelize them using `Promise.all`.
