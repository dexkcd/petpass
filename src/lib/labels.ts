import type { Sex, Species, ServiceMode, ServiceKind } from "@/generated/prisma/enums";

export const SPECIES_LABELS: Record<Species, string> = {
  DOG: "Dog",
  CAT: "Cat",
  BIRD: "Bird",
  REPTILE: "Reptile",
  SMALL_MAMMAL: "Small mammal",
  FISH: "Fish",
  HORSE: "Horse",
  OTHER: "Other",
};

export const SEX_LABELS: Record<Sex, string> = {
  MALE: "Male",
  FEMALE: "Female",
  UNKNOWN: "Unknown",
};

export const MODE_LABELS: Record<ServiceMode, string> = {
  ONLINE: "Online video",
  IN_PERSON: "At the clinic",
  HOME_VISIT: "Home visit",
};

export const KIND_LABELS: Record<ServiceKind, string> = {
  VET: "Veterinary",
  SPECIALIST: "Specialist",
  GROOMING: "Grooming",
};

export const SPECIES_OPTIONS = Object.entries(SPECIES_LABELS) as Array<[Species, string]>;

export function toDateInput(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}
