"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useBuildCheck } from "@/hooks/useBuildCheck";

interface EventForm {
  type: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
}

interface ISSEvent {
  id: number;
  type: string;
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isActive: boolean;
}

const EVENT_TYPES = ["EVA", "docking", "berthing", "undocking", "launch", "landing", "crew", "experiment", "maintenance", "other"];

const emptyForm: EventForm = {
  type: "EVA",
  title: "",
  description: "",
  scheduledStart: "",
  scheduledEnd: "",
};

export default function AdminPage() {
  useBuildCheck([]);
  const { t } = useLocale();
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [events, setEvents] = useState<ISSEvent[]>([]);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pageViews, setPageViews] = useState<number | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ISSEvent[];
      setEvents(Array.isArray(data) ? data : []);
      setAuthed(true);
      // Load site stats alongside events
      loadStats();
    } catch (e) {
      showStatus(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function insertTestReboost() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/test-reboost", {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { eventId?: string };
      showStatus(`Test reboost inserted: ${data.eventId ?? "ok"}`);
      await loadEvents();
    } catch (e) {
      showStatus(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/stats", { headers });
      if (!res.ok) return;
      const data = await res.json() as { pageViews?: number };
      if (typeof data.pageViews === "number") {
        setPageViews(data.pageViews);
      }
    } catch {
      // non-fatal
    }
  }

  async function createEvent() {
    if (!form.title.trim()) { showStatus(t("pages.titleRequired")); return; }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        scheduledStart: form.scheduledStart || undefined,
        scheduledEnd: form.scheduledEnd || undefined,
      };
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showStatus(t("pages.eventCreated"));
      setForm(emptyForm);
      await loadEvents();
    } catch (e) {
      showStatus(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function setEventActive(id: number, isActive: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showStatus(isActive ? t("pages.eventActivated") : t("pages.eventEnded"));
      await loadEvents();
    } catch (e) {
      showStatus(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 4,
    color: "#e2e8f0",
    fontSize: 11,
    padding: "5px 8px",
    fontFamily: "var(--font-jetbrains-mono)",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color: "#8892a4",
    letterSpacing: "0.08em",
    marginBottom: 3,
    display: "block",
  };

  const btnStyle = (variant: "primary" | "secondary" | "danger"): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: 3,
    border: variant === "primary" ? "1px solid rgba(0,229,255,0.4)" : "1px solid rgba(255,255,255,0.12)",
    background: variant === "primary" ? "rgba(0,229,255,0.12)" : variant === "danger" ? "rgba(255,61,61,0.12)" : "transparent",
    color: variant === "primary" ? "#00e5ff" : variant === "danger" ? "#ff3d3d" : "#8892a4",
    cursor: "pointer",
    fontSize: 10,
    fontFamily: "var(--font-jetbrains-mono)",
    letterSpacing: "0.06em",
  });

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#0a0e14", fontFamily: "var(--font-jetbrains-mono)", color: "#e2e8f0" }}>
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
          &larr; {t("pages.dashboard")}
        </Link>
        <span style={{ color: "#00e5ff", fontSize: 13, letterSpacing: "0.1em" }}>{t("pages.adminPanel")}</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Auth section */}
        <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "16px" }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 12 }}>{t("pages.authentication")}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("pages.adminToken")}</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter admin token..."
                style={inputStyle}
                onKeyDown={(e) => e.key === "Enter" && loadEvents()}
              />
            </div>
            <button onClick={loadEvents} disabled={loading || !token} style={btnStyle("primary")}>
              {loading ? "..." : t("pages.connect")}
            </button>
          </div>
          {authed && <div style={{ fontSize: 9, color: "#00ff88", marginTop: 6 }}>{t("pages.authenticated")}</div>}
        </div>

        {statusMsg && (
          <div style={{ padding: "8px 12px", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 4, fontSize: 10, color: "#00e5ff" }}>
            {statusMsg}
          </div>
        )}

        {authed && (
          <>
            {/* Site stats */}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                SITE STATS
                <button onClick={loadStats} disabled={loading} style={{ ...btnStyle("secondary"), fontSize: 9, padding: "1px 6px" }}>
                  {t("pages.refresh")}
                </button>
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#8892a4", letterSpacing: "0.08em", marginBottom: 4 }}>
                    TOTAL PAGE VIEWS
                  </div>
                  <div style={{
                    fontSize: 24,
                    color: "#00e5ff",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {pageViews != null ? pageViews.toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Testing tools */}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 12 }}>
                TESTING TOOLS
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={insertTestReboost} disabled={loading} style={btnStyle("primary")}>
                  Insert Test Reboost
                </button>
                <span style={{ fontSize: 9, color: "#8892a4" }}>
                  Fabricates a completed reboost event (+2.4 km) to verify timeline and banner rendering.
                </span>
              </div>
            </div>

            {/* Create event form */}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 12 }}>{t("pages.createNewEvent")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>{t("pages.type")}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    style={{ ...inputStyle }}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("pages.title")}</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Event title..."
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{t("pages.description")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description..."
                  style={{ ...inputStyle, height: 60, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>{t("pages.scheduledStart")}</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledStart}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledStart: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("pages.scheduledEnd")}</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledEnd}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledEnd: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <button onClick={createEvent} disabled={loading} style={btnStyle("primary")}>
                {loading ? t("pages.creating") : t("pages.createEvent")}
              </button>
            </div>

            {/* Events list */}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {t("pages.activeEvents")}
                <button onClick={loadEvents} disabled={loading} style={{ ...btnStyle("secondary"), fontSize: 9, padding: "1px 6px" }}>
                  {t("pages.refresh")}
                </button>
              </div>
              {events.length === 0 ? (
                <div style={{ fontSize: 10, color: "#4a5568" }}>{t("pages.noEventsFound")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {events.map((ev) => (
                    <div key={ev.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: ev.isActive ? "rgba(0,255,136,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${ev.isActive ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 4,
                    }}>
                      <div style={{ fontSize: 9, color: "#8892a4", width: 70 }}>{ev.type?.toUpperCase()}</div>
                      <div style={{ flex: 1, fontSize: 11, color: "#e2e8f0" }}>{ev.title}</div>
                      {ev.isActive && <div style={{ fontSize: 9, color: "#00ff88", letterSpacing: "0.06em" }}>{t("pages.active")}</div>}
                      <div style={{ display: "flex", gap: 6 }}>
                        {!ev.isActive && (
                          <button onClick={() => setEventActive(ev.id, true)} disabled={loading} style={btnStyle("primary")}>
                            {t("pages.activate")}
                          </button>
                        )}
                        {ev.isActive && (
                          <button onClick={() => setEventActive(ev.id, false)} disabled={loading} style={btnStyle("danger")}>
                            {t("pages.end")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
