import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://iss.cdnspace.ca"),
  title: "ISS Tracker — Live Dashboard",
  description:
    "Real-time International Space Station tracking dashboard. Live telemetry, crew schedules, and orbital data.",
  openGraph: {
    title: "ISS Tracker — Live Dashboard",
    description:
      "Real-time International Space Station tracking dashboard. Live telemetry, crew schedules, and orbital data.",
    url: "https://iss.cdnspace.ca",
    siteName: "ISS Tracker",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ISS Tracker — Live Dashboard",
    description:
      "Real-time International Space Station tracking dashboard. Live telemetry, crew schedules, and orbital data.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-[#00e5ff] focus:px-3 focus:py-1 focus:text-[#0a0e14] focus:text-xs focus:font-bold"
        >
          Skip to main content
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
