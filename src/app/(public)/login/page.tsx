import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/card";
import { getSessionUser, homeForRole } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Log in" };

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already registered with a password. Log in with your password instead.",
  CredentialsSignin: "Incorrect email or password",
  Configuration: "Sign-in is not configured correctly. Please try again later.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  const { callbackUrl, error } = await searchParams;
  if (user) redirect(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : homeForRole(user.role));

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">Welcome back</h1>
      <Card>
        <LoginForm
          callbackUrl={callbackUrl}
          googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)}
          error={error ? ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again." : undefined}
        />
      </Card>
    </main>
  );
}
