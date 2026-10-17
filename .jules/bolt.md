## 2026-10-17 - Avoid Promise.all on Dependent OTP Invalidation and Creation
**Learning:** Executing `prisma.otpCode.updateMany({ where: { email, used: false }, data: { used: true } })` and `prisma.otpCode.create({ data: { email, code } })` concurrently via `Promise.all` introduces a race condition. If `create` finishes before or during `updateMany`, `updateMany` can match the newly created OTP record and immediately mark it as `used: true`.
**Action:** Keep operations sequential when `updateMany` targets unflagged records (e.g. `used: false`) that a concurrent `create` operation inserts.
