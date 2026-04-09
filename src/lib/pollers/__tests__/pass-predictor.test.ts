/**
 * Tests for the ISS pass predictor.
 */

import { describe, it, expect } from "@jest/globals";
import { classifyPassQuality, predictPasses } from "../pass-predictor";

// Sample ISS TLE (epoch ~2024-04-09, used consistently with sgp4-propagator tests)
const SAMPLE_TLE = {
  line1:
    "1 25544U 98067A   24100.50000000  .00016717  00000-0  10270-3 0  9009",
  line2:
    "2 25544  51.6400 200.0000 0007417  35.5000 325.0000 15.49000000000009",
};

// Montreal coordinates
const MONTREAL_LAT = 45.5;
const MONTREAL_LON = -73.6;

// ─── classifyPassQuality ─────────────────────────────────────────────────────

describe("classifyPassQuality", () => {
  it('returns "bright" when maxElevation >= 50 and magnitude <= -2.5', () => {
    expect(classifyPassQuality(50, -2.5)).toBe("bright");
    expect(classifyPassQuality(80, -3.0)).toBe("bright");
    expect(classifyPassQuality(90, -4.5)).toBe("bright");
  });

  it('returns "good" when maxElevation >= 30 and magnitude <= -1.5', () => {
    expect(classifyPassQuality(30, -1.5)).toBe("good");
    expect(classifyPassQuality(45, -2.0)).toBe("good");
    // Does not meet bright threshold (elevation < 50)
    expect(classifyPassQuality(49, -3.0)).toBe("good");
  });

  it('returns "fair" when maxElevation >= 15 (regardless of magnitude)', () => {
    expect(classifyPassQuality(15, 2.0)).toBe("fair");
    expect(classifyPassQuality(20, 0)).toBe("fair");
    // Elevation >= 15 but magnitude not bright/good
    expect(classifyPassQuality(25, 1.0)).toBe("fair");
  });

  it('returns "poor" when maxElevation < 15', () => {
    expect(classifyPassQuality(14, -3.0)).toBe("poor");
    expect(classifyPassQuality(0, -5.0)).toBe("poor");
    expect(classifyPassQuality(10, 0)).toBe("poor");
  });

  it("bright threshold takes priority over good", () => {
    // Both bright and good conditions met → should be bright
    expect(classifyPassQuality(60, -3.0)).toBe("bright");
  });

  it("good threshold takes priority over fair", () => {
    // Good conditions met → should not degrade to fair
    expect(classifyPassQuality(35, -2.0)).toBe("good");
  });
});

// ─── predictPasses ───────────────────────────────────────────────────────────

describe("predictPasses", () => {
  // predictPasses does real SGP4 math; give it a fixed start time that
  // aligns close to the TLE epoch so propagation is accurate.
  // We mock Date.now() isn't needed since predictPasses uses Date.now()
  // internally – instead we just test properties of the returned passes.

  it("returns an array for Montreal over 24h", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 24);
    expect(Array.isArray(passes)).toBe(true);
  });

  it("returns at least 1 pass for Montreal over 24h", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 24);
    expect(passes.length).toBeGreaterThan(0);
  });

  it("returns no more than 20 passes", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 48);
    expect(passes.length).toBeLessThanOrEqual(20);
  });

  it("each pass has a maxElevation >= MIN_ELEVATION (10°)", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 24);
    for (const pass of passes) {
      expect(pass.maxElevation).toBeGreaterThanOrEqual(10);
    }
  });

  it("pass times are monotonically increasing (riseTime < maxTime < setTime)", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 24);
    for (const pass of passes) {
      expect(pass.riseTime).toBeLessThanOrEqual(pass.maxTime);
      expect(pass.maxTime).toBeLessThanOrEqual(pass.setTime);
    }
  });

  it("passes are sorted by rise time (ascending)", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 48);
    for (let i = 1; i < passes.length; i++) {
      expect(passes[i].riseTime).toBeGreaterThanOrEqual(passes[i - 1].riseTime);
    }
  });

  it("each pass has a valid quality label", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 24);
    const validQualities = ["bright", "good", "fair", "poor"];
    for (const pass of passes) {
      expect(validQualities).toContain(pass.quality);
    }
  });

  it("azimuth values are in [0, 360]", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 24);
    for (const pass of passes) {
      expect(pass.riseAzimuth).toBeGreaterThanOrEqual(0);
      expect(pass.riseAzimuth).toBeLessThanOrEqual(360);
      expect(pass.setAzimuth).toBeGreaterThanOrEqual(0);
      expect(pass.setAzimuth).toBeLessThanOrEqual(360);
    }
  });

  it("returns an empty array when hoursAhead is 0", () => {
    const passes = predictPasses(SAMPLE_TLE, MONTREAL_LAT, MONTREAL_LON, 0);
    expect(passes.length).toBe(0);
  });
});
