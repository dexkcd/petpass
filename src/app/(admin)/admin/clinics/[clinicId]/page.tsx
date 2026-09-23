import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClinicReviewButtons } from "@/components/admin/clinic-review";
import { Alert, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ClinicStatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { MODE_LABELS } from "@/lib/labels";
import { formatDateTime, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Clinic" };

export default async function AdminClinicPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    include: {
      memberships: { where: { active: true }, include: { user: { select: { name: true, email: true } } } },
      services: { include: { category: true }, orderBy: { name: "asc" } },
      _count: { select: { bookings: true, accessGrants: true } },
    },
  });
  if (!clinic) notFound();
  return (
    <>
      <PageHeader
        title={clinic.name}
        description={
          <>
            <ClinicStatusBadge status={clinic.status} /> · registered {formatDateTime(clinic.createdAt)} ·{" "}
            <Link href={`/clinics/${clinic.slug}`} className="text-primary hover:underline">
              public page
            </Link>
          </>
        }
        actions={<ClinicReviewButtons clinicId={clinic.id} status={clinic.status} />}
      />
      {clinic.rejectionReason ? <div className="mb-4"><Alert tone="warning">Note to clinic: {clinic.rejectionReason}</Alert></div> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Details</CardTitle>
          <dl className="mt-2 grid grid-cols-3 gap-y-1 text-sm">
            <dt className="text-muted">Address</dt>
            <dd className="col-span-2">{[clinic.addressLine1, clinic.addressLine2, clinic.city, clinic.region, clinic.postalCode, clinic.country].filter(Boolean).join(", ")}</dd>
            <dt className="text-muted">Coordinates</dt>
            <dd className="col-span-2">{clinic.lat.toFixed(5)}, {clinic.lng.toFixed(5)}{clinic.placeId ? " (Google place)" : ""}</dd>
            <dt className="text-muted">Time zone</dt>
            <dd className="col-span-2">{clinic.timezone}</dd>
            <dt className="text-muted">Contact</dt>
            <dd className="col-span-2">{[clinic.email, clinic.phone, clinic.website].filter(Boolean).join(" · ") || "—"}</dd>
            <dt className="text-muted">Bookings</dt>
            <dd className="col-span-2">{clinic._count.bookings}</dd>
            <dt className="text-muted">Records shared</dt>
            <dd className="col-span-2">{clinic._count.accessGrants}</dd>
          </dl>
          {clinic.description ? <p className="mt-3 whitespace-pre-line text-sm">{clinic.description}</p> : null}
        </Card>
        <Card>
          <CardTitle>Staff</CardTitle>
          <ul className="mt-2 space-y-1 text-sm">
            {clinic.memberships.map((m) => (
              <li key={m.id}>
                {m.user.name ?? m.user.email} <span className="text-muted">· {m.user.email} · {m.role === "CLINIC_OWNER" ? "owner" : "staff"}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>Services ({clinic.services.length})</CardTitle>
          <ul className="mt-2 divide-y divide-border text-sm">
            {clinic.services.map((s) => (
              <li key={s.id} className="flex justify-between py-1.5">
                <span>
                  {s.name} <span className="text-muted">· {s.category.name} · {MODE_LABELS[s.mode]}</span>
                </span>
                <span>{formatMoney(s.priceCents, s.currency)} · {s.durationMin} min</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
