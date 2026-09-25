export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const DEFAULT_CURRENCY = "PHP";
export const APP_LOCALE = "en-PH";

export function formatMoney(cents: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(APP_LOCALE, { style: "currency", currency }).format(cents / 100);
}

export function formatDate(date: Date | string, timeZone?: string) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string, timeZone?: string) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(date));
}

export function formatTime(date: Date | string, timeZone?: string) {
  return new Intl.DateTimeFormat(APP_LOCALE, { timeStyle: "short", timeZone }).format(new Date(date));
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isValidTimeZone(tz: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
