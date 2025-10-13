// lib/auth.ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"; // ← change if you use a custom path
import bcrypt from "bcryptjs";
import { signIn } from "@/auth"; // from your NextAuth v5 `auth.ts`
import { signOut } from "@/auth";

/**
 * Server Action: Sign in
 * - If user not found → redirect to /register with identifier prefilled
 * - If found → call Auth.js credentials signIn
 */
export async function login(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "/dashboard");

  if (!username || !password) {
    redirect(`/signin?error=Missing+credentials&username=${encodeURIComponent(username)}`);
  }

  // (Optional) quick existence check; not required:
  const exists = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!exists) {
    redirect(`/register?username=${encodeURIComponent(username)}&from=signin`);
  }

  try {
    await signIn("credentials", {
      username,            //must match the provider’s expected key
      password,
      redirectTo: callbackUrl,
    });
    redirect(callbackUrl); // safety fallback
  } catch {
    redirect(`/signin?error=Invalid+credentials&username=${encodeURIComponent(username)}`);
  }
}

export async function register(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();

  if (!username || !password) {
    redirect(`/register?error=Missing+fields&username=${encodeURIComponent(username)}`);
  }

  // username uniqueness
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    redirect(`/register?error=Username+already+in+use&username=${encodeURIComponent(username)}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: name || null,
      username,            // always set
      email: null,         // optional; keep null since you’re not using email
      passwordHash,
    },
  });

  redirect(`/signin?registered=1&username=${encodeURIComponent(username)}`);
}

export async function logout() {
  await signOut({ redirectTo: "/signin" });
}
