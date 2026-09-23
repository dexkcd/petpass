"use client";

import Link from "next/link";
import { useActionState } from "react";
import { googleSignInAction, loginAction, registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import type { ActionResult } from "@/lib/action-result";

function GoogleButton({ role, callbackUrl, enabled }: { role: "OWNER" | "PROVIDER"; callbackUrl?: string; enabled: boolean }) {
  if (!enabled) return null;
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="role" value={role} />
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      <Button type="submit" variant="outline" className="w-full">
        Continue with Google
      </Button>
    </form>
  );
}

export function LoginForm({ callbackUrl, googleEnabled, error }: { callbackUrl?: string; googleEnabled: boolean; error?: string }) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(loginAction, undefined);
  const message = state && !state.ok ? state.error : error;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <FormError message={message} />
        <Field label="Email" htmlFor="email" errors={fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" errors={fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <GoogleButton role="OWNER" callbackUrl={callbackUrl} enabled={googleEnabled} />
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({
  callbackUrl,
  googleEnabled,
  defaultRole,
}: {
  callbackUrl?: string;
  googleEnabled: boolean;
  defaultRole: "OWNER" | "PROVIDER";
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(registerAction, undefined);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        <FormError message={state && !state.ok ? state.error : undefined} />
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">I am a…</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm has-checked:border-primary has-checked:bg-teal-50">
              <input type="radio" name="role" value="OWNER" defaultChecked={defaultRole === "OWNER"} />
              Pet owner
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm has-checked:border-primary has-checked:bg-teal-50">
              <input type="radio" name="role" value="PROVIDER" defaultChecked={defaultRole === "PROVIDER"} />
              Vet / groomer / clinic
            </label>
          </div>
        </fieldset>
        <Field label="Your name" htmlFor="name" errors={fieldErrors?.name}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="email" errors={fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters with a letter and a number" errors={fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <GoogleButton role={defaultRole} callbackUrl={callbackUrl} enabled={googleEnabled} />
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
