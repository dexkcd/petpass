import type { Metadata } from "next";
import { PetCard } from "@/components/pets/pet-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "My pets" };

export default async function PetsPage() {
  const user = await requireUser("/owner/pets");
  const pets = await db.pet.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="My pets" description="Each pet has its own health record you control." actions={<ButtonLink href="/owner/pets/new">Add a pet</ButtonLink>} />
      {pets.length === 0 ? (
        <EmptyState title="No pets yet" description="Add your first pet to start their health record." action={<ButtonLink href="/owner/pets/new">Add a pet</ButtonLink>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} href={`/owner/pets/${pet.id}`} />
          ))}
        </div>
      )}
    </>
  );
}
