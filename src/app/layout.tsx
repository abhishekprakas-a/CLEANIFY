import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import { Toaster } from "@/components/ui/toaster";
import { DialogProvider } from "@/components/ui/dialog";
import { InstallPrompt } from "@/components/pwa/installPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: env.appName,
  description: "Water Tank Cleaning Service Management System",
  manifest: "/manifest.webmanifest",
  // Favicon comes from src/app/icon.svg (file-based metadata). The PWA/app
  // icon is defined in manifest.ts.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: env.appName,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2a30",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DialogProvider>{children}</DialogProvider>
        <Toaster />
        <InstallPrompt />
      </body>
    </html>
  );
}
