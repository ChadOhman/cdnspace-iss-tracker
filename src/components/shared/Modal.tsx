"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  title,
  isOpen,
  onClose,
  children,
  maxWidth = "800px",
}: ModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg-panel, #1a1a2e)",
          border: "1px solid var(--color-border-accent, #333)",
          borderRadius: "8px",
          width: "90vw",
          maxWidth,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "var(--color-bg-panel-header, #111)",
            position: "sticky",
            top: 0,
            flexShrink: 0,
          }}
        >
          <span id="modal-title" style={{ fontWeight: 600 }}>
            {title}
          </span>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.1rem",
              color: "inherit",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "12px 14px", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
