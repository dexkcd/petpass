import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ServiceMode, Species } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { boundingBox } from "@/lib/geo/haversine";

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(200).default(25),
  category: z.string().trim().min(1).optional(),
  species: z.enum(Species).optional(),
  mode: z.enum(ServiceMode).optional(),
  q: z.string().trim().min(1).max(80).optional(),
});
export type NearbyQuery = z.infer<typeof NearbyQuerySchema>;

export type NearbyClinic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  addressLine1: string;
  city: string;
  postalCode: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  serviceCount: number;
  kinds: string[];
};

/**
 * Verified clinics within `radiusKm` of a point, nearest first. Uses a
 * bounding box on the indexed (lat, lng) columns before the exact Haversine.
 * Optional filters match clinics that have at least one active service in
 * the category (or its children), for the species, in the delivery mode.
 */
export async function searchNearbyClinics(query: NearbyQuery): Promise<NearbyClinic[]> {
  const { lat, lng, radiusKm, category, species, mode, q } = query;
  const box = boundingBox({ lat, lng }, radiusKm);

  const serviceFilters: Prisma.Sql[] = [Prisma.sql`s."active" = true`];
  if (category) {
    serviceFilters.push(
      Prisma.sql`s."categoryId" IN (
        SELECT c1."id" FROM "ServiceCategory" c1
        LEFT JOIN "ServiceCategory" c2 ON c1."parentId" = c2."id"
        WHERE c1."slug" = ${category} OR c2."slug" = ${category}
      )`,
    );
  }
  if (species) {
    serviceFilters.push(Prisma.sql`(cardinality(s."species") = 0 OR ${species}::"Species" = ANY(s."species"))`);
  }
  if (mode) {
    serviceFilters.push(Prisma.sql`s."mode" = ${mode}::"ServiceMode"`);
  }
  const hasServiceFilter = Boolean(category || species || mode);
  const serviceWhere = Prisma.join(serviceFilters, " AND ");

  const rows = await db.$queryRaw<Array<Omit<NearbyClinic, "serviceCount" | "kinds"> & { serviceCount: number; kinds: string[] }>>`
    SELECT
      c."id", c."slug", c."name", c."description", c."addressLine1", c."city", c."postalCode", c."lat", c."lng",
      (2 * 6371 * asin(sqrt(
        power(sin(radians(c."lat" - ${lat}) / 2), 2) +
        cos(radians(${lat})) * cos(radians(c."lat")) * power(sin(radians(c."lng" - ${lng}) / 2), 2)
      ))) AS "distanceKm",
      (SELECT count(*)::int FROM "Service" s WHERE s."clinicId" = c."id" AND s."active" = true) AS "serviceCount",
      COALESCE((
        SELECT array_agg(DISTINCT sc."kind"::text) FROM "Service" s
        JOIN "ServiceCategory" sc ON sc."id" = s."categoryId"
        WHERE s."clinicId" = c."id" AND s."active" = true
      ), ARRAY[]::text[]) AS "kinds"
    FROM "Clinic" c
    WHERE c."status" = 'VERIFIED'
      AND c."lat" BETWEEN ${box.minLat} AND ${box.maxLat}
      AND c."lng" BETWEEN ${box.minLng} AND ${box.maxLng}
      ${hasServiceFilter ? Prisma.sql`AND EXISTS (SELECT 1 FROM "Service" s WHERE s."clinicId" = c."id" AND ${serviceWhere})` : Prisma.empty}
      ${q ? Prisma.sql`AND (c."name" ILIKE ${"%" + q + "%"} OR c."description" ILIKE ${"%" + q + "%"})` : Prisma.empty}
    ORDER BY "distanceKm" ASC
    LIMIT 50
  `;

  return rows
    .filter((r) => r.distanceKm <= radiusKm)
    .map((r) => ({ ...r, distanceKm: Number(r.distanceKm), serviceCount: Number(r.serviceCount) }));
}

/** Default map centre when the visitor has not shared a location (central London). */
export const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
