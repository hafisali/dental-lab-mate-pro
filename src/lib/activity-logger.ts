import prisma from "./prisma";

export type ActivityAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "REGISTER"
  | "OTP_VERIFIED"
  | "OTP_RESENT"
  | "LOGOUT";

export async function logActivity({
  email,
  userId,
  userName,
  action,
  ipAddress,
  userAgent,
  details,
}: {
  email: string;
  userId?: string | null;
  userName?: string | null;
  action: ActivityAction;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
}) {
  try {
    await prisma.loginActivity.create({
      data: {
        email,
        userId,
        userName,
        action,
        ipAddress,
        userAgent,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
