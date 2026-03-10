import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { destinations } from "../data/mockDestinations";

type TripContextType = {
  selectedDestinationId: string;
  startDate: string;
  endDate: string;
  setSelectedDestinationId: (id: string) => void;
  setDateRange: (startDate: string, endDate: string) => void;
};

const TripContext = createContext<TripContextType | null>(null);

function addDaysISO(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

export function TripProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [selectedDestinationId, setSelectedDestinationId] = useState(destinations[0].id);
  const [startDate, setStartDate] = useState(addDaysISO(today, 14));
  const [endDate, setEndDate] = useState(addDaysISO(today, 18));

  const value = useMemo(
    () => ({
      selectedDestinationId,
      startDate,
      endDate,
      setSelectedDestinationId,
      setDateRange: (nextStartDate: string, nextEndDate: string) => {
        setStartDate(nextStartDate);
        setEndDate(nextEndDate);
      },
    }),
    [endDate, selectedDestinationId, startDate],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTripContext() {
  const value = useContext(TripContext);
  if (!value) {
    throw new Error("useTripContext must be used within TripProvider");
  }
  return value;
}
