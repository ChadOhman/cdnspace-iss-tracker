"use client";

import PanelFrame from "@/components/shared/PanelFrame";
import type { ISSTelemetry } from "@/lib/types";
import { useLocale } from "@/context/LocaleContext";

interface ModuleTempsPanelProps {
  telemetry: ISSTelemetry | null;
}

interface ModuleBoxProps {
  name: string;
  cabinTemp: number;
  avionicsTemp?: number;
  accent?: string;
}

function ModuleBox({ name, cabinTemp, avionicsTemp, accent = "var(--color-accent-cyan)" }: ModuleBoxProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: `1px solid ${accent}`,
        borderRadius: 4,
        padding: "5px 6px",
        minWidth: 64,
        textAlign: "center",
      }}
    >
      <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>{name}</div>
      <div
        style={{
          color: accent,
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {cabinTemp.toFixed(1)}°C
      </div>
      {avionicsTemp !== undefined && (
        <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginTop: 2 }}>
          {t_avionics}: {avionicsTemp.toFixed(1)}°C
        </div>
      )}
    </div>
  );
}

// Since ModuleBox is defined inside this module, we need to handle t differently.
// We'll restructure with a wrapper component.

interface ThermalLoopRowProps {
  label: string;
  flow: number;
  pressure: number;
  radTemp: number;
}

function ThermalLoopRow({ label, flow, pressure, radTemp }: ThermalLoopRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3px 0",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <span style={{ color: "var(--color-accent-cyan)", fontSize: 9, fontWeight: 700, minWidth: 60 }}>{label}</span>
      <span style={{ color: "var(--color-text-secondary)", fontSize: 9, fontVariantNumeric: "tabular-nums" }}>
        {(flow * 0.453592).toFixed(1)} kg/hr
      </span>
      <span style={{ color: "var(--color-text-secondary)", fontSize: 9, fontVariantNumeric: "tabular-nums" }}>
        {(pressure * 6.89476).toFixed(1)} kPa
      </span>
      <span style={{ color: "var(--color-text-secondary)", fontSize: 9, fontVariantNumeric: "tabular-nums" }}>
        {radTemp.toFixed(1)}°C
      </span>
    </div>
  );
}

interface CcaaStatusProps {
  module: string;
  status: string;
}

const CCAA_STATUS_MAP: Record<string, { label: string; color: string }> = {
  "0": { label: "Reset", color: "var(--color-accent-orange)" },
  "1": { label: "Drain", color: "var(--color-accent-orange)" },
  "2": { label: "Dryout", color: "var(--color-accent-orange)" },
  "3": { label: "EIB Off", color: "var(--color-text-muted)" },
  "4": { label: "Off", color: "var(--color-text-muted)" },
  "5": { label: "On", color: "var(--color-accent-green)" },
  "6": { label: "Startup", color: "var(--color-accent-cyan)" },
  "7": { label: "Test", color: "var(--color-accent-orange)" },
};

function CcaaStatus({ module, status }: CcaaStatusProps) {
  const decoded = CCAA_STATUS_MAP[status.trim()] ?? { label: status || "—", color: "var(--color-text-muted)" };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>{module}</span>
      <span
        style={{
          fontSize: 8,
          fontWeight: 600,
          color: decoded.color,
        }}
      >
        {decoded.label}
      </span>
    </div>
  );
}

// Label used inside ModuleBox for avionics — set as a module-level constant
const t_avionics = "AVN";

export default function ModuleTempsPanel({ telemetry }: ModuleTempsPanelProps) {
  const { t } = useLocale();

  return (
    <PanelFrame
      title={t("panels.moduleTemps").toUpperCase()}
      icon="🌡️"
      accentColor="var(--color-accent-cyan)"
    >
      {!telemetry ? (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 10,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          {t("crew.awaitingTelemetry")}
        </div>
      ) : (
        <div>
          {/* Module schematic */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 5 }}>
              {t("moduleTemps.schematic").toUpperCase()}
            </div>

            {/* Main chain: Russian → Node 1 → US Lab → Node 2 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {/* Russian segment (proxy: use Node 1 cabin as stand-in since no Russian field) */}
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 4,
                  padding: "5px 6px",
                  minWidth: 58,
                  textAlign: "center",
                  opacity: 0.7,
                }}
              >
                <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 3 }}>RUS SEG</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>—</div>
              </div>

              <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

              {/* Node 1 (FGB/Unity) */}
              <ModuleBox
                name="NODE 1"
                cabinTemp={telemetry.moduleTemps.node1Cabin}
              />

              <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

              {/* US Lab (Destiny) */}
              <ModuleBox
                name="DESTINY"
                cabinTemp={telemetry.moduleTemps.uslabCabin}
                avionicsTemp={telemetry.moduleTemps.uslabAvionics}
                accent="var(--color-accent-cyan)"
              />

              <div style={{ color: "var(--color-border-subtle)", fontSize: 10 }}>—</div>

              {/* Node 2 (Harmony) */}
              <ModuleBox
                name="HARMONY"
                cabinTemp={telemetry.moduleTemps.node2Cabin}
                avionicsTemp={telemetry.moduleTemps.node2Avionics}
                accent="var(--color-accent-cyan)"
              />
            </div>

            {/* Node 3 (Tranquility) hangs below Node 1 */}
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 4, paddingLeft: 70 }}>
              <div
                style={{
                  width: 1,
                  height: 12,
                  background: "var(--color-border-subtle)",
                  marginLeft: 30,
                  marginRight: 0,
                }}
              />
            </div>
            <div style={{ display: "flex", paddingLeft: 58 }}>
              <ModuleBox
                name="NODE 3"
                cabinTemp={telemetry.moduleTemps.node3Cabin}
                avionicsTemp={telemetry.moduleTemps.node3Avionics}
                accent="var(--color-accent-cyan)"
              />
            </div>
          </div>

          {/* External thermal loops */}
          <div
            style={{
              marginBottom: 8,
              paddingTop: 6,
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 4 }}>
              {t("moduleTemps.externalLoops").toUpperCase()}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span />
              <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>FLOW</span>
              <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>PRESS</span>
              <span style={{ color: "var(--color-text-muted)", fontSize: 8 }}>RAD OUT</span>
            </div>
            <ThermalLoopRow
              label="LOOP A (S1)"
              flow={telemetry.externalThermal.loopAFlow}
              pressure={telemetry.externalThermal.loopAPressure}
              radTemp={telemetry.externalThermal.loopARadiatorTemp}
            />
            <ThermalLoopRow
              label="LOOP B (P1)"
              flow={telemetry.externalThermal.loopBFlow}
              pressure={telemetry.externalThermal.loopBPressure}
              radTemp={telemetry.externalThermal.loopBRadiatorTemp}
            />
          </div>

          {/* CCAA status */}
          <div style={{ paddingTop: 6, borderTop: "1px solid var(--color-border-subtle)" }}>
            <div style={{ color: "var(--color-text-muted)", fontSize: 8, marginBottom: 4 }}>
              {t("moduleTemps.ccaa").toUpperCase()}
            </div>
            <CcaaStatus module="HARMONY CCAA" status={telemetry.moduleTemps.node2Ccaa} />
            <CcaaStatus module="TRANQUILITY CCAA" status={telemetry.moduleTemps.node3Ccaa} />
            <CcaaStatus module="DESTINY CCAA-1" status={telemetry.moduleTemps.uslabCcaa1} />
            <CcaaStatus module="DESTINY CCAA-2" status={telemetry.moduleTemps.uslabCcaa2} />
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
