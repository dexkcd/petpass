"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth-helpers";
import { requirePetOwner } from "@/lib/authz/records";
import { parseForm } from "@/lib/form";
import { toActionError, type ActionResult } from "@/lib/action-result";
import { PetSchema } from "@/lib/validation/pets";

export async function createPetAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(PetSchema, formData);
  if (!parsed.ok) return parsed.result;

  const pet = await db.pet.create({ data: { ...parsed.data, ownerId: actor.id } });
  revalidatePath("/owner");
  revalidatePath("/owner/pets");
  redirect(`/owner/pets/${pet.id}`);
}

export async function updatePetAction(
  petId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requirePetOwner(actor, petId);
  } catch (e) {
    return toActionError(e);
  }
  const parsed = parseForm(PetSchema, formData);
  if (!parsed.ok) return parsed.result;

  await db.pet.update({
    where: { id: petId },
    data: {
      ...parsed.data,
      // explicit nulls so cleared optional fields are removed
      breed: parsed.data.breed ?? null,
      birthDate: parsed.data.birthDate ?? null,
      weightKg: parsed.data.weightKg ?? null,
      color: parsed.data.color ?? null,
      microchipId: parsed.data.microchipId ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  revalidatePath("/owner/pets");
  revalidatePath(`/owner/pets/${petId}`);
  redirect(`/owner/pets/${petId}`);
}

export async function deletePetAction(petId: string): Promise<void> {
  const actor = await requireActor();
  await requirePetOwner(actor, petId);
  await db.pet.update({ where: { id: petId }, data: { deletedAt: new Date() } });
  revalidatePath("/owner");
  revalidatePath("/owner/pets");
  redirect("/owner/pets");
}
