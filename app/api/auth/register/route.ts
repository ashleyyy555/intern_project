// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import bcrypt from "bcryptjs";



export const runtime = "nodejs";


export async function POST(req: Request) {
  const { username, password, name } = await req.json();

  if (!password || (!username)) {
    return NextResponse.json({ error: "Identifier and password required" }, { status: 400 });
  }

  // Uniqueness checks
  if (username) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return NextResponse.json({ error: "Username already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, name, passwordHash },
    select: { id: true, email: true, username: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
