import type { Metadata } from "next";
import { removeStaffAction } from "@/actions/staff";
import { InviteStaffForm } from "@/components/staff/invite-form";
import { Alert, Badge, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { db } from "@/lib/db";
import { requireProviderClinic } from "@/lib/provider";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const { user, membership } = await requireProviderClinic("/provider/staff");
  const members = await db.membership.findMany({
    where: { clinicId: membership.clinicId, active: true },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const isOwner = membership.role === "CLINIC_OWNER";
  return (
    <>
      <PageHeader title="Staff" description="Everyone here can manage bookings and view records that owners have shared with the clinic." />
      <div className="space-y-6">
        <Card>
          <CardTitle>Team</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {m.user.name ?? m.user.email}
                    {m.user.id === user.id ? <span className="text-muted"> (you)</span> : null}
                  </p>
                  <p className="text-muted">
                    {m.user.email}
                    {m.title ? ` · ${m.title}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.role === "CLINIC_OWNER" ? "primary" : "neutral"}>{m.role === "CLINIC_OWNER" ? "Owner" : "Staff"}</Badge>
                  {isOwner && m.user.id !== user.id ? (
                    <ConfirmButton action={removeStaffAction.bind(null, membership.clinicId, m.id)} confirm={`Remove ${m.user.name ?? m.user.email} from the clinic?`} className="text-danger">
                      Remove
                    </ConfirmButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        {isOwner ? (
          <Card>
            <CardTitle>Add a staff member</CardTitle>
            <div className="mt-3">
              <InviteStaffForm clinicId={membership.clinicId} />
            </div>
          </Card>
        ) : (
          <Alert tone="info">Only the clinic owner can add or remove staff.</Alert>
        )}
      </div>
    </>
  );
}
