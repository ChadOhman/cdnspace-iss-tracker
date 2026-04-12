import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISS Statistics — Orbital Data & History",
  description:
    "ISS mission statistics including orbital history, altitude trends, solar array performance, and station vitals since launch in 1998.",
  openGraph: {
    title: "ISS Statistics — Orbital Data & History",
    description:
      "ISS mission statistics including orbital history, altitude trends, and station vitals.",
  },
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
