// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export const { auth, handlers, signIn, signOut } = NextAuth({
  
  session: { strategy: "jwt" },

  // If you are NOT using OAuth at all, you can remove the adapter.
  // Keeping it is fine too (it’s handy if you add OAuth later).
  //adapter: PrismaAdapter(prisma),

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.identifier || !creds?.password) return null;

        // Find by username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: creds.identifier },
            ],
          },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
        if (!ok) return null;

        // Minimal safe user object → becomes `user` on first JWT pass
        return { id: user.id, name: user.name ?? null };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) (session.user as any).id = token.sub;
      return session;
    },
  },
});
