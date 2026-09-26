import Link from "next/link";
import { SpeciesIcon } from "@/components/ui/icons";
import { SPECIES_LABELS } from "@/lib/labels";
import type { Species } from "@/generated/prisma/enums";

export function PetAvatar({ species, size = "md" }: { species: Species; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-8", md: "size-12", lg: "size-20" };
  const iconSizes = { sm: "size-4", md: "size-6", lg: "size-10" };
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-teal-50 text-primary ${sizes[size]}`}>
      <SpeciesIcon species={species} className={iconSizes[size]} />
    </span>
  );
}

export function PetCard({
  pet,
  href,
}: {
  pet: { id: string; name: string; species: Species; breed: string | null; birthDate: Date | null };
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary">
      <PetAvatar species={pet.species} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{pet.name}</p>
        <p className="truncate text-sm text-muted">
          {SPECIES_LABELS[pet.species]}
          {pet.breed ? ` · ${pet.breed}` : ""}
          {pet.birthDate ? ` · ${ageLabel(pet.birthDate)}` : ""}
        </p>
      </div>
    </Link>
  );
}

export function ageLabel(birthDate: Date, now: number = new Date().getTime()) {
  const months = Math.max(0, Math.floor((now - new Date(birthDate).getTime()) / (30.44 * 24 * 3600 * 1000)));
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"}`;
}
