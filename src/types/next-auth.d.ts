import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      labId: string | null;
      labName: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    labId: string | null;
    labName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    labId: string | null;
    labName: string | null;
  }
}
