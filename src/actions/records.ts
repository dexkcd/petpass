"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor, type SessionUser } from "@/lib/auth-helpers";
import { requirePetRead, requirePetWrite } from "@/lib/authz/records";
import { parseForm } from "@/lib/form";
import { fail, succeed, toActionError, type ActionResult, ForbiddenError, NotFoundError } from "@/lib/action-result";
import { deleteFile, saveFile } from "@/lib/storage";
import {
  ALLOWED_DOCUMENT_TYPES,
  ConditionSchema,
  DocumentMetaSchema,
  MAX_DOCUMENT_BYTES,
  MedicationSchema,
  VaccinationSchema,
  VisitNoteSchema,
} from "@/lib/validation/pets";

function revalidatePet(petId: string) {
  revalidatePath(`/owner/pets/${petId}`);
  revalidatePath(`/provider/patients/${petId}`);
  revalidatePath("/owner");
}

async function writeContext(actor: SessionUser, petId: string) {
  const access = await requirePetWrite(actor, petId);
  return { clinicId: access.via === "GRANT" ? access.clinicId ?? null : null, createdById: actor.id };
}

/**
 * Owners may delete anything on their pet. Providers may delete only records
 * they created themselves while their grant is active.
 */
async function assertCanDelete(actor: SessionUser, petId: string, record: { createdById: string | null } | null) {
  if (!record) throw new NotFoundError("Record not found");
  const access = await requirePetWrite(actor, petId);
  if (access.via === "OWNER") return;
  if (record.createdById !== actor.id) throw new ForbiddenError("You can only remove records you added");
}

// ---- Vaccinations -----------------------------------------------------------

export async function addVaccinationAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(VaccinationSchema, formData);
  if (!parsed.ok) return parsed.result;
  try {
    const ctx = await writeContext(actor, parsed.data.petId);
    await db.vaccination.create({ data: { ...parsed.data, ...ctx } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(parsed.data.petId);
  return succeed(undefined);
}

export async function deleteVaccinationAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const record = await db.vaccination.findFirst({ where: { id, petId }, select: { createdById: true } });
    await assertCanDelete(actor, petId, record);
    await db.vaccination.delete({ where: { id } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

// ---- Medications ------------------------------------------------------------

export async function addMedicationAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(MedicationSchema, formData);
  if (!parsed.ok) return parsed.result;
  try {
    const ctx = await writeContext(actor, parsed.data.petId);
    const active = !parsed.data.endDate || parsed.data.endDate.getTime() > Date.now();
    await db.medication.create({ data: { ...parsed.data, ...ctx, active } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(parsed.data.petId);
  return succeed(undefined);
}

export async function toggleMedicationAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requirePetWrite(actor, petId);
    const med = await db.medication.findFirst({ where: { id, petId } });
    if (!med) throw new NotFoundError("Medication not found");
    await db.medication.update({
      where: { id },
      data: { active: !med.active, endDate: med.active ? new Date() : null },
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

export async function deleteMedicationAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const record = await db.medication.findFirst({ where: { id, petId }, select: { createdById: true } });
    await assertCanDelete(actor, petId, record);
    await db.medication.delete({ where: { id } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

// ---- Conditions -------------------------------------------------------------

export async function addConditionAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(ConditionSchema, formData);
  if (!parsed.ok) return parsed.result;
  try {
    const ctx = await writeContext(actor, parsed.data.petId);
    await db.condition.create({ data: { ...parsed.data, ...ctx } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(parsed.data.petId);
  return succeed(undefined);
}

export async function resolveConditionAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    await requirePetWrite(actor, petId);
    const c = await db.condition.findFirst({ where: { id, petId } });
    if (!c) throw new NotFoundError("Condition not found");
    await db.condition.update({ where: { id }, data: { resolvedAt: c.resolvedAt ? null : new Date() } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

export async function deleteConditionAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const record = await db.condition.findFirst({ where: { id, petId }, select: { createdById: true } });
    await assertCanDelete(actor, petId, record);
    await db.condition.delete({ where: { id } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

// ---- Visit notes ------------------------------------------------------------

export async function addVisitNoteAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(VisitNoteSchema, formData);
  if (!parsed.ok) return parsed.result;
  const { petId, bookingId, clinicId: requestedClinicId, ...rest } = parsed.data;
  try {
    const access = await requirePetWrite(actor, petId);
    // A visit note always belongs to a clinic: the granting clinic for
    // providers, or a clinic the owner picks (e.g. from a past booking).
    let clinicId = access.via === "GRANT" ? access.clinicId : requestedClinicId;
    if (bookingId) {
      const booking = await db.booking.findFirst({ where: { id: bookingId, petId }, select: { clinicId: true } });
      if (!booking) throw new NotFoundError("Booking not found");
      if (access.via === "GRANT" && booking.clinicId !== clinicId) throw new ForbiddenError("That booking belongs to another clinic");
      clinicId = booking.clinicId;
    }
    if (!clinicId) return fail("Choose the clinic this visit was with", { clinicId: ["Required"] });
    await db.visitNote.create({
      data: { petId, clinicId, authorId: actor.id, bookingId: bookingId ?? null, ...rest },
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  if (bookingId) {
    revalidatePath(`/owner/bookings/${bookingId}`);
    revalidatePath(`/provider/bookings/${bookingId}`);
  }
  return succeed(undefined);
}

export async function deleteVisitNoteAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const note = await db.visitNote.findFirst({ where: { id, petId }, select: { authorId: true } });
    await assertCanDelete(actor, petId, note ? { createdById: note.authorId } : null);
    await db.visitNote.delete({ where: { id } });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

// ---- Documents --------------------------------------------------------------

export async function uploadDocumentAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  const parsed = parseForm(DocumentMetaSchema, formData);
  if (!parsed.ok) return parsed.result;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload", { file: ["Required"] });
  if (file.size > MAX_DOCUMENT_BYTES) return fail("Files must be 10 MB or smaller", { file: ["Too large"] });
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return fail("Upload a PDF or image (JPEG, PNG, WebP, HEIC)", { file: ["Unsupported type"] });

  try {
    const ctx = await writeContext(actor, parsed.data.petId);
    const key = await saveFile(new Uint8Array(await file.arrayBuffer()), file.name, `pets/${parsed.data.petId}`);
    await db.document.create({
      data: {
        petId: parsed.data.petId,
        title: parsed.data.title,
        fileUrl: key,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedById: actor.id,
        clinicId: ctx.clinicId,
      },
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(parsed.data.petId);
  return succeed(undefined);
}

export async function deleteDocumentAction(petId: string, id: string): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const doc = await db.document.findFirst({ where: { id, petId } });
    await assertCanDelete(actor, petId, doc ? { createdById: doc.uploadedById } : null);
    await db.document.delete({ where: { id } });
    if (doc) await deleteFile(doc.fileUrl);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePet(petId);
  return succeed(undefined);
}

/** Read check used by the document download route. */
export async function canReadDocument(actor: SessionUser, documentId: string) {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  try {
    await requirePetRead(actor, doc.petId);
  } catch {
    return null;
  }
  return doc;
}
