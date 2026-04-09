/**
 * Type compilation tests for core ISS tracker interfaces.
 * These tests verify that all interfaces are correctly defined and assignable.
 */

import { describe, it, expect } from "@jest/globals";
import type {
  OrbitalState,
  ISSTelemetry,
  LightstreamerChannel,
  SolarActivity,
  ISSEvent,
  EventType,
  EventStatus,
  TimelineActivity,
  ActivityType,
  CrewMember,
  PassPrediction,
  PassQuality,
  SsePayload,
  PlaybackSpeed,
  Snapshot,
} from "@/lib/types";

describe("TypeScript type definitions compile correctly", () => {
  describe("LightstreamerChannel", () => {
    it("accepts a valid LightstreamerChannel object", () => {
      const channel: LightstreamerChannel = {
        value: "123.45",
        status: "OK",
        timestamp: Date.now(),
      };
      expect(channel.value).toBe("123.45");
      expect(channel.status).toBe("OK");
      expect(typeof channel.timestamp).toBe("number");
    });
  });

  describe("OrbitalState", () => {
    it("accepts a valid OrbitalState object", () => {
      const orbital: OrbitalState = {
        timestamp: Date.now(),
        lat: 51.6,
        lon: -0.12,
        altitude: 408.5,
        velocity: 7.66,
        speedKmH: 27576,
        period: 92.68,
        inclination: 51.6,
        eccentricity: 0.0001,
        apoapsis: 412.0,
        periapsis: 405.0,
        revolutionNumber: 143000,
        isInSunlight: true,
        sunriseIn: 1200,
        sunsetIn: 2700,
      };
      expect(orbital.lat).toBe(51.6);
      expect(orbital.isInSunlight).toBe(true);
    });
  });

  describe("ISSTelemetry", () => {
    it("accepts a valid ISSTelemetry object", () => {
      const channel: LightstreamerChannel = {
        value: "42.0",
        status: "OK",
        timestamp: Date.now(),
      };
      const telemetry: ISSTelemetry = {
        timestamp: Date.now(),
        powerKw: 84.0,
        temperatureC: 22.0,
        pressurePsi: 14.7,
        oxygenPercent: 21.0,
        co2Percent: 0.04,
        attitudeMode: "LVLH",
        channels: { POWER_1: channel },
      };
      expect(telemetry.powerKw).toBe(84.0);
      expect(telemetry.channels["POWER_1"].value).toBe("42.0");
    });
  });

  describe("SolarActivity", () => {
    it("accepts a valid SolarActivity object with radiationRisk levels", () => {
      const solar: SolarActivity = {
        timestamp: Date.now(),
        kpIndex: 3.5,
        kpLabel: "3.5",
        xrayFlux: 1.2e-7,
        xrayClass: "B1.2",
        protonFlux1MeV: 10.5,
        protonFlux10MeV: 2.3,
        protonFlux100MeV: 0.1,
        radiationRisk: "low",
      };
      expect(solar.kpIndex).toBe(3.5);
      expect(solar.radiationRisk).toBe("low");
    });

    it("accepts all valid radiationRisk values", () => {
      const risks: Array<SolarActivity["radiationRisk"]> = [
        "low",
        "moderate",
        "high",
        "severe",
      ];
      risks.forEach((risk) => {
        const solar: SolarActivity = {
          timestamp: Date.now(),
          kpIndex: 1,
          kpLabel: "1",
          xrayFlux: 0,
          xrayClass: "A1",
          protonFlux1MeV: 0,
          protonFlux10MeV: 0,
          protonFlux100MeV: 0,
          radiationRisk: risk,
        };
        expect(solar.radiationRisk).toBe(risk);
      });
    });
  });

  describe("EventType and EventStatus", () => {
    it("covers all EventType values", () => {
      const types: EventType[] = [
        "eva",
        "docking",
        "undocking",
        "reboost",
        "maneuver",
      ];
      expect(types.length).toBe(5);
    });

    it("covers all EventStatus values", () => {
      const statuses: EventStatus[] = [
        "scheduled",
        "active",
        "completed",
        "cancelled",
      ];
      expect(statuses.length).toBe(4);
    });
  });

  describe("ISSEvent", () => {
    it("accepts a valid ISSEvent object", () => {
      const event: ISSEvent = {
        id: "evt-001",
        type: "eva",
        title: "EVA 89",
        description: "Routine spacewalk",
        status: "scheduled",
        scheduledStart: Date.now(),
        scheduledEnd: Date.now() + 3600000,
        actualStart: null,
        actualEnd: null,
        metadata: { crewCount: "2" },
      };
      expect(event.type).toBe("eva");
      expect(event.status).toBe("scheduled");
      expect(event.actualStart).toBeNull();
    });
  });

  describe("ActivityType", () => {
    it("covers all ActivityType values", () => {
      const types: ActivityType[] = [
        "sleep",
        "science",
        "exercise",
        "meal",
        "eva",
        "maneuver",
        "dpc",
        "off-duty",
        "other",
      ];
      expect(types.length).toBe(9);
    });
  });

  describe("TimelineActivity", () => {
    it("accepts a valid TimelineActivity with optional notes", () => {
      const activity: TimelineActivity = {
        name: "Morning exercise",
        type: "exercise",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        notes: "Treadmill session",
      };
      expect(activity.name).toBe("Morning exercise");
      expect(activity.notes).toBe("Treadmill session");
    });

    it("accepts a TimelineActivity without notes", () => {
      const activity: TimelineActivity = {
        name: "Lunch",
        type: "meal",
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
      };
      expect(activity.notes).toBeUndefined();
    });
  });

  describe("CrewMember", () => {
    it("accepts a valid CrewMember with optional fields", () => {
      const crew: CrewMember = {
        name: "Jane Doe",
        role: "Flight Engineer",
        agency: "NASA",
        nationality: "American",
        expedition: 72,
        bio: "Experienced astronaut.",
        photo: "https://example.com/photo.jpg",
      };
      expect(crew.name).toBe("Jane Doe");
      expect(crew.expedition).toBe(72);
    });

    it("accepts a CrewMember without optional fields", () => {
      const crew: CrewMember = {
        name: "John Smith",
        role: "Commander",
        agency: "ESA",
        nationality: "German",
        expedition: 71,
      };
      expect(crew.bio).toBeUndefined();
      expect(crew.photo).toBeUndefined();
    });
  });

  describe("PassQuality and PassPrediction", () => {
    it("covers all PassQuality values", () => {
      const qualities: PassQuality[] = ["bright", "good", "fair", "poor"];
      expect(qualities.length).toBe(4);
    });

    it("accepts a valid PassPrediction object", () => {
      const pass: PassPrediction = {
        riseTime: Date.now(),
        riseAzimuth: 270.5,
        maxTime: Date.now() + 300000,
        maxElevation: 78.3,
        setTime: Date.now() + 600000,
        setAzimuth: 90.2,
        magnitude: -3.5,
        quality: "bright",
      };
      expect(pass.maxElevation).toBe(78.3);
      expect(pass.quality).toBe("bright");
    });
  });

  describe("PlaybackSpeed", () => {
    it("accepts all valid PlaybackSpeed values", () => {
      const speeds: PlaybackSpeed[] = [0, 1, 10, 50, 100];
      expect(speeds.length).toBe(5);
    });
  });

  describe("SsePayload", () => {
    it("accepts a valid SsePayload object", () => {
      const orbital: OrbitalState = {
        timestamp: Date.now(),
        lat: 0,
        lon: 0,
        altitude: 400,
        velocity: 7.7,
        speedKmH: 27720,
        period: 92,
        inclination: 51.6,
        eccentricity: 0.0001,
        apoapsis: 410,
        periapsis: 395,
        revolutionNumber: 100000,
        isInSunlight: false,
        sunriseIn: 900,
        sunsetIn: null,
      };
      const payload: SsePayload = {
        orbital,
        telemetry: null,
        solar: null,
        activeEvent: null,
        visitorCount: 42,
      };
      expect(payload.visitorCount).toBe(42);
      expect(payload.orbital.lat).toBe(0);
    });
  });

  describe("Snapshot", () => {
    it("accepts a valid Snapshot object", () => {
      const orbital: OrbitalState = {
        timestamp: Date.now(),
        lat: 10,
        lon: 20,
        altitude: 405,
        velocity: 7.65,
        speedKmH: 27540,
        period: 92.5,
        inclination: 51.6,
        eccentricity: 0.0002,
        apoapsis: 408,
        periapsis: 402,
        revolutionNumber: 99000,
        isInSunlight: true,
        sunriseIn: null,
        sunsetIn: 1500,
      };
      const snapshot: Snapshot = {
        timestamp: Date.now(),
        orbital,
        telemetry: null,
        solar: null,
        activeEvent: null,
      };
      expect(snapshot.orbital.altitude).toBe(405);
    });
  });
});
