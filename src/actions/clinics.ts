"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPrimaryMembership, requireActor, requireMembership } from "@/lib/auth-helpers";
import { parseForm } from "@/lib/form";
import { formatAddress, geocodeAddress } from "@/lib/geo/geocode";
import { fail, succeed, toActionError, type ActionResult, ForbiddenError } from "@/lib/action-result";
import { slugify } from "@/lib/utils";
import { ClinicSchema, type ClinicInput } from "@/lib/validation/clinics";

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "clinic";
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const existing = await db.clinic.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Resolve coordinates: geocode the address, else use what Places gave the browser. */
async function resolveLocation(input: ClinicInput, previous?: { lat: number; lng: number; placeId: string | null }) {
  const geocoded = await geocodeAddress(formatAddress(input));
  if (geocoded) return { lat: geocoded.lat, lng: geocoded.lng, placeId: geocoded.placeId ?? input.placeId ?? null };
  if (input.lat !== undefined && input.lng !== undefined) return { lat: input.lat, lng: input.lng, placeId: input.placeId ?? null };
  if (previous) return previous;
  return null;
}

function clinicData(input: ClinicInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city,
    region: input.region ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country,
    timezone: input.timezone,
  };
}

export async function createClinicAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "PROVIDER" && actor.role !== "ADMIN") return fail("Only provider accounts can register a clinic");
  if (await getPrimaryMembership(actor.id)) return fail("You already belong to a clinic");

  const parsed = parseForm(ClinicSchema, formData);
  if (!parsed.ok) return parsed.result;

  const location = await resolveLocation(parsed.data);
  if (!location) {
    return fail("We couldn't locate that address. Pick it from the suggestions or check the details.", {
      addressLine1: ["Address not found"],
    });
  }

  const slug = await uniqueSlug(parsed.data.name);
  const clinic = await db.clinic.create({
    data: {
      ...clinicData(parsed.data),
      ...location,
      slug,
      memberships: { create: { userId: actor.id, role: "CLINIC_OWNER", title: "Owner" } },
    },
  });
  revalidatePath("/provider");
  revalidatePath("/admin/clinics");
  redirect(`/provider?welcome=${clinic.id}`);
}

export async function updateClinicAction(
  clinicId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireActor();
  try {
    const m = await requireMembership(actor, clinicId);
    if (m.role !== "CLINIC_OWNER") throw new ForbiddenError("Only the clinic owner can edit the profile");
  } catch (e) {
    return toActionError(e);
  }
  const parsed = parseForm(ClinicSchema, formData);
  if (!parsed.ok) return parsed.result;

  const current = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!current) return fail("Clinic not found");

  const addressChanged =
    formatAddress(parsed.data) !== formatAddress(current) || parsed.data.placeId !== (current.placeId ?? undefined);
  const location = addressChanged
    ? await resolveLocation(parsed.data, { lat: current.lat, lng: current.lng, placeId: current.placeId })
    : { lat: current.lat, lng: current.lng, placeId: current.placeId };
  if (!location) return fail("We couldn't locate that address.", { addressLine1: ["Address not found"] });

  await db.clinic.update({ where: { id: clinicId }, data: { ...clinicData(parsed.data), ...location } });
  revalidatePath("/provider/clinic");
  revalidatePath(`/clinics/${current.slug}`);
  revalidatePath("/search");
  return succeed(undefined);
}
