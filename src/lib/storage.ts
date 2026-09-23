import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Minimal file storage abstraction. The default implementation writes to
 * UPLOADS_DIR on local disk (a Railway volume in production). Swap this
 * module for S3/R2 without touching callers.
 */
function root() {
  return path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
}

function safeKey(key: string) {
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) throw new Error("Invalid storage key");
  return normalized;
}

export async function saveFile(bytes: Uint8Array, originalName: string, prefix: string) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);
  const key = path.posix.join(prefix, `${randomUUID()}${ext}`);
  const target = path.join(root(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return key;
}

export async function fileExists(key: string) {
  try {
    await stat(path.join(root(), safeKey(key)));
    return true;
  } catch {
    return false;
  }
}

export function openFile(key: string) {
  return createReadStream(path.join(root(), safeKey(key)));
}

export async function deleteFile(key: string) {
  try {
    await unlink(path.join(root(), safeKey(key)));
  } catch {
    // already gone
  }
}
