export type RiskLevel = "Low" | "Moderate" | "High";

export type MonthlyInsight = {
  month: string;
  avgFlightPrice: number;
  avgTempC: number;
  rainLevel: "Dry" | "Mixed" | "Rainy";
  humidity: number;
  riskLevel: RiskLevel;
  note: string;
};

export type Destination = {
  id: string;
  city: string;
  country: string;
  tagline: string;
  nowWeather: string;
  highlights: string[];
  monthly: MonthlyInsight[];
  majorEvents: Array<{
    name: string;
    month: string;
    impact: "Low" | "Medium" | "High";
  }>;
};

export type SavedPlan = {
  id: string;
  destinationId: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

export type PageStamp = {
  id: string;
  uri?: string;
  presetKey?: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  scale: number;
  rotation: number;
};

export type VoyagePage = {
  id: string;
  pageNo: number;
  title: string;
  country: string;
  city: string;
  note: string;
  stamps?: PageStamp[];
  photoUri?: string;
  photoUris?: string[];
  createdAt: string;
  linkedPlanId?: string;
  startDate?: string;
  endDate?: string;
};
