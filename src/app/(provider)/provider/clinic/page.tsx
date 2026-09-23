import type { Metadata } from "next";
import { updateClinicAction } from "@/actions/clinics";
import { ClinicForm } from "@/components/clinics/clinic-form";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { ClinicStatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { requireProviderClinic } from "@/lib/provider";

export const metadata: Metadata = { title: "Clinic profile" };

export default async function ClinicProfilePage() {
  const { membership } = await requireProviderClinic("/provider/clinic");
  const clinic = await db.clinic.findUniqueOrThrow({ where: { id: membership.clinicId } });
  const canEdit = membership.role === "CLINIC_OWNER";
  return (
    <>
      <PageHeader title="Clinic profile" description="Shown on your public page and used for search." actions={<ClinicStatusBadge status={clinic.status} />} />
      {clinic.rejectionReason ? <div className="mb-4"><Alert tone="danger">Admin note: {clinic.rejectionReason}</Alert></div> : null}
      {!canEdit ? <div className="mb-4"><Alert tone="info">Only the clinic owner can edit the profile.</Alert></div> : null}
      <Card>
        {canEdit ? (
          <ClinicForm action={updateClinicAction.bind(null, clinic.id)} initial={clinic} submitLabel="Save profile" />
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <dt className="text-muted">Name</dt><dd>{clinic.name}</dd>
            <dt className="text-muted">Address</dt><dd>{[clinic.addressLine1, clinic.addressLine2, clinic.city, clinic.postalCode].filter(Boolean).join(", ")}</dd>
            <dt className="text-muted">Time zone</dt><dd>{clinic.timezone}</dd>
          </dl>
        )}
      </Card>
    </>
  );
}
