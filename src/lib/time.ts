import { TZDate } from "@date-fns/tz";
import { addDays, endOfDay, startOfDay } from "date-fns";

/** Start and end (inclusive) of "today" in the given IANA time zone, as UTC instants. */
export function localDayBounds(timeZone: string, at: Date = new Date()) {
  const local = new TZDate(at.getTime(), timeZone);
  return { start: new Date(startOfDay(local).getTime()), end: new Date(endOfDay(local).getTime()) };
}

/** Midnight (local) of the given YYYY-MM-DD in a time zone, as a UTC instant. */
export function localDateStart(dateISO: string, timeZone: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, 0, 0, 0, 0, timeZone).getTime());
}

/** Local wall-clock time (minutes after local midnight) on a date, as a UTC instant. DST-safe per boundary. */
export function localMinutesToUtc(dateISO: string, minutes: number, timeZone: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return new Date(new TZDate(y, m - 1, d, h, min, 0, 0, timeZone).getTime());
}

/** The local calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function toLocalDateISO(at: Date, timeZone: string) {
  const local = new TZDate(at.getTime(), timeZone);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD date. */
export function weekdayOf(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysISO(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const next = addDays(new Date(Date.UTC(y, m - 1, d)), days);
  return next.toISOString().slice(0, 10);
}

/** Convert a local "YYYY-MM-DDTHH:mm" (datetime-local input) in a time zone to a UTC instant. */
export function localInputToUtc(value: string, timeZone: string) {
  const [date, time] = value.split("T");
  const [h, min] = (time ?? "00:00").split(":").map(Number);
  return localMinutesToUtc(date, h * 60 + min, timeZone);
}

export function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
