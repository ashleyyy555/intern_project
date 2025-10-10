import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

export const runtime = "nodejs";


export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/signin");
  return <div>Welcome, {session.user.name}</div>; 
  }

  
