import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-5xl" aria-hidden>
          🐾
        </p>
        <h1 className="mt-4 text-2xl font-bold">You&apos;re offline</h1>
        <p className="mt-2 text-muted">PetPass needs a connection to load live availability and records. Pages you visited recently may still open.</p>
        <div className="mt-6">
          <ButtonLink href="/">Try again</ButtonLink>
        </div>
      </div>
    </main>
  );
}
