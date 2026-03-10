import AsyncStorage from "@react-native-async-storage/async-storage";
import { Destination, RiskLevel } from "../types";

export type TravelInsight = {
  days: number;
  avgFlightPrice: number;
  avgTempC: number;
  avgHumidity: number;
  rainLabel: "Dry" | "Mixed" | "Rainy";
  riskLevel: RiskLevel;
  recommendationScore: number;
  reportSummary: string;
  events: Array<{ name: string; month: string; impact: "Low" | "Medium" | "High" }>;
  source: "live" | "cache" | "fallback";
  updatedAtISO: string;
};

function monthLabelFromDate(dateISO: string) {
  const month = new Date(dateISO).getMonth();
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[month];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function riskPenalty(level: RiskLevel) {
  if (level === "Low") return 8;
  if (level === "Moderate") return 18;
  return 30;
}

const CACHE_PREFIX = "tripvibe.insight.v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function getCacheKey(destinationId: string, startDate: string, endDate: string) {
  return `${CACHE_PREFIX}:${destinationId}:${startDate}:${endDate}`;
}

function mapMonthNumberToLabel(month: number) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[Math.max(0, Math.min(11, month - 1))];
}

function monthNumberFromISO(dateISO: string) {
  return new Date(dateISO).getMonth() + 1;
}

export function buildTravelInsight(destination: Destination, startDate: string, endDate: string): TravelInsight {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end.getTime() - start.getTime();
  const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);

  const startMonth = monthLabelFromDate(startDate);
  const endMonth = monthLabelFromDate(endDate);
  const windowRows = destination.monthly.filter((item) => item.month === startMonth || item.month === endMonth);
  const rows = windowRows.length > 0 ? windowRows : [destination.monthly[0]];

  const avgFlightPrice = Math.round(rows.reduce((sum, item) => sum + item.avgFlightPrice, 0) / rows.length);
  const avgTempC = Math.round(rows.reduce((sum, item) => sum + item.avgTempC, 0) / rows.length);
  const avgHumidity = Math.round(rows.reduce((sum, item) => sum + item.humidity, 0) / rows.length);

  const rainScore = rows.reduce((score, item) => {
    if (item.rainLevel === "Dry") return score + 1;
    if (item.rainLevel === "Mixed") return score + 2;
    return score + 3;
  }, 0);
  const rainAvg = rainScore / rows.length;
  const rainLabel = rainAvg <= 1.4 ? "Dry" : rainAvg < 2.4 ? "Mixed" : "Rainy";

  const riskNumber = rows.reduce((score, item) => score + riskPenalty(item.riskLevel), 0) / rows.length;
  const riskLevel: RiskLevel = riskNumber < 13 ? "Low" : riskNumber < 24 ? "Moderate" : "High";

  const demandPenalty = Math.round((avgFlightPrice - 350000) / 50000) * 2;
  const durationPenalty = days > 8 ? 4 : 0;
  const humidityPenalty = avgHumidity > 75 ? 6 : 0;
  const recommendationScore = clamp(100 - Math.round(riskNumber + demandPenalty + durationPenalty + humidityPenalty), 42, 96);

  const events = destination.majorEvents.filter((event) => event.month === startMonth || event.month === endMonth);
  const reportSummary = `${destination.city} ${startMonth}-${endMonth} window: weather and fare data indicate ${riskLevel.toLowerCase()} travel risk.`;

  return {
    days,
    avgFlightPrice,
    avgTempC,
    avgHumidity,
    rainLabel,
    riskLevel,
    recommendationScore,
    reportSummary,
    events,
    source: "fallback",
    updatedAtISO: new Date().toISOString(),
  };
}

async function fetchWeatherSignal(country: string, startDate: string, endDate: string) {
  const key = process.env.EXPO_PUBLIC_VISUAL_CROSSING_API_KEY;
  if (!key) return null;

  const base = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
  const url = `${base}/${encodeURIComponent(country)}/${startDate}/${endDate}?unitGroup=metric&include=days&key=${key}&contentType=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("weather_fetch_failed");
  const data = (await response.json()) as { days?: Array<{ temp?: number; humidity?: number; precip?: number }> };
  const days = data.days ?? [];
  if (days.length === 0) return null;

  const avgTempC = Math.round(days.reduce((sum, day) => sum + (day.temp ?? 0), 0) / days.length);
  const avgHumidity = Math.round(days.reduce((sum, day) => sum + (day.humidity ?? 0), 0) / days.length);
  const avgPrecip = days.reduce((sum, day) => sum + (day.precip ?? 0), 0) / days.length;
  const rainLabel: "Dry" | "Mixed" | "Rainy" = avgPrecip < 1.2 ? "Dry" : avgPrecip < 4.2 ? "Mixed" : "Rainy";

  return { avgTempC, avgHumidity, rainLabel };
}

async function fetchEventSignal(country: string, startDate: string, endDate: string) {
  const key = process.env.EXPO_PUBLIC_PREDICTHQ_API_KEY;
  if (!key) return null;

  const from = `${startDate}T00:00:00Z`;
  const to = `${endDate}T23:59:59Z`;
  const url = `https://api.predicthq.com/v1/events/?q=${encodeURIComponent(country)}&active.gte=${from}&active.lte=${to}&limit=10`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error("event_fetch_failed");
  const data = (await response.json()) as { results?: Array<{ title?: string; rank?: number; start?: string }> };
  const rows = (data.results ?? []).map((item) => {
    const rank = item.rank ?? 0;
    const impact: "Low" | "Medium" | "High" = rank >= 70 ? "High" : rank >= 45 ? "Medium" : "Low";
    const monthNo = item.start ? new Date(item.start).getMonth() + 1 : monthNumberFromISO(startDate);
    return {
      name: item.title ?? "Event",
      month: mapMonthNumberToLabel(monthNo),
      impact,
    };
  });
  return rows;
}

async function fetchFlightSignal(originAirport: string, destinationCity: string, startDate: string, endDate: string) {
  const key = process.env.EXPO_PUBLIC_AMADEUS_CLIENT_ID;
  const secret = process.env.EXPO_PUBLIC_AMADEUS_CLIENT_SECRET;
  if (!key || !secret) return null;

  const tokenRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(key)}&client_secret=${encodeURIComponent(secret)}`,
  });
  if (!tokenRes.ok) throw new Error("flight_token_failed");
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const token = tokenData.access_token;
  if (!token) throw new Error("flight_token_empty");

  const query = new URLSearchParams({
    originLocationCode: originAirport,
    destinationKeyword: destinationCity,
    departureDate: startDate,
    returnDate: endDate,
    adults: "1",
    max: "5",
  });
  const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("flight_fetch_failed");
  const payload = (await response.json()) as { data?: Array<{ price?: { total?: string } }> };
  const offers = payload.data ?? [];
  if (offers.length === 0) return null;
  const amounts = offers
    .map((offer) => Number(offer.price?.total ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (amounts.length === 0) return null;
  const avg = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
  return Math.round(avg * 1450); // rough KRW normalization
}

function mergeSignals(
  base: TravelInsight,
  signals: {
    flightKRW: number | null;
    weather: Awaited<ReturnType<typeof fetchWeatherSignal>>;
    events: Awaited<ReturnType<typeof fetchEventSignal>>;
  },
) {
  const avgFlightPrice = signals.flightKRW ?? base.avgFlightPrice;
  const avgTempC = signals.weather?.avgTempC ?? base.avgTempC;
  const avgHumidity = signals.weather?.avgHumidity ?? base.avgHumidity;
  const rainLabel = signals.weather?.rainLabel ?? base.rainLabel;
  const events = signals.events && signals.events.length > 0 ? signals.events : base.events;

  const riskFromRain = rainLabel === "Rainy" ? 24 : rainLabel === "Mixed" ? 14 : 7;
  const humidityPenalty = avgHumidity >= 78 ? 6 : avgHumidity >= 68 ? 3 : 0;
  const riskScore = riskFromRain + humidityPenalty;
  const riskLevel: RiskLevel = riskScore >= 22 ? "High" : riskScore >= 12 ? "Moderate" : "Low";
  const recommendationScore = clamp(100 - riskScore - Math.round((avgFlightPrice - 350000) / 55000), 40, 97);

  return {
    ...base,
    avgFlightPrice,
    avgTempC,
    avgHumidity,
    rainLabel,
    riskLevel,
    recommendationScore,
    events,
  };
}

export async function getTravelInsight(params: {
  destination: Destination;
  originAirport: string;
  startDate: string;
  endDate: string;
}): Promise<TravelInsight> {
  const { destination, originAirport, startDate, endDate } = params;
  const cacheKey = getCacheKey(destination.id, startDate, endDate);
  const now = Date.now();

  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const cached = JSON.parse(raw) as { savedAt: number; value: TravelInsight };
      if (now - cached.savedAt < CACHE_TTL_MS) {
        return { ...cached.value, source: "cache" };
      }
    }
  } catch {
    // Cache read failure should not block user flow.
  }

  const base = buildTravelInsight(destination, startDate, endDate);

  try {
    const [flightKRW, weather, events] = await Promise.all([
      fetchFlightSignal(originAirport, destination.city, startDate, endDate),
      fetchWeatherSignal(destination.country, startDate, endDate),
      fetchEventSignal(destination.country, startDate, endDate),
    ]);
    const merged = mergeSignals(base, { flightKRW, weather, events });
    const hasLiveSignal = Boolean(flightKRW || weather || (events && events.length > 0));
    const withMeta: TravelInsight = {
      ...merged,
      source: hasLiveSignal ? "live" : "fallback",
      updatedAtISO: new Date().toISOString(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: now, value: withMeta }));
    return withMeta;
  } catch {
    const withMeta: TravelInsight = { ...base, source: "fallback", updatedAtISO: new Date().toISOString() };
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: now, value: withMeta }));
    return withMeta;
  }
}
