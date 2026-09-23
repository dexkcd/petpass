import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { MODE_LABELS } from "@/lib/labels";
import { requireProviderClinic } from "@/lib/provider";
import { formatDateTime } from "@/lib/utils";
import type { BookingStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Bookings" };

const FILTERS: Array<{ key: string; label: string; where: (now: Date) => { status?: { in: BookingStatus[] } | BookingStatus; startsAt?: { gte?: Date; lt?: Date } } }> = [
  { key: "upcoming", label: "Upcoming", where: (now) => ({ status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gte: now } }) },
  { key: "PENDING", label: "Needs response", where: () => ({ status: "PENDING" }) },
  { key: "past", label: "Past", where: (now) => ({ startsAt: { lt: now } }) },
  { key: "all", label: "All", where: () => ({}) },
];

export default async function ProviderBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { membership } = await requireProviderClinic("/provider/bookings");
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const now = new Date();
  const bookings = await db.booking.findMany({
    where: { clinicId: membership.clinicId, ...filter.where(now) },
    orderBy: { startsAt: filter.key === "past" ? "desc" : "asc" },
    take: 200,
    include: { pet: { select: { name: true, species: true } }, owner: { select: { name: true } }, service: { select: { name: true } } },
  });
  const tz = membership.clinic.timezone;
  return (
    <>
      <PageHeader title="Bookings" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/provider/bookings?status=${f.key}`} className={`rounded-full px-3 py-1 text-sm ${filter.key === f.key ? "bg-primary text-primary-foreground" : "bg-slate-100 hover:bg-slate-200"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {bookings.length === 0 ? (
        <EmptyState title="No bookings here" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/provider/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div>
                  <p className="font-medium">
                    {formatDateTime(b.startsAt, tz)} · {b.service.name}
                  </p>
                  <p className="text-sm text-muted">
                    {b.pet.name} ({b.pet.species.toLowerCase().replace("_", " ")}) · {b.owner.name ?? "Owner"} · {MODE_LABELS[b.mode]}
                  </p>
                </div>
                <BookingStatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
