export const runtime = "nodejs";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * --- TypeScript augmentation ---
 * This tells TypeScript that `user` and JWT `token` include `isAdmin`.
 */
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    isAdmin: boolean;
  }

  interface Session {
    user: User;
  }

  interface JWT {
    id: string;
    username: string;
    isAdmin: boolean;
  }
}

/**
 * --- NextAuth setup ---
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = String(credentials.username || "").trim();
        const password = String(credentials.password || "");

        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
          select: { id: true, username: true, passwordHash: true, isAdmin: true },
        });

        console.log("[auth] user found?", !!user, "has hash?", !!user?.passwordHash);

        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        console.log("[auth] password match?", ok);

        if (!ok) return null;

        // Return full user object including isAdmin
        return { id: user.id, username: user.username, isAdmin: user.isAdmin };
      },
    }),
  ],
  session: { strategy: "jwt" },
  
callbacks: {
  jwt: async ({ token, user }) => {
    if (user) {
      // Type assertion for token
      const t = token as {
        id?: string;
        username?: string;
        isAdmin?: boolean;
        [key: string]: any;
      };

      t.id = (user as any).id;
      t.username = (user as any).username;
      t.isAdmin = (user as any).isAdmin;
      return t;
    }
    return token;
  },
  session: async ({ session, token }) => {
    // Type assertion for token
    const t = token as {
      id?: string;
      username?: string;
      isAdmin?: boolean;
      [key: string]: any;
    };

    if (session.user) {
      session.user.id = t.id as string;
      session.user.username = t.username as string;
      session.user.isAdmin = t.isAdmin as boolean;
    }
    return session;
  },
},

});
