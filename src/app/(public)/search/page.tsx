import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/search/results-list";
import { SearchControls } from "@/components/search/search-controls";
import { EmptyState } from "@/components/ui/card";
import { DEFAULT_CENTER, NearbyQuerySchema, searchNearbyClinics } from "@/lib/clinics/search";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Find a vet, groomer or specialist" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const hasLocation = Boolean(sp.lat && sp.lng);
  const parsed = NearbyQuerySchema.safeParse({
    ...sp,
    lat: sp.lat ?? DEFAULT_CENTER.lat,
    lng: sp.lng ?? DEFAULT_CENTER.lng,
  });
  const query = parsed.success ? parsed.data : { ...DEFAULT_CENTER, radiusKm: 25 };

  const [clinics, categories] = await Promise.all([
    searchNearbyClinics(query),
    db.serviceCategory.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, icon: true, kind: true } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Find care near you</h1>
      <p className="mb-4 text-sm text-muted">
        {sp.place ? `Near ${sp.place}` : hasLocation ? "Near your location" : "Vets, groomers and specialists"} · {clinics.length} result{clinics.length === 1 ? "" : "s"}
      </p>
      <div className="mb-6">
        <Suspense>
          <SearchControls categories={categories} hasLocation={hasLocation} />
        </Suspense>
      </div>
      {clinics.length === 0 ? (
        <EmptyState title="No clinics match" description="Try a wider radius, a different category, or another location." />
      ) : (
        <SearchResults clinics={clinics} center={{ lat: query.lat, lng: query.lng }} />
      )}
    </main>
  );
}
