"use client";

import { PawPrint } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError({ kind: "react-boundary", message: error.message, stack: error.stack, digest: error.digest });
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <PawPrint aria-hidden className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Something went wrong on this page</h1>
        <p className="mt-2 text-muted">We&apos;ve been notified. You can try again, or go back to the home page.</p>
        {error.digest ? <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p> : null}
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => retry()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
