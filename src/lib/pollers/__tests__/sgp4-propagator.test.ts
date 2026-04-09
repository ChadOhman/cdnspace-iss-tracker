/**
 * Tests for the SGP4 propagator.
 *
 * Uses a well-known ISS TLE from early 2024 to verify that the propagated
 * position and orbital elements are within physically plausible bounds.
 */

import { describe, it, expect } from "@jest/globals";
import { propagateFromTle } from "../sgp4-propagator";

// Sample ISS TLE (epoch ~2024-04-09 12:00 UTC)
const SAMPLE_TLE = {
  line1:
    "1 25544U 98067A   24100.50000000  .00016717  00000-0  10270-3 0  9009",
  line2:
    "2 25544  51.6400 200.0000 0007417  35.5000 325.0000 15.49000000000009",
};

// Propagate to the exact epoch of the TLE
const EPOCH_DATE = new Date("2024-04-09T12:00:00.000Z");

describe("propagateFromTle", () => {
  it("returns a non-null OrbitalState for a valid TLE", () => {
    const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE);
    expect(state).not.toBeNull();
  });

  describe("latitude", () => {
    it("is within [-90, 90]", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.lat).toBeGreaterThanOrEqual(-90);
      expect(state.lat).toBeLessThanOrEqual(90);
    });
  });

  describe("longitude", () => {
    it("is within [-180, 180]", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.lon).toBeGreaterThanOrEqual(-180);
      expect(state.lon).toBeLessThanOrEqual(180);
    });
  });

  describe("altitude", () => {
    it("is within ISS operational range [300, 500] km", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.altitude).toBeGreaterThan(300);
      expect(state.altitude).toBeLessThan(500);
    });
  });

  describe("velocity", () => {
    it("is within [7, 8] km/s (orbital velocity range for ISS)", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.velocity).toBeGreaterThan(7);
      expect(state.velocity).toBeLessThan(8);
    });
  });

  describe("inclination", () => {
    it("is approximately 51.64°", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.inclination).toBeCloseTo(51.64, 1);
    });
  });

  describe("period", () => {
    it("is within [90, 95] minutes for a ~408 km orbit", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.period).toBeGreaterThan(90);
      expect(state.period).toBeLessThan(95);
    });
  });

  describe("period in seconds", () => {
    it("is within [5400, 5700] seconds", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      const periodSeconds = state.period * 60;
      expect(periodSeconds).toBeGreaterThan(5400);
      expect(periodSeconds).toBeLessThan(5700);
    });
  });

  describe("eccentricity", () => {
    it("is close to 0.0007417 (from TLE)", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.eccentricity).toBeCloseTo(0.0007417, 4);
    });
  });

  describe("apoapsis and periapsis", () => {
    it("apoapsis > periapsis", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.apoapsis).toBeGreaterThan(state.periapsis);
    });

    it("both are within ISS operational altitude range", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.apoapsis).toBeGreaterThan(350);
      expect(state.apoapsis).toBeLessThan(450);
      expect(state.periapsis).toBeGreaterThan(350);
      expect(state.periapsis).toBeLessThan(450);
    });
  });

  describe("isInSunlight", () => {
    it("is a boolean", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(typeof state.isInSunlight).toBe("boolean");
    });
  });

  describe("timestamp", () => {
    it("equals the input date in milliseconds", () => {
      const state = propagateFromTle(SAMPLE_TLE, EPOCH_DATE)!;
      expect(state.timestamp).toBe(EPOCH_DATE.getTime());
    });
  });

  it("returns null for a completely invalid TLE", () => {
    const badTle = { line1: "not a tle line 1", line2: "not a tle line 2" };
    // Should either return null or throw — we accept null
    const state = propagateFromTle(badTle, EPOCH_DATE);
    expect(state).toBeNull();
  });
});
