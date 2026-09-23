import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (error) {
    console.error("health check failed", error);
    return NextResponse.json(
      { ok: false, db: "down", time: new Date().toISOString() },
      { status: 503 },
    );
  }
}
