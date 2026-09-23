import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revokeAccessAction } from "@/actions/access";
import { GrantForm } from "@/components/sharing/grant-form";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireUser } from "@/lib/auth-helpers";
import { isGrantActive } from "@/lib/authz/records";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Sharing" };

export default async function SharingPage({ params, searchParams }: { params: Promise<{ petId: string }>; searchParams: Promise<{ clinic?: string }> }) {
  const { petId } = await params;
  const { clinic: preselected } = await searchParams;
  const user = await requireUser(`/owner/pets/${petId}/sharing`);
  const pet = await db.pet.findFirst({ where: { id: petId, ownerId: user.id, deletedAt: null } });
  if (!pet) notFound();

  const [grants, clinics] = await Promise.all([
    db.recordAccessGrant.findMany({ where: { petId }, orderBy: { createdAt: "desc" }, include: { clinic: { select: { name: true, slug: true } } } }),
    db.clinic.findMany({ where: { status: "VERIFIED" }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
  ]);
  const now = new Date();
  const active = grants.filter((g) => isGrantActive(g, now));
  const past = grants.filter((g) => !isGrantActive(g, now));

  return (
    <>
      <PageHeader
        title={`Who can see ${pet.name}'s records`}
        description="Clinics you share with can view the health record and, if you allow it, add visit notes, vaccinations and documents. You can revoke access at any time."
        actions={
          <Link href={`/owner/pets/${pet.id}`} className="text-sm text-primary hover:underline">
            ← Back to {pet.name}
          </Link>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardTitle>Share with a clinic</CardTitle>
          <div className="mt-3">
            <GrantForm petId={pet.id} clinics={clinics} preselectedClinicId={preselected} />
          </div>
        </Card>
        <Card>
          <CardTitle>Currently shared</CardTitle>
          {active.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Not shared with any clinic.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {active.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <Link href={`/clinics/${g.clinic.slug}`} className="font-medium hover:underline">
                      {g.clinic.name}
                    </Link>
                    <p className="text-muted">
                      {g.scope === "READ_WRITE" ? "Can view and add records" : "View only"} · since {formatDate(g.createdAt)} ·{" "}
                      {g.expiresAt ? `expires ${formatDate(g.expiresAt)}` : "no expiry"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="success">Active</Badge>
                    <ConfirmButton action={revokeAccessAction.bind(null, pet.id, g.id)} confirm={`Stop sharing ${pet.name}'s records with ${g.clinic.name}?`} className="text-danger">
                      Revoke
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {past.length > 0 ? (
          <Card>
            <CardTitle>Past access</CardTitle>
            <ul className="mt-2 divide-y divide-border text-sm">
              {past.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{g.clinic.name}</p>
                    <p className="text-muted">
                      {formatDate(g.createdAt)} → {g.revokedAt ? `revoked ${formatDate(g.revokedAt)}` : `expired ${formatDate(g.expiresAt!)}`}
                    </p>
                  </div>
                  <Badge>{g.revokedAt ? "Revoked" : "Expired"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
