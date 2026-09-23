import Link from "next/link";
import { SPECIES_EMOJI, SPECIES_LABELS } from "@/lib/labels";
import type { Species } from "@/generated/prisma/enums";

export function PetAvatar({ species, size = "md" }: { species: Species; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-lg", md: "h-12 w-12 text-2xl", lg: "h-20 w-20 text-4xl" };
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-teal-50 ${sizes[size]}`}>
      {SPECIES_EMOJI[species]}
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
