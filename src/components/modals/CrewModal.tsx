"use client";

import Modal from "@/components/shared/Modal";
import { FLAG_EMOJI } from "@/data/iss-modules";
import { useLocale } from "@/context/LocaleContext";
import type { CrewRoster } from "@/hooks/useTelemetryStream";

const AGENCY_COLOR: Record<string, string> = {
  NASA: "var(--color-accent-cyan)",
  RSA: "var(--color-accent-red)",
  ESA: "var(--color-accent-yellow)",
  JAXA: "var(--color-accent-green)",
  CSA: "var(--color-accent-orange)",
};

const AGENCY_BG: Record<string, string> = {
  NASA: "rgba(0,229,255,0.1)",
  RSA: "rgba(255,61,61,0.12)",
  ESA: "rgba(255,214,0,0.12)",
  JAXA: "rgba(0,255,136,0.12)",
  CSA: "rgba(255,140,0,0.12)",
};

interface CrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  crew: CrewRoster | null;
}

export default function CrewModal({ isOpen, onClose, crew }: CrewModalProps) {
  const { t } = useLocale();
  const crewMembers = crew?.crew ?? [];
  const expedition = crew?.expedition;

  return (
    <Modal
      title={expedition ? `${t("panels.crew")} — ${t("crew.expedition")} ${expedition}` : t("panels.crew")}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="720px"
    >
      <div
        className="crew-modal-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {crewMembers.map((member) => {
          const color = AGENCY_COLOR[member.agency] ?? "var(--color-text-muted)";
          const bg = AGENCY_BG[member.agency] ?? "rgba(255,255,255,0.05)";
          return (
            <div
              key={member.name}
              style={{
                padding: "10px 12px",
                background: "var(--color-bg-secondary, #0d1117)",
                border: "1px solid var(--color-border-subtle)",
                borderLeft: `3px solid ${color}`,
                borderRadius: 4,
              }}
            >
              {/* Photo + Name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt=""
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                      border: `2px solid ${color}`,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 22 }}>
                    {FLAG_EMOJI[member.nationality] ?? "🏳️"}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "var(--color-accent-yellow)",
                      fontSize: 12,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {member.name}
                  </div>
                  <div
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: 9,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginTop: 1,
                    }}
                  >
                    {member.role}
                    {member.spacecraft && (
                      <span style={{ textTransform: "none", letterSpacing: "normal" }}>
                        {" "}· {member.spacecraft}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 3,
                    background: bg,
                    color,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  {member.agency}
                </span>
              </div>

              {/* Bio */}
              {member.bio ? (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: 10,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {member.bio}
                </p>
              ) : (
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: 10,
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  {t("crew.noBio")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
