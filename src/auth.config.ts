import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration.
 *
 * This file must not import Prisma, bcrypt or anything Node-only: it is used
 * by `src/proxy.ts`, which runs before the request reaches the app. The full
 * configuration (adapter + credentials provider) lives in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "OWNER";
      }
      if (trigger === "update" && session?.user?.role) {
        token.role = session.user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (token.role === "OWNER" || token.role === "PROVIDER" || token.role === "ADMIN") {
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
