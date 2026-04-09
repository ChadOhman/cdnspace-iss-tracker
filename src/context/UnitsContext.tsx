"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type UnitSystem = "metric" | "imperial";

interface UnitsContextValue {
  units: UnitSystem;
  setUnits: (units: UnitSystem) => void;
  /** Convert psi to display unit (kPa or psi) */
  pressure: (psi: number) => { value: number; unit: string };
  /** Convert lb/hr to display unit (kg/hr or lb/hr) */
  flowRate: (lbPerHr: number) => { value: number; unit: string };
  /** Convert km to display unit (km or mi) */
  distance: (km: number) => { value: number; unit: string };
  /** Convert km/h to display unit (km/h or mph) */
  speed: (kmh: number) => { value: number; unit: string };
  /** Temperature — Lightstreamer already sends °C */
  temperature: (celsius: number) => { value: number; unit: string };
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitSystem>("metric");

  const pressure = (psi: number) =>
    units === "metric"
      ? { value: psi * 6.89476, unit: "kPa" }
      : { value: psi, unit: "psi" };

  const flowRate = (lbPerHr: number) =>
    units === "metric"
      ? { value: lbPerHr * 0.453592, unit: "kg/hr" }
      : { value: lbPerHr, unit: "lb/hr" };

  const distance = (km: number) =>
    units === "metric"
      ? { value: km, unit: "km" }
      : { value: km * 0.621371, unit: "mi" };

  const speed = (kmh: number) =>
    units === "metric"
      ? { value: kmh, unit: "km/h" }
      : { value: kmh * 0.621371, unit: "mph" };

  const temperature = (celsius: number) =>
    units === "metric"
      ? { value: celsius, unit: "°C" }
      : { value: celsius * 9 / 5 + 32, unit: "°F" };

  return (
    <UnitsContext.Provider value={{ units, setUnits, pressure, flowRate, distance, speed, temperature }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
