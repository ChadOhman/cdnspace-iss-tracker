"use client";

import { ReactNode, useState, KeyboardEvent } from "react";

interface PanelFrameProps {
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  accentColor?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function PanelFrame({
  title,
  icon,
  headerRight,
  accentColor = "var(--accent-cyan)",
  collapsible = false,
  defaultCollapsed = false,
  children,
  className = "",
  bodyClassName = "",
}: PanelFrameProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    if (collapsible) setCollapsed((c) => !c);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (collapsible && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div
      className={`panel ${className}`}
      style={{ borderLeft: `2px solid ${accentColor}` }}
    >
      <div
        className="panel-header"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        {...(collapsible
          ? { role: "button", tabIndex: 0, "aria-expanded": !collapsed }
          : {})}
        style={collapsible ? { cursor: "pointer" } : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {icon && <span>{icon}</span>}
          <span>{title}</span>
          {collapsible && (
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.15s",
                transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                fontSize: "0.7em",
              }}
            >
              ▼
            </span>
          )}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div
        className={`panel-body ${bodyClassName}`}
        style={{ display: collapsed ? "none" : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
