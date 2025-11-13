// auth.ts
export const runtime = "nodejs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isAborted } from "zod/v3";



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

        // --- DEBUGGING CHECK: Ensure the hash is retrieved fully ---
        // A standard bcrypt hash is around 60 characters long.
        console.log(`[auth] Retrieved hash length: ${user.passwordHash.length}`);
        // ------------------------------------------------------------

        const ok = await bcrypt.compare(password, user.passwordHash);
        
        console.log("[auth] password match?", ok);

        if (!ok) return null;

        // Return the minimal user object for the session
        return { id: user.id, username: user.username, isAdmin: user.isAdmin};
      },
    }),
  ],
  session: { strategy: "jwt" },

  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user = {
          id: token.id,
          username: token.username,
          isAdmin: token.isAdmin,
        };
      }
      return session;
    },
  },
});