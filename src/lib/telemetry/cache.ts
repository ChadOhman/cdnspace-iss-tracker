import type { OrbitalState, ISSTelemetry, SolarActivity, ISSEvent } from "../types";
import type { CrewRoster } from "../pollers/crew-poller";

/** Strip the raw Lightstreamer channels map from telemetry to reduce payload size */
function stripChannels(telemetry: ISSTelemetry): Omit<ISSTelemetry, "channels"> {
  const { channels: _, ...rest } = telemetry;
  return rest;
}

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
      telemetry: this.telemetry ? stripChannels(this.telemetry) : null,
      solar: this.solar,
      activeEvent: this.activeEvent,
      crew: this.crew,
      visitorCount: this.visitorCount,
    };
  }

  /** Lightweight payload sent every second (no crew/solar/event/channels) */
  getTickPayload() {
    return {
      orbital: this.orbital,
      telemetry: this.telemetry ? stripChannels(this.telemetry) : null,
      visitorCount: this.visitorCount,
    };
  }
}
