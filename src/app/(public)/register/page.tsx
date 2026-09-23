import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/card";
import { getSessionUser, homeForRole } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; role?: string }>;
}) {
  const user = await getSessionUser();
  const { callbackUrl, role } = await searchParams;
  if (user) redirect(homeForRole(user.role));

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-2 text-center text-2xl font-bold">Create your PetPass account</h1>
      <p className="mb-6 text-center text-sm text-muted">Owners keep records and book. Clinics list services and manage bookings.</p>
      <Card>
        <RegisterForm
          callbackUrl={callbackUrl}
          googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)}
          defaultRole={role === "PROVIDER" ? "PROVIDER" : "OWNER"}
        />
      </Card>
    </main>
  );
}
