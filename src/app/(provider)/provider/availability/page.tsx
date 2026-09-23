import type { Metadata } from "next";
import { deleteBlockAction } from "@/actions/availability";
import { AvailabilityEditor, type Rule } from "@/components/availability/availability-editor";
import { BlockForm } from "@/components/availability/block-form";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { db } from "@/lib/db";
import { requireProviderClinic } from "@/lib/provider";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { membership } = await requireProviderClinic("/provider/availability");
  const clinicId = membership.clinicId;
  const [rules, blocks, members] = await Promise.all([
    db.availability.findMany({ where: { clinicId }, orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] }),
    db.availabilityBlock.findMany({ where: { clinicId, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, include: {} }),
    db.membership.findMany({ where: { clinicId, active: true }, include: { user: { select: { id: true, name: true, email: true } } } }),
  ]);
  const staff = members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email }));
  const rulesByStaff: Record<string, Rule[]> = {};
  for (const r of rules) (rulesByStaff[r.staffId ?? ""] ??= []).push({ weekday: r.weekday, startMinutes: r.startMinutes, endMinutes: r.endMinutes });
  const tz = membership.clinic.timezone;

  return (
    <>
      <PageHeader title="Availability" description={`Opening hours and time off. All times are in ${tz}.`} />
      <div className="space-y-6">
        <Card>
          <CardTitle>Weekly hours</CardTitle>
          <div className="mt-3">
            <AvailabilityEditor clinicId={clinicId} staff={staff} rulesByStaff={rulesByStaff} />
          </div>
        </Card>
        <Card>
          <CardTitle>Time off & closures</CardTitle>
          {blocks.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No upcoming time off.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2">
                  <span>
                    {formatDateTime(b.startsAt, tz)} → {formatDateTime(b.endsAt, tz)}
                    {b.reason ? <span className="text-muted"> · {b.reason}</span> : null}
                    {b.staffId ? <span className="text-muted"> · {staff.find((s) => s.id === b.staffId)?.name ?? "staff"}</span> : null}
                  </span>
                  <ConfirmButton action={deleteBlockAction.bind(null, clinicId, b.id)} confirm="Remove this time off?" className="text-danger">
                    Remove
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <BlockForm clinicId={clinicId} staff={staff} />
          </div>
        </Card>
      </div>
    </>
  );
}
