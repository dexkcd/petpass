"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SIGNUP_ROLE_COOKIE, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { homeForRole } from "@/lib/auth-helpers";
import { LoginSchema, RegisterSchema } from "@/lib/validation/auth";
import type { ActionResult } from "@/lib/action-result";

function safeCallback(url: FormDataEntryValue | null | undefined) {
  const value = typeof url === "string" ? url : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export async function registerAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "OWNER",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists", fieldErrors: { email: ["Already registered"] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({ data: { name, email: normalizedEmail, passwordHash, role } });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: safeCallback(formData.get("callbackUrl")) ?? homeForRole(role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Account created but sign-in failed. Please log in." };
    }
    throw error;
  }
  return { ok: true, data: undefined };
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: callbackUrl ?? "/account",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Incorrect email or password" };
    }
    throw error;
  }
  return { ok: true, data: undefined };
}

export async function googleSignInAction(formData: FormData) {
  const role = formData.get("role") === "PROVIDER" ? "PROVIDER" : "OWNER";
  const jar = await cookies();
  jar.set(SIGNUP_ROLE_COOKIE, role, { maxAge: 600, httpOnly: true, sameSite: "lax", path: "/" });
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) ?? "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Lands users on the right dashboard after a login without a callback URL. */
export async function accountRedirect(role: "OWNER" | "PROVIDER" | "ADMIN") {
  redirect(homeForRole(role));
}
