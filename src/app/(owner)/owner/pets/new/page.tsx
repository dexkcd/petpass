import type { Metadata } from "next";
import { createPetAction } from "@/actions/pets";
import { PetForm } from "@/components/pets/pet-form";
import { Card, PageHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Add a pet" };

export default function NewPetPage() {
  return (
    <>
      <PageHeader title="Add a pet" />
      <Card>
        <PetForm action={createPetAction} submitLabel="Add pet" cancelHref="/owner/pets" />
      </Card>
    </>
  );
}
