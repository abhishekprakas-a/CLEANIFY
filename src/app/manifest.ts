import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/technician",
    name: "Water Tank Cleaning Service",
    short_name: "WTC Field",
    description: "Field technician app for water tank cleaning jobs",
    start_url: "/technician",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0084cd",
    orientation: "portrait",
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "My Jobs",
        url: "/technician/jobs",
        description: "View assigned jobs",
      },
      {
        name: "Attendance",
        url: "/technician/attendance",
        description: "Check in or out",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
