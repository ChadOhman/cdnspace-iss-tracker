import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISS Ground Track — Live Map",
  description:
    "Track the International Space Station in real-time on a world map. See the ISS ground track, pass predictions for your location, and telescope integration.",
  openGraph: {
    title: "ISS Ground Track — Live Map",
    description:
      "Track the International Space Station in real-time on a world map with pass predictions.",
  },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
