"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** Wraps children in the Google Maps loader when a browser key is configured. */
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!MAPS_API_KEY) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places", "marker"]}>
      {children}
    </APIProvider>
  );
}
