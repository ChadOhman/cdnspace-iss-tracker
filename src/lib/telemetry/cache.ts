import type { OrbitalState, ISSTelemetry, SolarActivity, ISSEvent } from "../types";
import type { CrewRoster } from "../pollers/crew-poller";

export class TelemetryCache {
  orbital: OrbitalState | null = null;
  telemetry: ISSTelemetry | null = null;
  solar: SolarActivity | null = null;
  activeEvent: ISSEvent | null = null;
  crew: CrewRoster | null = null;
  visitorCount = 0;

  /** Full payload sent on initial connect */
  getPayload() {
    return {
      orbital: this.orbital,
      telemetry: this.telemetry,
      solar: this.solar,
      activeEvent: this.activeEvent,
      crew: this.crew,
      visitorCount: this.visitorCount,
    };
  }

  /** Lightweight payload sent every second (no crew/solar/event) */
  getTickPayload() {
    return {
      orbital: this.orbital,
      telemetry: this.telemetry,
      visitorCount: this.visitorCount,
    };
  }
}
