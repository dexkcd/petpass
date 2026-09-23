import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { MODE_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDaysISO, toLocalDateISO } from "@/lib/time";
import { formatMoney } from "@/lib/utils";
import { MAX_BOOKING_DAYS_AHEAD } from "@/lib/validation/bookings";

export const metadata: Metadata = { title: "Book" };

export default async function BookPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const user = await requireUser(`/owner/book/${serviceId}`);
  const service = await db.service.findUnique({ where: { id: serviceId }, include: { clinic: true, category: true } });
  if (!service || !service.active || service.clinic.status !== "VERIFIED") notFound();

  const pets = await db.pet.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { createdAt: "asc" } });
  const bookable = pets.map((p) => ({ id: p.id, name: p.name, species: p.species, compatible: service.species.length === 0 || service.species.includes(p.species) }));
  const today = toLocalDateISO(new Date(), service.clinic.timezone);

  return (
    <>
      <PageHeader
        title={`Book ${service.name}`}
        description={
          <>
            <Link href={`/clinics/${service.clinic.slug}`} className="text-primary hover:underline">
              {service.clinic.name}
            </Link>{" "}
            · {MODE_LABELS[service.mode]} · {service.durationMin} min · {formatMoney(service.priceCents, service.currency)}
            {service.species.length ? ` · for ${service.species.map((s) => SPECIES_LABELS[s].toLowerCase()).join(", ")}` : ""}
          </>
        }
      />
      {service.description ? <p className="mb-4 text-sm text-muted">{service.description}</p> : null}
      {pets.length === 0 ? (
        <Alert tone="info">
          Add a pet before booking.{" "}
          <ButtonLink href="/owner/pets/new" size="sm" variant="secondary" className="ml-2">
            Add a pet
          </ButtonLink>
        </Alert>
      ) : (
        <Card>
          <BookingForm serviceId={service.id} pets={bookable} minDate={today} maxDate={addDaysISO(today, MAX_BOOKING_DAYS_AHEAD)} clinicTimezone={service.clinic.timezone} />
        </Card>
      )}
      <p className="mt-4 text-xs text-muted">
        Your request is sent to the clinic to confirm. {service.mode === "ONLINE" ? "For video consultations the clinic will add a meeting link when they confirm." : ""} You can cancel online up to 24 hours before the appointment.
      </p>
    </>
  );
}
