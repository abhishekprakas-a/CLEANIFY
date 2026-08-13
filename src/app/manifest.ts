import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/technician",
    name: "Cleanify",
    short_name: "Cleanify",
    description: "Cleanify field technician app — cleaning jobs & attendance",
    start_url: "/technician",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f2a30",
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
        src: "/brand/cleanify-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/cleanify-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
