import Link from "next/link";
import { PetCard } from "@/components/pets/pet-card";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function OwnerHome() {
  const user = await requireUser("/owner");
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const [pets, upcoming, expiring] = await Promise.all([
    db.pet.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    db.booking.findMany({
      where: { ownerId: user.id, startsAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { pet: { select: { name: true } }, clinic: { select: { name: true, timezone: true } }, service: { select: { name: true } } },
    }),
    db.vaccination.findMany({
      where: { pet: { ownerId: user.id, deletedAt: null }, expiresAt: { lte: in30 } },
      orderBy: { expiresAt: "asc" },
      include: { pet: { select: { id: true, name: true } } },
      take: 10,
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Hello${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Here's what's going on with your pets."
        actions={<ButtonLink href="/search">Find a vet</ButtonLink>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">My pets</h2>
              <Link href="/owner/pets/new" className="text-sm text-primary hover:underline">
                Add a pet
              </Link>
            </div>
            {pets.length === 0 ? (
              <EmptyState title="No pets yet" description="Add your first pet to start their record." action={<ButtonLink href="/owner/pets/new">Add a pet</ButtonLink>} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} href={`/owner/pets/${pet.id}`} />
                ))}
              </div>
            )}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Upcoming appointments</h2>
              <Link href="/owner/bookings" className="text-sm text-primary hover:underline">
                All bookings
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState title="Nothing booked" description="Search for a clinic to book a consultation, treatment or grooming." />
            ) : (
              <ul className="space-y-2">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <Link href={`/owner/bookings/${b.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary">
                      <div>
                        <p className="font-medium">
                          {b.service.name} · {b.pet.name}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(b.startsAt, b.clinic.timezone)} · {b.clinic.name}
                        </p>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div>
          <Card>
            <CardTitle>Vaccination reminders</CardTitle>
            {expiring.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing due in the next 30 days.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {expiring.map((v) => {
                  const overdue = v.expiresAt && v.expiresAt < now;
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-2">
                      <Link href={`/owner/pets/${v.pet.id}`} className="hover:underline">
                        {v.pet.name}: {v.name}
                      </Link>
                      <span className={overdue ? "text-danger" : "text-amber-700"}>
                        {overdue ? "Overdue" : "Due"} {v.expiresAt ? formatDate(v.expiresAt) : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
