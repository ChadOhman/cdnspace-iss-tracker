import { describe, it, expect } from "@jest/globals";
import {
  TDRS_REGIONS,
  lonDelta,
  computeElevation,
  regionVisibility,
  formatLon,
  IN_VIEW_THRESHOLD_DEG,
} from "../tdrs";

describe("TDRS_REGIONS", () => {
  it("has exactly three regions with the expected ids", () => {
    const ids = TDRS_REGIONS.map((r) => r.id).sort();
    expect(ids).toEqual(["atlantic", "indian", "pacific"]);
  });

  it("uses nominal regional centres (Atlantic -41, Pacific -171, Indian 85)", () => {
    const byId = Object.fromEntries(TDRS_REGIONS.map((r) => [r.id, r]));
    expect(byId.atlantic.lon).toBe(-41);
    expect(byId.pacific.lon).toBe(-171);
    expect(byId.indian.lon).toBe(85);
  });

  it("exposes both short and long labels for each region", () => {
    for (const r of TDRS_REGIONS) {
      expect(r.label).toMatch(/^[A-Z]+$/);
      expect(r.longLabel).toContain("Ocean Region");
    }
  });
});

describe("lonDelta", () => {
  it("returns zero for equal longitudes", () => {
    expect(lonDelta(0, 0)).toBe(0);
    expect(lonDelta(-41, -41)).toBe(0);
  });

  it("returns the absolute difference for same-hemisphere longitudes", () => {
    expect(lonDelta(10, 30)).toBe(20);
    expect(lonDelta(-41, -60)).toBe(19);
  });

  it("handles the ±180 antimeridian wrap", () => {
    expect(lonDelta(175, -175)).toBe(10);
    expect(lonDelta(-171, 171)).toBe(18);
  });
});

describe("computeElevation", () => {
  it("gives a high positive elevation when ISS is near the region centre", () => {
    // ISS at 41°W, Atlantic region at 41°W → delta 0 → elevation ~90°
    const elev = computeElevation(-41, 420, -41);
    expect(elev).toBeGreaterThan(85);
  });

  it("clamps to -90° when ISS is more than 90° away from the region", () => {
    const elev = computeElevation(-171, 420, 85); // Pacific ISS vs Indian region
    expect(elev).toBe(-90);
  });

  it("stays positive at the edge of the in-view cone (~70°)", () => {
    // At 70° delta the planar atan2 formula returns ~77.5°. The formula
    // measures elevation from ISS upward to GEO altitude, not from
    // horizon — the 35 366 km height difference dominates the 7 785 km
    // ground distance, so at any delta under ~84° the relay is still
    // geometrically above the ISS and elevation stays high. This is a
    // simplification; real geometric elevation from the ISS antenna
    // reference frame would be much lower. We preserve it for continuity
    // with the panel's historical output.
    const elev = computeElevation(0, 420, -70);
    expect(elev).toBeGreaterThan(70);
    expect(elev).toBeLessThan(85);
  });
});

describe("regionVisibility", () => {
  it("returns one entry per region in TDRS_REGIONS order", () => {
    const vis = regionVisibility(0, 420);
    expect(vis).toHaveLength(3);
    expect(vis.map((v) => v.region.id)).toEqual(
      TDRS_REGIONS.map((r) => r.id)
    );
  });

  it("marks the closest region in view and includes a computed elevation", () => {
    const vis = regionVisibility(-41, 420); // ISS at Atlantic centre
    const atlantic = vis.find((v) => v.region.id === "atlantic")!;
    expect(atlantic.inView).toBe(true);
    expect(atlantic.delta).toBe(0);
    expect(atlantic.elevation).toBeGreaterThan(85);
  });

  it("uses IN_VIEW_THRESHOLD_DEG (70°) as the in-view cutoff", () => {
    // Just inside the threshold: 69° delta → in view
    const justIn = regionVisibility(-41 + 69, 420);
    expect(justIn.find((v) => v.region.id === "atlantic")!.inView).toBe(true);
    // Just outside: 71° delta → out of view
    const justOut = regionVisibility(-41 + 71, 420);
    expect(justOut.find((v) => v.region.id === "atlantic")!.inView).toBe(false);
    expect(IN_VIEW_THRESHOLD_DEG).toBe(70);
  });

  it("covers the Indian Ocean Zone of Exclusion (ISS over Asia)", () => {
    // ISS at 85°E (Indian region centre) — Indian should be in view.
    // This is the case the old three-sat model got wrong.
    const vis = regionVisibility(85, 420);
    const indian = vis.find((v) => v.region.id === "indian")!;
    expect(indian.inView).toBe(true);
  });
});

describe("formatLon", () => {
  it("suffixes W for negative longitudes", () => {
    expect(formatLon(-41)).toBe("41°W");
    expect(formatLon(-171)).toBe("171°W");
  });

  it("suffixes E for positive longitudes", () => {
    expect(formatLon(85)).toBe("85°E");
    expect(formatLon(47.5)).toBe("47.5°E");
  });

  it("treats exactly zero as west (matches original TdrsPanel behaviour)", () => {
    expect(formatLon(0)).toBe("0°W");
  });
});
