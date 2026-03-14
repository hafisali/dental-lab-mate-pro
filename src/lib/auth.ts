import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "./activity-logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          await logActivity({ email: credentials.email, action: "LOGIN_FAILED", details: "User not found" });
          throw new Error("Invalid email or password");
        }

        if (!user.emailVerified) {
          await logActivity({ email: credentials.email, userId: user.id, userName: user.name, action: "LOGIN_FAILED", details: "Email not verified" });
          throw new Error("Please verify your email first");
        }

        if (!user.active) {
          await logActivity({ email: credentials.email, userId: user.id, userName: user.name, action: "LOGIN_FAILED", details: "Account deactivated" });
          throw new Error("Your account has been deactivated");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          await logActivity({ email: credentials.email, userId: user.id, userName: user.name, action: "LOGIN_FAILED", details: "Invalid password" });
          throw new Error("Invalid email or password");
        }

        await logActivity({ email: user.email, userId: user.id, userName: user.name, action: "LOGIN_SUCCESS" });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar || user.image,
          role: user.role,
          labId: user.labId,
          labName: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (trigger === "signIn" || trigger === "signUp") {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          include: { lab: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.labId = dbUser.labId;
          token.labName = dbUser.lab?.name || null;
          token.picture = dbUser.image || dbUser.avatar;
          token.planTier = dbUser.lab?.planTier || "TRIAL";
          token.onboardingComplete = dbUser.lab?.onboardingComplete ?? false;
          token.trialEndsAt = dbUser.lab?.trialEndsAt?.toISOString() || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).labId = token.labId;
        (session.user as any).labName = token.labName;
        (session.user as any).image = token.picture as string;
        (session.user as any).planTier = token.planTier;
        (session.user as any).onboardingComplete = token.onboardingComplete;
        (session.user as any).trialEndsAt = token.trialEndsAt;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getRequiredSession(session: any) {
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user as {
    id: string;
    email: string;
    name: string;
    role: string;
    labId: string | null;
    labName: string | null;
  };
}

export function hasPermission(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}
