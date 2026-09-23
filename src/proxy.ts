import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import type { Role } from "@/generated/prisma/enums";

const { auth } = NextAuth(authConfig);

const ROLE_PREFIXES: Array<{ prefix: string; role: Role }> = [
  { prefix: "/owner", role: "OWNER" },
  { prefix: "/provider", role: "PROVIDER" },
  { prefix: "/admin", role: "ADMIN" },
];

function homeFor(role: Role | undefined) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PROVIDER":
      return "/provider";
    default:
      return "/owner";
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session?.user) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const role = session.user.role;
  const required = ROLE_PREFIXES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));

  // Admins may look at any area; everyone else is confined to their own.
  if (required && role !== "ADMIN" && required.role !== role) {
    return NextResponse.redirect(new URL(homeFor(role), req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/owner/:path*", "/provider/:path*", "/admin/:path*", "/account/:path*"],
};
