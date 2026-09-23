import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClinicAction } from "@/actions/clinics";
import { ClinicForm } from "@/components/clinics/clinic-form";
import { Card, PageHeader } from "@/components/ui/card";
import { getPrimaryMembership, requireRole } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Register your clinic" };

export default async function OnboardingPage() {
  const user = await requireRole("PROVIDER", "/provider/onboarding");
  if (await getPrimaryMembership(user.id)) redirect("/provider");
  return (
    <>
      <PageHeader
        title="Register your clinic or business"
        description="Tell pet owners who you are and where to find you. An admin will verify your listing before it appears in search. If you work at a clinic that is already registered, ask its owner to add you as staff instead."
      />
      <Card>
        <ClinicForm action={createClinicAction} submitLabel="Register clinic" />
      </Card>
    </>
  );
}
