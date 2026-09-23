import { NextResponse, type NextRequest } from "next/server";
import { slotsForService } from "@/lib/booking/service";
import { NotFoundError } from "@/lib/action-result";
import { SlotsQuerySchema } from "@/lib/validation/bookings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const parsed = SlotsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  try {
    const { service, slots } = await slotsForService(parsed.data.serviceId, parsed.data.date, parsed.data.staffId);
    return NextResponse.json({
      timezone: service.clinic.timezone,
      durationMin: service.durationMin,
      slots: slots.map((d) => d.toISOString()),
    });
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
