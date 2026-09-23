import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updatePetAction } from "@/actions/pets";
import { PetForm } from "@/components/pets/pet-form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit pet" };

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const user = await requireUser(`/owner/pets/${petId}/edit`);
  const pet = await db.pet.findFirst({ where: { id: petId, ownerId: user.id, deletedAt: null } });
  if (!pet) notFound();

  return (
    <>
      <PageHeader title={`Edit ${pet.name}`} />
      <Card>
        <PetForm
          action={updatePetAction.bind(null, pet.id)}
          initial={{ ...pet, weightKg: pet.weightKg?.toString() ?? null }}
          submitLabel="Save changes"
          cancelHref={`/owner/pets/${pet.id}`}
        />
      </Card>
    </>
  );
}
