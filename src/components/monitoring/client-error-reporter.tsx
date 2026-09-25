"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

/** Sends uncaught browser errors and promise rejections to the server log. */
export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError({
        kind: "window-error",
        message: event.message || String(event.error),
        stack: event.error instanceof Error ? event.error.stack : undefined,
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError({
        kind: "unhandled-rejection",
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
