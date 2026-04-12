"use client";

import { useState, useCallback } from "react";
import PanelFrame from "@/components/shared/PanelFrame";
import Modal from "@/components/shared/Modal";
import { FLAG_EMOJI } from "@/data/iss-modules";
import type { CrewMember } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";
import type { CrewRoster } from "@/hooks/useTelemetryStream";

const AGENCY_COLOR: Record<string, string> = {
  NASA: "var(--color-accent-cyan)",
  RSA: "var(--color-accent-red)",
  ESA: "var(--color-accent-yellow)",
  JAXA: "var(--color-accent-green)",
  CSA: "var(--color-accent-orange)",
};

interface CrewRosterPanelProps {
  crew: CrewRoster | null;
}

export default function CrewRosterPanel({ crew }: CrewRosterPanelProps) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const crewMembers = crew?.crew ?? [];
  const expedition = crew?.expedition;

  const openBio = useCallback((member: CrewMember) => {
    setSelected(member);
  }, []);

  const closeModal = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <>
      <PanelFrame
        title={expedition ? `${t("crew.expedition")} ${expedition}` : t("panels.crew")}
        icon="👨‍🚀"
        accentColor="var(--color-accent-cyan)"
      >
        {crewMembers.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 10, fontStyle: "italic", padding: "8px 0" }}>
            Loading crew data...
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {crewMembers.map((member) => (
            <button
              key={member.name}
              onClick={() => openBio(member)}
              className="crew-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 6px",
                borderRadius: 3,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0,229,255,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              {member.photo ? (
                <img
                  src={member.photo}
                  alt=""
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span style={{ fontSize: 14 }}>
                  {FLAG_EMOJI[member.nationality] ?? "🏳️"}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 10,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {member.name}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
                  {member.role}
                </div>
              </div>
              <span
                style={{
                  color:
                    AGENCY_COLOR[member.agency] ?? "var(--color-text-muted)",
                  fontSize: 9,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {member.agency}
              </span>
            </button>
          ))}
        </div>
        )}
      </PanelFrame>

      <Modal
        title={selected?.name ?? ""}
        isOpen={!!selected}
        onClose={closeModal}
        maxWidth="480px"
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {selected.photo ? (
                <img
                  src={selected.photo}
                  alt=""
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "2px solid var(--color-border-accent)",
                  }}
                />
              ) : (
                <span style={{ fontSize: 32 }}>
                  {FLAG_EMOJI[selected.nationality] ?? "🏳️"}
                </span>
              )}
              <div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {selected.name}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
                  {selected.role} · {selected.agency}
                  {selected.spacecraft ? ` · ${selected.spacecraft}` : ""} · {t("panels.crew")}{" "}
                  {selected.expedition}
                </div>
              </div>
            </div>
            {selected.bio ? (
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                {selected.bio}
              </p>
            ) : (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 11,
                  fontStyle: "italic",
                }}
              >
                {t("crew.noBio")}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
