import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransitionButtons } from "@/components/booking/booking-actions";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth-helpers";
import { loadBookingForUser } from "@/lib/booking/queries";
import { db } from "@/lib/db";
import { MODE_LABELS } from "@/lib/labels";
import { formatDateTime, formatMoney, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Booking" };

export default async function OwnerBookingPage({ params, searchParams }: { params: Promise<{ bookingId: string }>; searchParams: Promise<{ new?: string }> }) {
  const { bookingId } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser(`/owner/bookings/${bookingId}`);
  const data = await loadBookingForUser(bookingId, user);
  if (!data || !data.isOwner) notFound();
  const { booking: b, allowed } = data;
  const tz = b.clinic.timezone;
  const grant = await db.recordAccessGrant.findFirst({
    where: { petId: b.petId, clinicId: b.clinicId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  const browserHint = `${formatDateTime(b.startsAt, tz)} – ${formatTime(b.endsAt, tz)}`;

  return (
    <>
      <PageHeader title={`${b.service.name} for ${b.pet.name}`} description={<>{browserHint} ({tz})</>} actions={<BookingStatusBadge status={b.status} />} />
      {isNew ? (
        <div className="mb-4">
          <Alert tone="success">Your request has been sent to {b.clinic.name}. You&apos;ll see the status change here once they confirm.</Alert>
        </div>
      ) : null}
      {b.status === "PENDING" ? <div className="mb-4"><Alert tone="info">Waiting for the clinic to confirm.</Alert></div> : null}
      {b.status === "DECLINED" || b.status === "CANCELLED_BY_PROVIDER" ? (
        <div className="mb-4"><Alert tone="warning">The clinic {b.status === "DECLINED" ? "declined" : "cancelled"} this booking{b.cancelReason ? `: ${b.cancelReason}` : "."}</Alert></div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {b.mode === "ONLINE" ? (
            <Card>
              <CardTitle>Video consultation</CardTitle>
              {b.status === "CONFIRMED" && b.meetingUrl ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a href={b.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:bg-teal-800">
                    Join video call
                  </a>
                  <span className="break-all text-xs text-muted">{b.meetingUrl}</span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  {b.status === "CONFIRMED" ? "The clinic will add the meeting link before your appointment." : "The meeting link appears here once the clinic confirms."}
                </p>
              )}
            </Card>
          ) : (
            <Card>
              <CardTitle>{b.mode === "HOME_VISIT" ? "Home visit" : "Where to go"}</CardTitle>
              <p className="mt-2 text-sm">
                {b.mode === "HOME_VISIT" ? "The clinic will come to you." : `${b.clinic.name}, ${[b.clinic.addressLine1, b.clinic.city, b.clinic.postalCode].filter(Boolean).join(", ")}`}
              </p>
              {b.clinic.phone ? <p className="text-sm text-muted">{b.clinic.phone}</p> : null}
            </Card>
          )}
          <Card>
            <CardTitle>Share {b.pet.name}&apos;s records</CardTitle>
            {grant ? (
              <p className="mt-2 text-sm text-muted">
                {b.clinic.name} can {grant.scope === "READ_WRITE" ? "view and add to" : "view"} {b.pet.name}&apos;s health record.{" "}
                <Link href={`/owner/pets/${b.petId}/sharing`} className="text-primary hover:underline">
                  Manage sharing
                </Link>
              </p>
            ) : (
              <div className="mt-2 space-y-2 text-sm">
                <p className="text-muted">Give the clinic access to {b.pet.name}&apos;s vaccinations, medications and history so they can prepare, and add their visit notes afterwards. You can revoke access any time.</p>
                <ButtonLink href={`/owner/pets/${b.petId}/sharing?clinic=${b.clinicId}`} size="sm">
                  Share with {b.clinic.name}
                </ButtonLink>
              </div>
            )}
          </Card>
          {b.ownerNotes ? (
            <Card>
              <CardTitle>Your notes</CardTitle>
              <p className="mt-2 whitespace-pre-line text-sm">{b.ownerNotes}</p>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card>
            <CardTitle>Details</CardTitle>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Clinic</dt><dd><Link href={`/clinics/${b.clinic.slug}`} className="text-primary hover:underline">{b.clinic.name}</Link></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Format</dt><dd>{MODE_LABELS[b.mode]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Duration</dt><dd>{b.service.durationMin} min</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Price</dt><dd>{formatMoney(b.priceCents, b.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Pet</dt><dd><Link href={`/owner/pets/${b.petId}`} className="text-primary hover:underline">{b.pet.name}</Link></dd></div>
            </dl>
          </Card>
          {allowed.length ? (
            <Card>
              <CardTitle>Need to change it?</CardTitle>
              <div className="mt-3">
                <TransitionButtons bookingId={b.id} allowed={allowed} />
              </div>
            </Card>
          ) : b.status === "CONFIRMED" ? (
            <p className="text-xs text-muted">Online cancellation closes 24 hours before the appointment. Contact the clinic to make changes.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
