import Link from "next/link";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/snapshot",
    description: "Returns the latest ISS telemetry snapshot including orbital state, telemetry values, solar activity, and active event.",
    response: `{
  "orbital": { "lat": number, "lon": number, "alt": number, "velocity": number, "epoch": number },
  "telemetry": { "o2": number, "co2": number, "pressure": number, "temperature": number, ... },
  "solar": { "kpIndex": number, "xrayFlux": number, "solarWindSpeed": number, ... },
  "activeEvent": ISSEvent | null,
  "visitorCount": number
}`,
  },
  {
    method: "GET",
    path: "/api/telemetry/stream",
    description: "Server-Sent Events (SSE) stream for real-time telemetry. Emits 'telemetry', 'solar', 'event', and 'visitors' events.",
    params: [],
    response: "SSE stream — event: telemetry | solar | event | visitors",
  },
  {
    method: "GET",
    path: "/api/orbit",
    description: "Returns TLE data and computed orbital parameters for the ISS.",
    response: `{
  "tle": { "line1": string, "line2": string, "epoch": number },
  "orbital": OrbitalState
}`,
  },
  {
    method: "GET",
    path: "/api/passes",
    description: "Predicts upcoming ISS passes over a given location.",
    params: [
      { name: "lat", type: "number", required: true, description: "Observer latitude in degrees" },
      { name: "lon", type: "number", required: true, description: "Observer longitude in degrees" },
      { name: "alt", type: "number", required: false, description: "Observer altitude in metres (default 0)" },
      { name: "days", type: "number", required: false, description: "Number of days to predict (default 10, max 30)" },
    ],
    response: `[
  { "risetime": number, "duration": number, "maxElevation": number }
]`,
  },
  {
    method: "GET",
    path: "/api/history",
    description: "Returns historical telemetry records from the database.",
    params: [
      { name: "limit", type: "number", required: false, description: "Max records to return (default 100)" },
      { name: "from", type: "ISO 8601", required: false, description: "Start timestamp" },
      { name: "to", type: "ISO 8601", required: false, description: "End timestamp" },
    ],
    response: "Array of telemetry records",
  },
  {
    method: "GET",
    path: "/api/weather",
    description: "Returns current space weather data including Kp index, solar X-ray flux, and solar wind.",
    response: `{
  "kpIndex": number,
  "xrayFlux": number,
  "solarWindSpeed": number,
  "solarWindDensity": number,
  "updated": string
}`,
  },
  {
    method: "GET",
    path: "/api/events",
    description: "Lists upcoming and past ISS events (EVAs, dockings, etc.).",
    params: [
      { name: "active", type: "boolean", required: false, description: "Filter to active events only" },
    ],
    response: "Array of ISSEvent objects",
  },
  {
    method: "GET",
    path: "/api/admin/events",
    description: "Admin: Lists all events. Requires Authorization: Bearer header.",
    response: "Array of ISSEvent objects (full detail)",
  },
  {
    method: "POST",
    path: "/api/admin/events",
    description: "Admin: Creates a new event. Requires Authorization: Bearer header.",
    params: [
      { name: "type", type: "string", required: true, description: "Event type (EVA, docking, undocking, etc.)" },
      { name: "title", type: "string", required: true, description: "Event title" },
      { name: "description", type: "string", required: false, description: "Event description" },
      { name: "scheduledStart", type: "ISO 8601", required: false, description: "Planned start time (UTC)" },
      { name: "scheduledEnd", type: "ISO 8601", required: false, description: "Planned end time (UTC)" },
    ],
    response: "Created ISSEvent object",
  },
  {
    method: "PUT",
    path: "/api/admin/events/:id",
    description: "Admin: Updates an event. Use isActive to activate/end it. Requires Authorization: Bearer header.",
    params: [
      { name: "isActive", type: "boolean", required: false, description: "Activate or deactivate the event" },
      { name: "title", type: "string", required: false, description: "Update title" },
      { name: "description", type: "string", required: false, description: "Update description" },
    ],
    response: "Updated ISSEvent object",
  },
];

const methodColors: Record<string, string> = {
  GET: "#00e5ff",
  POST: "#00ff88",
  PUT: "#ffd700",
  DELETE: "#ff3d3d",
};

export default function ApiDocsPage() {
  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0a0e14", fontFamily: "monospace", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{
        height: 48,
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(0,229,255,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
      }}>
        <Link href="/" style={{ color: "#00e5ff", textDecoration: "none", fontSize: 11, letterSpacing: "0.05em", border: "1px solid rgba(0,229,255,0.3)", padding: "2px 8px", borderRadius: 3 }}>
          &larr; DASHBOARD
        </Link>
        <span style={{ color: "#00e5ff", fontSize: 13, letterSpacing: "0.1em" }}>ISS TRACKER — API REFERENCE</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ fontSize: 10, color: "#8892a4", letterSpacing: "0.06em", marginBottom: 24 }}>
          Base URL: <span style={{ color: "#00e5ff" }}>https://iss.cdnspace.ca</span> &nbsp;|&nbsp;
          All timestamps in UTC &nbsp;|&nbsp;
          Content-Type: application/json
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {endpoints.map((ep) => (
            <div key={`${ep.method}-${ep.path}`} style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6,
              overflow: "hidden",
            }}>
              {/* Endpoint header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: methodColors[ep.method] ?? "#e2e8f0",
                  letterSpacing: "0.06em",
                  minWidth: 40,
                }}>
                  {ep.method}
                </span>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "monospace" }}>{ep.path}</span>
              </div>

              <div style={{ padding: "12px 16px" }}>
                <p style={{ fontSize: 11, color: "#8892a4", margin: "0 0 10px 0", lineHeight: 1.6 }}>{ep.description}</p>

                {ep.params && ep.params.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: "#00e5ff", letterSpacing: "0.08em", marginBottom: 6 }}>PARAMETERS</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                      <thead>
                        <tr>
                          {["Name", "Type", "Required", "Description"].map((h) => (
                            <th key={h} style={{ textAlign: "left", color: "#4a5568", padding: "3px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 400, letterSpacing: "0.04em", fontSize: 9 }}>{h.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ep.params.map((p) => (
                          <tr key={p.name}>
                            <td style={{ padding: "4px 8px", color: "#00e5ff", fontFamily: "monospace" }}>{p.name}</td>
                            <td style={{ padding: "4px 8px", color: "#8892a4" }}>{p.type}</td>
                            <td style={{ padding: "4px 8px", color: p.required ? "#00ff88" : "#4a5568" }}>{p.required ? "yes" : "no"}</td>
                            <td style={{ padding: "4px 8px", color: "#8892a4" }}>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 9, color: "#00e5ff", letterSpacing: "0.08em", marginBottom: 6 }}>RESPONSE</div>
                  <pre style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 4,
                    padding: "10px 12px",
                    fontSize: 10,
                    color: "#8892a4",
                    overflow: "auto",
                    margin: 0,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}>
                    {ep.response}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
