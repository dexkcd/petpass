import type { ServiceKind } from "@/generated/prisma/enums";
import type { CategoryIconKey } from "@/components/ui/icons";

export type CategorySeed = {
  slug: string;
  name: string;
  kind: ServiceKind;
  parentSlug?: string;
  sortOrder: number;
  icon?: CategoryIconKey;
};

/**
 * Canonical service taxonomy. Seeded into ServiceCategory and used for
 * search filters. Admins can add more through the admin UI.
 */
export const CATEGORY_TAXONOMY: CategorySeed[] = [
  // Veterinary
  { slug: "general-vet", name: "General veterinary", kind: "VET", sortOrder: 10, icon: "stethoscope" },
  { slug: "vaccination", name: "Vaccinations", kind: "VET", sortOrder: 20, icon: "syringe" },
  { slug: "emergency", name: "Emergency care", kind: "VET", sortOrder: 30, icon: "siren" },
  { slug: "dental", name: "Dental", kind: "VET", sortOrder: 40, icon: "smile" },
  { slug: "surgery", name: "Surgery", kind: "VET", sortOrder: 50, icon: "hospital" },
  { slug: "diagnostics", name: "Diagnostics & imaging", kind: "VET", sortOrder: 60, icon: "microscope" },
  // Specialist / niche
  { slug: "physical-therapy", name: "Physical therapy & rehab", kind: "SPECIALIST", sortOrder: 110, icon: "footprints" },
  { slug: "exotic-reptile", name: "Reptile & exotic care", kind: "SPECIALIST", sortOrder: 120, icon: "turtle" },
  { slug: "avian", name: "Avian (bird) care", kind: "SPECIALIST", sortOrder: 130, icon: "bird" },
  { slug: "behaviour", name: "Behaviour therapy", kind: "SPECIALIST", sortOrder: 140, icon: "brain" },
  { slug: "nutrition", name: "Nutrition", kind: "SPECIALIST", sortOrder: 150, icon: "salad" },
  { slug: "dermatology", name: "Dermatology", kind: "SPECIALIST", sortOrder: 160, icon: "droplets" },
  // Grooming
  { slug: "grooming", name: "Grooming", kind: "GROOMING", sortOrder: 200, icon: "scissors" },
  { slug: "bath", name: "Bath & blow dry", kind: "GROOMING", parentSlug: "grooming", sortOrder: 210, icon: "bath" },
  { slug: "haircut", name: "Haircut & styling", kind: "GROOMING", parentSlug: "grooming", sortOrder: 220, icon: "scissors" },
  { slug: "nail-trim", name: "Nail trim", kind: "GROOMING", parentSlug: "grooming", sortOrder: 230, icon: "hand" },
  { slug: "teeth-cleaning", name: "Teeth cleaning", kind: "GROOMING", parentSlug: "grooming", sortOrder: 240, icon: "brush" },
  { slug: "deshedding", name: "De-shedding", kind: "GROOMING", parentSlug: "grooming", sortOrder: 250, icon: "wind" },
];
