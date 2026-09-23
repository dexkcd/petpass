import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { LoginSchema } from "@/lib/validation/auth";

export const SIGNUP_ROLE_COOKIE = "pp_signup_role";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = LoginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    /**
     * Users created through OAuth default to OWNER. The register page sets a
     * short-lived cookie when someone chooses "provider" before continuing
     * with Google, which we honour here.
     */
    async createUser({ user }) {
      try {
        const jar = await cookies();
        const wanted = jar.get(SIGNUP_ROLE_COOKIE)?.value;
        if (wanted === "PROVIDER" && user.id) {
          await db.user.update({ where: { id: user.id }, data: { role: "PROVIDER" } });
        }
      } catch {
        // cookies() is unavailable outside a request scope; ignore.
      }
    },
  },
});
