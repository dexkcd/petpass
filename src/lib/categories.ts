import type { ServiceKind } from "@/generated/prisma/enums";

export type CategorySeed = {
  slug: string;
  name: string;
  kind: ServiceKind;
  parentSlug?: string;
  sortOrder: number;
  icon?: string;
};

/**
 * Canonical service taxonomy. Seeded into ServiceCategory and used for
 * search filters. Admins can add more through the admin UI.
 */
export const CATEGORY_TAXONOMY: CategorySeed[] = [
  // Veterinary
  { slug: "general-vet", name: "General veterinary", kind: "VET", sortOrder: 10, icon: "🩺" },
  { slug: "vaccination", name: "Vaccinations", kind: "VET", sortOrder: 20, icon: "💉" },
  { slug: "emergency", name: "Emergency care", kind: "VET", sortOrder: 30, icon: "🚑" },
  { slug: "dental", name: "Dental", kind: "VET", sortOrder: 40, icon: "🦷" },
  { slug: "surgery", name: "Surgery", kind: "VET", sortOrder: 50, icon: "🏥" },
  { slug: "diagnostics", name: "Diagnostics & imaging", kind: "VET", sortOrder: 60, icon: "🔬" },
  // Specialist / niche
  { slug: "physical-therapy", name: "Physical therapy & rehab", kind: "SPECIALIST", sortOrder: 110, icon: "🏃" },
  { slug: "exotic-reptile", name: "Reptile & exotic care", kind: "SPECIALIST", sortOrder: 120, icon: "🦎" },
  { slug: "avian", name: "Avian (bird) care", kind: "SPECIALIST", sortOrder: 130, icon: "🦜" },
  { slug: "behaviour", name: "Behaviour therapy", kind: "SPECIALIST", sortOrder: 140, icon: "🧠" },
  { slug: "nutrition", name: "Nutrition", kind: "SPECIALIST", sortOrder: 150, icon: "🥗" },
  { slug: "dermatology", name: "Dermatology", kind: "SPECIALIST", sortOrder: 160, icon: "🧴" },
  // Grooming
  { slug: "grooming", name: "Grooming", kind: "GROOMING", sortOrder: 200, icon: "✂️" },
  { slug: "bath", name: "Bath & blow dry", kind: "GROOMING", parentSlug: "grooming", sortOrder: 210, icon: "🛁" },
  { slug: "haircut", name: "Haircut & styling", kind: "GROOMING", parentSlug: "grooming", sortOrder: 220, icon: "💇" },
  { slug: "nail-trim", name: "Nail trim", kind: "GROOMING", parentSlug: "grooming", sortOrder: 230, icon: "💅" },
  { slug: "teeth-cleaning", name: "Teeth cleaning", kind: "GROOMING", parentSlug: "grooming", sortOrder: 240, icon: "🪥" },
  { slug: "deshedding", name: "De-shedding", kind: "GROOMING", parentSlug: "grooming", sortOrder: 250, icon: "🧹" },
];
