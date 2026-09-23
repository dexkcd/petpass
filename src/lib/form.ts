import type { z } from "zod";
import type { ActionResult, FieldErrors } from "@/lib/action-result";

/**
 * Convert FormData to a plain object. Empty strings become undefined so that
 * optional fields validate as "not provided". Repeated keys become arrays.
 */
export function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    const value = typeof raw === "string" ? (raw.trim() === "" ? undefined : raw) : raw;
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      const arr = (out[k] as unknown[] | undefined) ?? [];
      if (value !== undefined) arr.push(value);
      out[k] = arr;
    } else if (key in out) {
      const existing = out[key];
      out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(formToObject(formData));
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, result: { ok: false, error: "Please fix the highlighted fields", fieldErrors } };
}
