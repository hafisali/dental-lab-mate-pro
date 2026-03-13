import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Check if user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (existingUser) {
          // Link Google account to existing user if not already linked
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: existingUser.id,
              provider: "google",
            },
          });

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token as string | undefined,
                access_token: account.access_token as string | undefined,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token as string | undefined,
                session_state: account.session_state as string | undefined,
              },
            });
          }

          // Update avatar if not set
          if (!existingUser.avatar && user.image) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { avatar: user.image, image: user.image },
            });
          }

          return true;
        }

        // New user — auto-create with default role
        // Find the default lab to assign
        const defaultLab = await prisma.lab.findFirst();

        await prisma.user.create({
          data: {
            email: user.email!,
            name: user.name || user.email!.split("@")[0],
            image: user.image,
            avatar: user.image,
            emailVerified: new Date(),
            role: "RECEPTION", // Default role for new Google sign-ins
            active: true,
            labId: defaultLab?.id || null,
            accounts: {
              create: {
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token as string | undefined,
                access_token: account.access_token as string | undefined,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token as string | undefined,
                session_state: account.session_state as string | undefined,
              },
            },
          },
        });

        return true;
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (trigger === "signIn" || trigger === "signUp") {
        // Fetch full user data from DB
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
