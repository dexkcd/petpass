import { redirect } from "next/navigation";
import { getPrimaryMembership, requireRole, type ClinicMembership, type SessionUser } from "@/lib/auth-helpers";

/**
 * For provider pages: the signed-in provider and their clinic. Providers who
 * have not created or joined a clinic yet are sent to onboarding.
 */
export async function requireProviderClinic(callbackUrl: string): Promise<{ user: SessionUser; membership: ClinicMembership }> {
  const user = await requireRole("PROVIDER", callbackUrl);
  const membership = await getPrimaryMembership(user.id);
  if (!membership) redirect("/provider/onboarding");
  return { user, membership };
}

export async function categoryOptions() {
  const { db } = await import("@/lib/db");
  const categories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { parent: { select: { name: true } } },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, parentName: c.parent?.name ?? null }));
}
