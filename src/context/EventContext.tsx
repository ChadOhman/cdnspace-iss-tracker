"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { ISSEvent } from "@/lib/types";

interface EventContextValue {
  activeEvent: ISSEvent | null;
  setActiveEvent: (event: ISSEvent | null) => void;
  isEventMode: boolean;
  upcomingEvents: ISSEvent[];
  setUpcomingEvents: (events: ISSEvent[]) => void;
}

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEvent] = useState<ISSEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<ISSEvent[]>([]);

  const isEventMode = useMemo(
    () => activeEvent?.status === "active",
    [activeEvent]
  );

  return (
    <EventContext.Provider
      value={{
        activeEvent,
        setActiveEvent,
        isEventMode,
        upcomingEvents,
        setUpcomingEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return ctx;
}
