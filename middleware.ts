// middleware.ts

export { auth as middleware } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const url = req.nextUrl;

  const isAuth = !!session?.user;
  const isAuthRoute = url.pathname.startsWith("/auth");

  if (!isAuth && !isAuthRoute) {
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  if (isAuth && url.pathname === "/auth/signin") {
    url.pathname = "/main";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
