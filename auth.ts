// auth.ts
export const runtime = "nodejs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";



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
          select: { id: true, username: true, passwordHash: true },
        });

        console.log("[auth] user found?", !!user, "has hash?", !!user?.passwordHash);

        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        
        console.log("[auth] password match?", ok);

        if (!ok) return null;

        // Return the minimal user object for the session
        return { id: user.id, username: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
});
