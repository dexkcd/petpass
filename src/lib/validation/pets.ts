import { z } from "zod";
import { Sex, Species } from "@/generated/prisma/enums";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalDate = z.coerce.date().optional();

export const PetSchema = z.object({
  name: z.string().trim().min(1, "Give your pet a name").max(60),
  species: z.enum(Species),
  breed: optionalText(80),
  sex: z.enum(Sex).default("UNKNOWN"),
  birthDate: optionalDate,
  weightKg: z.coerce.number().positive().max(2000).optional(),
  color: optionalText(60),
  microchipId: optionalText(40),
  notes: optionalText(2000),
});
export type PetInput = z.infer<typeof PetSchema>;

export const VaccinationSchema = z.object({
  petId: z.string().min(1),
  name: z.string().trim().min(1, "Vaccine name is required").max(120),
  administeredAt: z.coerce.date(),
  expiresAt: optionalDate,
  lotNumber: optionalText(60),
  administeredBy: optionalText(120),
  notes: optionalText(2000),
});

export const MedicationSchema = z.object({
  petId: z.string().min(1),
  name: z.string().trim().min(1, "Medication name is required").max(120),
  dosage: z.string().trim().min(1, "Dosage is required").max(120),
  frequency: z.string().trim().min(1, "Frequency is required").max(120),
  startDate: z.coerce.date(),
  endDate: optionalDate,
  prescribedBy: optionalText(120),
  notes: optionalText(2000),
});

export const ConditionSchema = z.object({
  petId: z.string().min(1),
  name: z.string().trim().min(1, "Condition name is required").max(120),
  diagnosedAt: optionalDate,
  resolvedAt: optionalDate,
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]).optional(),
  notes: optionalText(4000),
});

export const VisitNoteSchema = z.object({
  petId: z.string().min(1),
  bookingId: z.string().optional(),
  clinicId: z.string().optional(),
  visitedAt: z.coerce.date(),
  summary: z.string().trim().min(1, "Summary is required").max(4000),
  diagnosis: optionalText(4000),
  treatment: optionalText(4000),
  followUpAt: optionalDate,
});

export const DocumentMetaSchema = z.object({
  petId: z.string().min(1),
  title: z.string().trim().min(1, "Give the document a title").max(120),
});

export const RecordIdSchema = z.object({
  petId: z.string().min(1),
  id: z.string().min(1),
});

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
