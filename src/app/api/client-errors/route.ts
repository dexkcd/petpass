import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BODY = 8_000;

/** Receives browser crash reports and writes them to the server log. */
export async function POST(req: NextRequest) {
  const raw = (await req.text()).slice(0, MAX_BODY);
  let report: Record<string, unknown>;
  try {
    report = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    report = { raw };
  }
  console.error(
    "[client-error]",
    JSON.stringify({
      ...report,
      userAgent: req.headers.get("user-agent")?.slice(0, 200),
      receivedAt: new Date().toISOString(),
    }),
  );
  return new NextResponse(null, { status: 204 });
}
