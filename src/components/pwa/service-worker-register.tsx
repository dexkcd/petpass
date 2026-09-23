"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds. No-op in development and unsupported browsers. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("service worker registration failed", error);
    });
  }, []);
  return null;
}
