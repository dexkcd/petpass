import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { MODE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import type { BookingStatus, ServiceMode } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "My bookings" };

type Row = {
  id: string;
  startsAt: Date;
  status: BookingStatus;
  mode: ServiceMode;
  pet: { name: string };
  clinic: { name: string; timezone: string };
  service: { name: string };
};

function BookingList({ items }: { items: Row[] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/owner/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
            <div>
              <p className="font-medium">
                {b.service.name} · {b.pet.name}
              </p>
              <p className="text-sm text-muted">
                {formatDateTime(b.startsAt, b.clinic.timezone)} · {b.clinic.name} · {MODE_LABELS[b.mode]}
              </p>
            </div>
            <BookingStatusBadge status={b.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function OwnerBookingsPage() {
  const user = await requireUser("/owner/bookings");
  const now = new Date();
  const all = await db.booking.findMany({
    where: { ownerId: user.id },
    orderBy: { startsAt: "asc" },
    include: { pet: { select: { name: true } }, clinic: { select: { name: true, timezone: true } }, service: { select: { name: true } } },
  });
  const upcoming = all.filter((b) => b.startsAt >= now && (b.status === "PENDING" || b.status === "CONFIRMED"));
  const past = all.filter((b) => !upcoming.includes(b)).reverse();

  return (
    <>
      <PageHeader title="My bookings" actions={<ButtonLink href="/search">Book something new</ButtonLink>} />
      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? <EmptyState title="Nothing upcoming" description="Find a clinic to book a consultation, treatment or grooming." /> : <BookingList items={upcoming} />}
      </section>
      {past.length > 0 ? (
        <section>
          <h2 className="mb-2 font-semibold">Past & cancelled</h2>
          <BookingList items={past} />
        </section>
      ) : null}
    </>
  );
}
