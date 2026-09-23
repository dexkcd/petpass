import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingUrlForm, ProviderNotesForm, TransitionButtons } from "@/components/booking/booking-actions";
import { VisitNoteForm } from "@/components/records/record-forms";
import { Alert, Card, CardTitle, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { loadBookingForUser } from "@/lib/booking/queries";
import { MODE_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { requireProviderClinic } from "@/lib/provider";
import { formatDateTime, formatMoney, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Booking" };

export default async function ProviderBookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const { user } = await requireProviderClinic(`/provider/bookings/${bookingId}`);
  const data = await loadBookingForUser(bookingId, user);
  if (!data || !data.isClinic) notFound();
  const { booking: b, allowed, canSetMeeting, recordAccess } = data;
  const tz = b.clinic.timezone;
  const canWriteRecords = recordAccess?.level === "WRITE";
  const canReadRecords = recordAccess && recordAccess.level !== "NONE";

  return (
    <>
      <PageHeader
        title={`${b.service.name} · ${b.pet.name}`}
        description={
          <>
            {formatDateTime(b.startsAt, tz)} – {formatTime(b.endsAt, tz)} ({tz}) · {MODE_LABELS[b.mode]} · {formatMoney(b.priceCents, b.currency)}
          </>
        }
        actions={<BookingStatusBadge status={b.status} />}
      />
      {b.status === "CONFIRMED" && b.mode === "ONLINE" && !b.meetingUrl ? (
        <div className="mb-4">
          <Alert tone="warning">This is an online consultation. Add the video meeting link below so the owner can join.</Alert>
        </div>
      ) : null}
      {b.cancelReason ? <div className="mb-4"><Alert tone="info">Reason: {b.cancelReason}</Alert></div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>Actions</CardTitle>
            <div className="mt-3">
              {allowed.length ? <TransitionButtons bookingId={b.id} allowed={allowed} /> : <p className="text-sm text-muted">No further changes possible.</p>}
            </div>
          </Card>
          {b.mode === "ONLINE" && canSetMeeting ? (
            <Card>
              <MeetingUrlForm bookingId={b.id} current={b.meetingUrl} />
            </Card>
          ) : null}
          {b.ownerNotes ? (
            <Card>
              <CardTitle>Owner&apos;s notes</CardTitle>
              <p className="mt-2 whitespace-pre-line text-sm">{b.ownerNotes}</p>
            </Card>
          ) : null}
          <Card>
            <ProviderNotesForm bookingId={b.id} current={b.providerNotes} />
          </Card>
          {b.status === "COMPLETED" ? (
            <Card>
              <CardTitle>Visit note</CardTitle>
              {b.visitNote ? (
                <p className="mt-2 text-sm text-muted">
                  A visit note has been written for this appointment.{" "}
                  {canReadRecords ? (
                    <Link href={`/provider/patients/${b.pet.id}`} className="text-primary hover:underline">
                      View the patient record
                    </Link>
                  ) : null}
                </p>
              ) : canWriteRecords ? (
                <div className="mt-3">
                  <VisitNoteForm petId={b.pet.id} bookingId={b.id} fixedClinicId={b.clinicId} title="+ Write the visit note" />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  The owner has not shared {b.pet.name}&apos;s records with your clinic, so a visit note cannot be added to their record. Ask them to share access from the booking page.
                </p>
              )}
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card>
            <CardTitle>Patient</CardTitle>
            <p className="mt-2 text-sm">
              <span className="font-medium">{b.pet.name}</span> · {SPECIES_LABELS[b.pet.species]}
              {b.pet.breed ? ` · ${b.pet.breed}` : ""}
            </p>
            {canReadRecords ? (
              <Link href={`/provider/patients/${b.pet.id}`} className="mt-1 inline-block text-sm text-primary hover:underline">
                Open health record →
              </Link>
            ) : (
              <p className="mt-1 text-xs text-muted">Records not shared with your clinic.</p>
            )}
          </Card>
          <Card>
            <CardTitle>Owner</CardTitle>
            <p className="mt-2 text-sm">{b.owner.name ?? "—"}</p>
            <p className="text-sm text-muted">{b.owner.email}</p>
            {b.owner.phone ? <p className="text-sm text-muted">{b.owner.phone}</p> : null}
          </Card>
          {b.staff ? (
            <Card>
              <CardTitle>Assigned to</CardTitle>
              <p className="mt-2 text-sm">{b.staff.name}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
