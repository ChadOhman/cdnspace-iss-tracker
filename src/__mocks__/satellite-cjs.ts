/**
 * CJS-compatible re-export shim for satellite.js v7 (pure ESM).
 *
 * satellite.js v7 ships only ESM.  Jest runs tests in CommonJS mode via
 * ts-jest, so we cannot import satellite.js directly.  This shim is resolved
 * by the moduleNameMapper in jest.config.ts.  It imports from the package
 * dist folder; the transformIgnorePatterns in jest.config.ts ensures that
 * those files are transformed by ts-jest before being required.
 */
export {
  twoline2satrec,
  propagate,
  sgp4,
  gstime,
  eciToGeodetic,
  eciToEcf,
  ecfToEci,
  ecfToLookAngles,
  geodeticToEcf,
  degreesLat,
  degreesLong,
  radiansToDegrees,
  degreesToRadians,
  sunPos,
  shadowFraction,
  jday,
  invjday,
  dopplerFactor,
} from "satellite.js";
