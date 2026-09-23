import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PetPass",
    short_name: "PetPass",
    description: "Pet health records, vet consultations, specialists and grooming in one app.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find a vet", url: "/search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My bookings", url: "/owner/bookings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
