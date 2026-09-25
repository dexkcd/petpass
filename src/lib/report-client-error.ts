/**
 * Browser-side crash reporting. Errors are sent to /api/client-errors, which
 * writes them to the server log (visible in Railway's deploy logs).
 */

const sent = new Set<string>();
const MAX_PER_PAGE = 10;

export type ClientErrorPayload = {
  kind: "window-error" | "unhandled-rejection" | "react-boundary" | "global-boundary" | "map-boundary";
  message: string;
  stack?: string;
  source?: string;
  digest?: string;
};

/** Browser extensions inject scripts into every page; their errors are not ours. */
export function isExtensionNoise(text: string | undefined) {
  if (!text) return false;
  return /(chrome|moz|safari(-web)?)-extension:\/\/|Extension context invalidated|content\.js/.test(text);
}

export function reportClientError(payload: ClientErrorPayload) {
  try {
    if (isExtensionNoise(payload.source) || isExtensionNoise(payload.stack) || isExtensionNoise(payload.message)) return;
    const key = `${payload.kind}:${payload.message}`;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);
    const body = JSON.stringify({
      ...payload,
      message: payload.message.slice(0, 500),
      stack: payload.stack?.slice(0, 3000),
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    if (navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/client-errors", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // never let reporting throw
  }
}
