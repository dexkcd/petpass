import type { Metadata } from "next";
import { PetCard } from "@/components/pets/pet-card";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireProviderClinic } from "@/lib/provider";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage() {
  const { membership } = await requireProviderClinic("/provider/patients");
  const now = new Date();
  const grants = await db.recordAccessGrant.findMany({
    where: { clinicId: membership.clinicId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], pet: { deletedAt: null } },
    include: { pet: { include: { owner: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const seen = new Set<string>();
  const pets = grants.filter((g) => (seen.has(g.petId) ? false : (seen.add(g.petId), true)));
  return (
    <>
      <PageHeader title="Patients" description="Pets whose owners have shared their health record with your clinic." />
      {pets.length === 0 ? (
        <EmptyState title="No shared records yet" description="Owners can share a pet's record with you from their booking page or the pet's sharing settings." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pets.map((g) => (
            <div key={g.id}>
              <PetCard pet={g.pet} href={`/provider/patients/${g.pet.id}`} />
              <p className="mt-1 px-1 text-xs text-muted">
                Owner: {g.pet.owner.name ?? "—"} · {g.scope === "READ_WRITE" ? "view & add" : "view only"}
                {g.expiresAt ? ` · until ${formatDate(g.expiresAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
