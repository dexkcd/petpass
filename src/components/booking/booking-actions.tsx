"use client";

import { useActionState, useTransition } from "react";
import { setMeetingUrlAction, setProviderNotesAction, transitionBookingAction } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/form";
import type { BookingStatus } from "@/generated/prisma/enums";

const LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirm",
  DECLINED: "Decline",
  CANCELLED_BY_OWNER: "Cancel booking",
  CANCELLED_BY_PROVIDER: "Cancel booking",
  COMPLETED: "Mark completed",
  NO_SHOW: "Mark no-show",
};
const NEEDS_REASON: BookingStatus[] = ["DECLINED", "CANCELLED_BY_OWNER", "CANCELLED_BY_PROVIDER"];
const VARIANT: Partial<Record<BookingStatus, "primary" | "outline" | "danger" | "secondary">> = {
  CONFIRMED: "primary",
  COMPLETED: "primary",
  DECLINED: "outline",
  CANCELLED_BY_OWNER: "danger",
  CANCELLED_BY_PROVIDER: "danger",
  NO_SHOW: "outline",
};

export function TransitionButtons({ bookingId, allowed }: { bookingId: string; allowed: BookingStatus[] }) {
  const [pending, start] = useTransition();
  if (allowed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((status) => (
        <Button
          key={status}
          type="button"
          variant={VARIANT[status] ?? "secondary"}
          size="sm"
          disabled={pending}
          onClick={() => {
            let reason: string | undefined;
            if (NEEDS_REASON.includes(status)) {
              const r = window.prompt("Add a short reason (optional):", "");
              if (r === null) return;
              reason = r || undefined;
            } else if (!window.confirm(`${LABELS[status]}?`)) return;
            start(async () => {
              const res = await transitionBookingAction({ bookingId, status, reason });
              if (!res.ok) window.alert(res.error);
            });
          }}
        >
          {LABELS[status]}
        </Button>
      ))}
    </div>
  );
}

export function MeetingUrlForm({ bookingId, current }: { bookingId: string; current: string | null }) {
  const [state, formAction, pending] = useActionState(setMeetingUrlAction, undefined);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <FormSuccess message={state?.ok ? "Meeting link saved" : undefined} />
      <Field label="Video meeting link" htmlFor="meetingUrl" hint="Paste a Google Meet, Zoom or Teams link. The owner sees it once the booking is confirmed." errors={errors?.meetingUrl}>
        <div className="flex gap-2">
          <Input id="meetingUrl" name="meetingUrl" type="url" defaultValue={current ?? ""} placeholder="https://meet.google.com/…" required />
          <Button type="submit" size="md" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </Field>
    </form>
  );
}

export function ProviderNotesForm({ bookingId, current }: { bookingId: string; current: string | null }) {
  const [state, formAction, pending] = useActionState(setProviderNotesAction, undefined);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <FormSuccess message={state?.ok ? "Notes saved" : undefined} />
      <Field label="Internal notes" htmlFor="providerNotes" hint="Only your clinic can see these.">
        <Textarea id="providerNotes" name="providerNotes" defaultValue={current ?? ""} />
      </Field>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save notes"}
      </Button>
    </form>
  );
}
