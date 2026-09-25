"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError({ kind: "global-boundary", message: error.message, stack: error.stack, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>PetPass hit a problem</h1>
          <p style={{ color: "#64748b" }}>We&apos;ve been notified. Please try again.</p>
          <button onClick={() => retry()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: "#0f766e", color: "#fff", border: 0 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
