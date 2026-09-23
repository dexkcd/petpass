import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PetAvatar, ageLabel } from "@/components/pets/pet-card";
import { RecordsPanel, loadPetRecords } from "@/components/records/records-panel";
import { Alert, Card } from "@/components/ui/card";
import { getPetAccess } from "@/lib/authz/records";
import { db } from "@/lib/db";
import { SEX_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { requireProviderClinic } from "@/lib/provider";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Patient record" };

export default async function PatientPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const { user, membership } = await requireProviderClinic(`/provider/patients/${petId}`);
  const access = await getPetAccess(user, petId);
  if (access.level === "NONE") notFound();

  const [pet, records, bookings] = await Promise.all([
    db.pet.findUniqueOrThrow({ where: { id: petId }, include: { owner: { select: { name: true, email: true, phone: true } } } }),
    loadPetRecords(petId),
    db.booking.findMany({
      where: { petId, clinicId: membership.clinicId },
      orderBy: { startsAt: "desc" },
      take: 5,
      include: { service: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/provider/patients" className="text-sm text-primary hover:underline">
        ← All patients
      </Link>
      <Card>
        <div className="flex items-center gap-4">
          <PetAvatar species={pet.species} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{pet.name}</h1>
            <p className="text-sm text-muted">
              {SPECIES_LABELS[pet.species]}
              {pet.breed ? ` · ${pet.breed}` : ""} · {SEX_LABELS[pet.sex]}
              {pet.birthDate ? ` · ${ageLabel(pet.birthDate)} (born ${formatDate(pet.birthDate)})` : ""}
              {pet.weightKg ? ` · ${pet.weightKg.toString()} kg` : ""}
            </p>
            {pet.microchipId ? <p className="text-xs text-muted">Microchip {pet.microchipId}</p> : null}
            <p className="mt-1 text-xs text-muted">
              Owner: {pet.owner.name ?? "—"} · {pet.owner.email}
              {pet.owner.phone ? ` · ${pet.owner.phone}` : ""}
            </p>
            {pet.notes ? <p className="mt-2 whitespace-pre-line text-sm">{pet.notes}</p> : null}
          </div>
        </div>
      </Card>
      <Alert tone={access.level === "WRITE" ? "success" : "info"}>
        {access.level === "WRITE"
          ? "The owner has allowed your clinic to view this record and add visit notes, vaccinations, medications and documents."
          : "The owner has shared this record for viewing only."}
      </Alert>
      {bookings.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Appointments with your clinic</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/provider/bookings/${b.id}`} className="hover:underline">
                  {formatDateTime(b.startsAt, membership.clinic.timezone)} · {b.service.name} · {b.status.toLowerCase().replace(/_/g, " ")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <h2 className="text-lg font-semibold">Health record</h2>
      <RecordsPanel petId={pet.id} records={records} viewer={{ id: user.id, canWrite: access.level === "WRITE", isOwner: false, clinicId: access.clinicId }} />
    </div>
  );
}
