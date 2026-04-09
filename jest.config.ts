import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // satellite.js v7 is pure ESM and only exports via "import" condition.
    // Jest uses "require" condition so it cannot resolve the package by name.
    // Map it directly to the dist entry point so the transform can process it.
    "^satellite\\.js$":
      "<rootDir>/node_modules/satellite.js/dist/index.js",
  },
  transform: {
    // Transform TypeScript files with ts-jest
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
        },
      },
    ],
    // Transform satellite.js ESM dist .js files to CJS (works on Win/Unix)
    "[/\\\\]node_modules[/\\\\]satellite\\.js[/\\\\].+\\.js$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          allowJs: true,
        },
      },
    ],
  },
  // Allow Jest to transform satellite.js package files (cross-platform pattern)
  transformIgnorePatterns: [
    "[/\\\\]node_modules[/\\\\](?!(satellite\\.js)[/\\\\])",
  ],
};

export default config;
