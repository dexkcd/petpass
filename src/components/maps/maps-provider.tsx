"use client";

import { APIProvider, APIProviderContext } from "@vis.gl/react-google-maps";
import { useContext, type ReactNode } from "react";

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Map ID for vector maps and Advanced Markers. Create one in Google Cloud
 * (Map Management) and set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID; Google's
 * DEMO_MAP_ID works for development.
 */
export const MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/**
 * Wraps children in the Google Maps loader when a browser key is configured.
 * Nested providers are collapsed so a page never initialises the API twice.
 */
export function MapsProvider({ children }: { children: ReactNode }) {
  const parent = useContext(APIProviderContext);
  if (!MAPS_API_KEY || parent) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places", "marker"]}>
      {children}
    </APIProvider>
  );
}
