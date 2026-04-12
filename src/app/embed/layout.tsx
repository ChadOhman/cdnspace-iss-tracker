import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISS Tracker — Embeddable Widget",
  description: "Embeddable real-time ISS tracking widget.",
  robots: "noindex",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
