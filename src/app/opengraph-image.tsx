import { ImageResponse } from "next/og";

export const alt = "ISS Tracker — Live Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const runtime = "nodejs";

export default async function OgImage() {
  // Fetch live orbital data for the card
  let altitude = "~408";
  let speed = "~27,600";
  let lat = "—";
  let lon = "—";
  let crewCount = "7";
  let vehicles = "4";

  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/orbit`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.altitude) altitude = Math.round(data.altitude).toString();
      if (data.speedKmH) speed = Math.round(data.speedKmH).toLocaleString();
      if (data.lat != null) lat = `${data.lat >= 0 ? "+" : ""}${data.lat.toFixed(1)}°`;
      if (data.lon != null) lon = `${data.lon >= 0 ? "+" : ""}${data.lon.toFixed(1)}°`;
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0e14 0%, #0f1621 50%, #111820 100%)",
          padding: "48px 56px",
          fontFamily: "monospace",
          color: "#e8f0fe",
        }}
      >
        {/* Top section */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 48,
              display: "flex",
            }}
          >
            🛰️
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#00e5ff",
                letterSpacing: "-0.02em",
              }}
            >
              ISS Tracker
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#94adc4",
                letterSpacing: "0.05em",
              }}
            >
              LIVE DASHBOARD — iss.cdnspace.ca
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <StatBox label="ALTITUDE" value={`${altitude} km`} color="#00e5ff" />
          <StatBox label="SPEED" value={`${speed} km/h`} color="#00e5ff" />
          <StatBox label="LATITUDE" value={lat} color="#e8f0fe" />
          <StatBox label="LONGITUDE" value={lon} color="#e8f0fe" />
          <StatBox label="CREW" value={crewCount} color="#00ff88" />
          <StatBox label="VEHICLES" value={vehicles} color="#ff8c00" />
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#94adc4",
              letterSpacing: "0.05em",
            }}
          >
            Real-time telemetry · Crew schedules · Orbital data
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#00e5ff",
              letterSpacing: "0.05em",
            }}
          >
            Canadian Space
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(0,229,255,0.12)",
        borderRadius: 8,
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#94adc4",
          letterSpacing: "0.1em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
