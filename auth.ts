// auth.ts
export const runtime = "nodejs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";



export const { handlers, auth, signIn, signOut } = NextAuth({
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
          select: { id: true, name: true, username: true, passwordHash: true },
        });

        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Return the minimal user object for the session
        return { id: user.id, name: user.name ?? user.username, username: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
});
