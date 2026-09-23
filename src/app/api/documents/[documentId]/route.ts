import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { requirePetRead } from "@/lib/authz/records";
import { fileExists, openFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ documentId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await ctx.params;
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await requirePetRead(user, doc.petId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await fileExists(doc.fileUrl))) {
    return NextResponse.json({ error: "File missing" }, { status: 410 });
  }

  const stream = Readable.toWeb(openFile(doc.fileUrl)) as ReadableStream;
  const safeName = doc.title.replace(/[^\w.\- ]+/g, "_");
  return new Response(stream, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
