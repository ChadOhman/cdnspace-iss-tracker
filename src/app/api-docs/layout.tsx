import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISS Tracker API — Documentation",
  description:
    "Public API documentation for the ISS Tracker. Access real-time orbital data, telemetry, crew information, pass predictions, and space weather data.",
  openGraph: {
    title: "ISS Tracker API — Documentation",
    description:
      "Public API for real-time ISS orbital data, telemetry, crew information, and pass predictions.",
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
