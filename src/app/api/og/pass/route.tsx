import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const time = searchParams.get("time") ?? "";
  const elev = searchParams.get("elev") ?? "—";
  const quality = searchParams.get("quality") ?? "good";
  const duration = searchParams.get("dur") ?? "—";
  const location = searchParams.get("loc") ?? "";

  const date = time ? new Date(parseInt(time, 10)) : null;
  const dateStr = date
    ? date.toLocaleDateString("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "Upcoming";
  const timeStr = date
    ? date.toLocaleTimeString("en-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      })
    : "";

  const qualityColor: Record<string, string> = {
    bright: "#00ff88",
    good: "#00e5ff",
    fair: "#ff8c00",
    poor: "#94adc4",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0a0e14 0%, #0f1621 50%, #111820 100%)",
          padding: "48px 56px",
          fontFamily: "monospace",
          color: "#e8f0fe",
        }}
      >
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 48, display: "flex" }}>🛰️</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#00e5ff",
              }}
            >
              ISS Pass Alert
            </div>
            <div style={{ fontSize: 16, color: "#94adc4" }}>
              {location || "Your Location"}
            </div>
          </div>
        </div>

        {/* Pass details */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 32px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(0,229,255,0.12)",
              borderRadius: 8,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#94adc4",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              DATE
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#ff8c00" }}>
              {dateStr}
            </div>
            {timeStr && (
              <div
                style={{ fontSize: 28, fontWeight: 700, color: "#e8f0fe", marginTop: 4 }}
              >
                {timeStr}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 24px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(0,229,255,0.12)",
                borderRadius: 8,
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
                MAX ELEVATION
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#00e5ff" }}>
                {elev}°
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,229,255,0.12)",
                  borderRadius: 8,
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
                  DURATION
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#e8f0fe" }}
                >
                  {duration} min
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,229,255,0.12)",
                  borderRadius: 8,
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
                  VISIBILITY
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: qualityColor[quality] ?? "#94adc4",
                    textTransform: "uppercase",
                  }}
                >
                  {quality}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: 14, color: "#94adc4" }}>
            Track the ISS live at iss.cdnspace.ca
          </div>
          <div style={{ fontSize: 14, color: "#00e5ff" }}>Canadian Space</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
