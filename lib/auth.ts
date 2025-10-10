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
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "/dashboard");

  if (!identifier || !password) {
    redirect(`/signin?error=Missing+credentials&identifier=${encodeURIComponent(identifier)}`);
  }

  // Find by email OR username
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: { id: true },
  });

  if (!user) {
    // Not registered → suggest register, keep identifier
    redirect(`/register?identifier=${encodeURIComponent(identifier)}&from=signin`);
  }

  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo: callbackUrl,
    });
    // signIn will redirect, but we keep a fallback:
    redirect(callbackUrl);
  } catch (err) {
    redirect(`/signin?error=Invalid+credentials&identifier=${encodeURIComponent(identifier)}`);
  }
}

/**
 * Server Action: Register
 * - Creates a user with username/email + hashed password
 * - Redirects back to Sign-in with success banner + identifier prefilled
 */
export async function register(formData: FormData) {
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  const useUsername = identifier.includes("@") === false; // naive check

  if (!identifier || !password) {
    redirect(`/register?error=Missing+fields&identifier=${encodeURIComponent(identifier)}`);
  }

  // Uniqueness checks
  if (useUsername) {
    const exists = await prisma.user.findUnique({ where: { username: identifier } });
    if (exists) redirect(`/register?error=Username+already+in+use&identifier=${encodeURIComponent(identifier)}`);
  } else {
    const exists = await prisma.user.findUnique({ where: { email: identifier } });
    if (exists) redirect(`/register?error=Email+already+in+use&identifier=${encodeURIComponent(identifier)}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: name || null,
      username: useUsername ? identifier : null,
      email: useUsername ? null : identifier,
      passwordHash,
    },
  });

  // Back to sign-in with success banner and prefilled identifier
  redirect(`/signin?registered=1&identifier=${encodeURIComponent(identifier)}`);
}


export async function logout() {
  await signOut({ redirectTo: "/signin" });
}
