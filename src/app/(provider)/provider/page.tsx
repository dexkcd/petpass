import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { requireProviderClinic } from "@/lib/provider";
import { localDayBounds } from "@/lib/time";
import { formatTime } from "@/lib/utils";

export default async function ProviderHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { membership } = await requireProviderClinic("/provider");
  const { welcome } = await searchParams;
  const clinic = membership.clinic;
  const tz = clinic.timezone;
  const { start: dayStart, end: dayEnd } = localDayBounds(tz);

  const [today, pendingCount, serviceCount, patientCount] = await Promise.all([
    db.booking.findMany({
      where: { clinicId: clinic.id, startsAt: { gte: dayStart, lte: dayEnd }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { startsAt: "asc" },
      include: { pet: { select: { name: true, species: true } }, owner: { select: { name: true } }, service: { select: { name: true } } },
    }),
    db.booking.count({ where: { clinicId: clinic.id, status: "PENDING" } }),
    db.service.count({ where: { clinicId: clinic.id, active: true } }),
    db.recordAccessGrant.count({
      where: { clinicId: clinic.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={clinic.name}
        description="Today at a glance."
        actions={
          <>
            <ButtonLink href={`/clinics/${clinic.slug}`} variant="outline">
              View public page
            </ButtonLink>
            <ButtonLink href="/provider/bookings">Manage bookings</ButtonLink>
          </>
        }
      />
      {welcome ? <div className="mb-4"><Alert tone="success">Your clinic is registered. Add services and opening hours while we verify it.</Alert></div> : null}
      {clinic.status === "PENDING" ? (
        <div className="mb-4">
          <Alert tone="warning">
            Your clinic is <strong>pending verification</strong>. It will not appear in search until an admin approves it, but you can set up services and availability now.
          </Alert>
        </div>
      ) : null}
      {clinic.status === "REJECTED" || clinic.status === "SUSPENDED" ? (
        <div className="mb-4">
          <Alert tone="danger">Your clinic listing is currently {clinic.status.toLowerCase()}. Contact support for details.</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Pending requests</p>
          <p className="text-3xl font-bold">{pendingCount}</p>
          <Link href="/provider/bookings?status=PENDING" className="text-sm text-primary hover:underline">
            Review
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-muted">Bookable services</p>
          <p className="text-3xl font-bold">{serviceCount}</p>
          <Link href="/provider/services" className="text-sm text-primary hover:underline">
            Manage
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-muted">Patients sharing records</p>
          <p className="text-3xl font-bold">{patientCount}</p>
          <Link href="/provider/patients" className="text-sm text-primary hover:underline">
            View
          </Link>
        </Card>
      </div>

      <Card>
        <CardTitle>Today&apos;s schedule</CardTitle>
        {today.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No appointments today" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {today.map((b) => (
              <li key={b.id}>
                <Link href={`/provider/bookings/${b.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium">
                      {formatTime(b.startsAt, tz)} · {b.service.name}
                    </p>
                    <p className="text-sm text-muted">
                      {b.pet.name} ({b.pet.species.toLowerCase()}) · {b.owner.name ?? "Owner"}
                    </p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
