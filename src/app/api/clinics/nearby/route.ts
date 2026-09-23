import { NextResponse, type NextRequest } from "next/server";
import { NearbyQuerySchema, searchNearbyClinics } from "@/lib/clinics/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = NearbyQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  const clinics = await searchNearbyClinics(parsed.data);
  return NextResponse.json({ clinics }, { headers: { "Cache-Control": "public, max-age=30" } });
}
