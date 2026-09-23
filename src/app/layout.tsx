import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PetPass",
    template: "%s · PetPass",
  },
  description:
    "Book online vet consultations, find nearby clinics, groomers and specialists, and share your pet's health history securely.",
  applicationName: "PetPass",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PetPass",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
