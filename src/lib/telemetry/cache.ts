import type { OrbitalState, ISSTelemetry, SolarActivity, ISSEvent } from "../types";

export class TelemetryCache {
  orbital: OrbitalState | null = null;
  telemetry: ISSTelemetry | null = null;
  solar: SolarActivity | null = null;
  activeEvent: ISSEvent | null = null;
  visitorCount = 0;

  getPayload() {
    return {
      orbital: this.orbital,
      telemetry: this.telemetry,
      solar: this.solar,
      activeEvent: this.activeEvent,
      visitorCount: this.visitorCount,
    };
  }
}
