import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISS Live Event — Real-Time Coverage",
  description:
    "Watch ISS events live including spacewalks (EVAs), spacecraft dockings, reboosts, and crew activities with real-time telemetry data.",
  openGraph: {
    title: "ISS Live Event — Real-Time Coverage",
    description:
      "Watch ISS events live including spacewalks, dockings, and crew activities with real-time telemetry.",
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
