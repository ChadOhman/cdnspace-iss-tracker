import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ISS Tracker — Live Dashboard",
    short_name: "ISS Tracker",
    description:
      "Real-time International Space Station tracking dashboard. Live telemetry, crew schedules, and orbital data.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    orientation: "any",
    categories: ["education", "science"],
    icons: [
      {
        src: "/ISS_emblem.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
