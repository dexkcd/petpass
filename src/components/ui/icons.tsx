import {
  Ambulance,
  Bath,
  Bird,
  Brain,
  Brush,
  CalendarDays,
  Cat,
  Clock,
  Dog,
  Droplets,
  Fish,
  FolderTree,
  Footprints,
  Hand,
  HeartPulse,
  Hospital,
  House,
  Microscope,
  PawPrint,
  Rabbit,
  Receipt,
  Salad,
  Scissors,
  Search,
  Siren,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Turtle,
  Users,
  Wind,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { ServiceKind, Species } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/**
 * Icons a service category can use. The key is what is stored in
 * ServiceCategory.icon; admins pick from this list.
 */
export const CATEGORY_ICONS = {
  stethoscope: { label: "Stethoscope", Icon: Stethoscope },
  syringe: { label: "Syringe", Icon: Syringe },
  siren: { label: "Siren", Icon: Siren },
  ambulance: { label: "Ambulance", Icon: Ambulance },
  smile: { label: "Smile (dental)", Icon: Smile },
  hospital: { label: "Hospital", Icon: Hospital },
  microscope: { label: "Microscope", Icon: Microscope },
  "heart-pulse": { label: "Heart pulse", Icon: HeartPulse },
  footprints: { label: "Footprints", Icon: Footprints },
  turtle: { label: "Turtle", Icon: Turtle },
  bird: { label: "Bird", Icon: Bird },
  brain: { label: "Brain", Icon: Brain },
  salad: { label: "Salad", Icon: Salad },
  droplets: { label: "Droplets", Icon: Droplets },
  scissors: { label: "Scissors", Icon: Scissors },
  bath: { label: "Bath", Icon: Bath },
  sparkles: { label: "Sparkles", Icon: Sparkles },
  hand: { label: "Hand", Icon: Hand },
  brush: { label: "Brush", Icon: Brush },
  wind: { label: "Wind", Icon: Wind },
  "paw-print": { label: "Paw print", Icon: PawPrint },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

const KIND_FALLBACK: Record<ServiceKind, LucideIcon> = {
  VET: Stethoscope,
  SPECIALIST: HeartPulse,
  GROOMING: Scissors,
};

function isCategoryIconKey(value: string | null | undefined): value is CategoryIconKey {
  return !!value && value in CATEGORY_ICONS;
}

type IconProps = Omit<LucideProps, "ref">;

/** A service category's icon, falling back to a generic icon for its kind. */
export function CategoryIcon({ icon, kind, className, ...props }: { icon?: string | null; kind?: ServiceKind | string } & IconProps) {
  const Icon = isCategoryIconKey(icon) ? CATEGORY_ICONS[icon].Icon : KIND_FALLBACK[kind as ServiceKind] ?? PawPrint;
  return <Icon aria-hidden className={cn("inline-block size-4 shrink-0", className)} {...props} />;
}

const SPECIES_ICONS: Record<Species, LucideIcon> = {
  DOG: Dog,
  CAT: Cat,
  BIRD: Bird,
  REPTILE: Turtle,
  SMALL_MAMMAL: Rabbit,
  FISH: Fish,
  HORSE: PawPrint,
  OTHER: PawPrint,
};

export function SpeciesIcon({ species, className, ...props }: { species: Species } & IconProps) {
  const Icon = SPECIES_ICONS[species] ?? PawPrint;
  return <Icon aria-hidden className={cn("shrink-0", className)} {...props} />;
}

/** Icons used in dashboard navigation, referenced by key from server layouts. */
export const NAV_ICONS = {
  home: House,
  calendar: CalendarDays,
  paw: PawPrint,
  receipt: Receipt,
  clock: Clock,
  users: Users,
  hospital: Hospital,
  folders: FolderTree,
  search: Search,
} satisfies Record<string, LucideIcon>;

export type NavIconKey = keyof typeof NAV_ICONS;

/** The PetPass logo mark: a paw print in a teal tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground", className)}>
      <PawPrint className="size-5" strokeWidth={2.25} />
    </span>
  );
}
