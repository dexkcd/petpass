import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePetAction } from "@/actions/pets";
import { PetAvatar, ageLabel } from "@/components/pets/pet-card";
import { RecordsPanel, loadPetRecords } from "@/components/records/records-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { SEX_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pet" };

export default async function PetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const user = await requireUser(`/owner/pets/${petId}`);
  const pet = await db.pet.findFirst({ where: { id: petId, ownerId: user.id, deletedAt: null } });
  if (!pet) notFound();

  const [records, clinicsFromBookings, activeGrants] = await Promise.all([
    loadPetRecords(petId),
    db.booking.findMany({
      where: { petId },
      distinct: ["clinicId"],
      select: { clinic: { select: { id: true, name: true } } },
    }),
    db.recordAccessGrant.count({
      where: { petId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
              {pet.notes ? <p className="mt-2 whitespace-pre-line text-sm">{pet.notes}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/owner/pets/${pet.id}/sharing`} variant="outline" size="sm">
              Sharing{activeGrants ? ` (${activeGrants})` : ""}
            </ButtonLink>
            <ButtonLink href={`/owner/pets/${pet.id}/edit`} variant="outline" size="sm">
              Edit
            </ButtonLink>
            <ConfirmButton
              action={deletePetAction.bind(null, pet.id)}
              confirm={`Remove ${pet.name} and their records from your account?`}
              variant="ghost"
              size="sm"
              className="text-danger"
            >
              Remove
            </ConfirmButton>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Health record</h2>
        <Link href="/search" className="text-sm text-primary hover:underline">
          Book an appointment →
        </Link>
      </div>

      <RecordsPanel
        petId={pet.id}
        records={records}
        viewer={{ id: user.id, canWrite: true, isOwner: true }}
        ownerClinics={clinicsFromBookings.map((b) => b.clinic)}
      />
    </div>
  );
}
