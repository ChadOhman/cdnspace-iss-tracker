"use client";

import { useState } from "react";

export function BuyMeACoffee() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 44,
        right: 16,
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "rgba(10, 14, 20, 0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--border-panel, rgba(0,229,255,0.12))",
        borderRadius: 999,
        fontSize: "0.8rem",
        animation: "bmac-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <a
        href="https://buymeacoffee.com/chadohman"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Support this project on Buy Me a Coffee"
        style={{
          color: "var(--text-secondary, #a0b8cf)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        ☕ Support this project
      </a>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "var(--text-dim, #94adc4)",
          cursor: "pointer",
          fontSize: 14,
          padding: "0 2px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
