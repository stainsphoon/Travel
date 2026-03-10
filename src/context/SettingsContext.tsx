import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { airportsByCountry, countryOptions, HomeCountryCode } from "../data/airports";
import { Language, strings } from "../i18n/strings";

type Currency = "KRW" | "USD" | "EUR";
type TempUnit = "C" | "F";
type DistanceUnit = "km" | "mi";
type BudgetStyle = "normal" | "comfort" | "premium";

type SettingsState = {
  language: Language;
  currency: Currency;
  tempUnit: TempUnit;
  distanceUnit: DistanceUnit;
  homeCountry: HomeCountryCode;
  homeAirport: string;
  priceAlerts: boolean;
  weatherAlerts: boolean;
  eventReminders: boolean;
  budgetStyle: BudgetStyle;
  onboardingCompleted: boolean;
};

type SettingsContextType = SettingsState & {
  setLanguage: (value: Language) => void;
  setCurrency: (value: Currency) => void;
  setTempUnit: (value: TempUnit) => void;
  setDistanceUnit: (value: DistanceUnit) => void;
  setHomeCountry: (value: HomeCountryCode) => void;
  setHomeAirport: (value: string) => void;
  setPriceAlerts: (value: boolean) => void;
  setWeatherAlerts: (value: boolean) => void;
  setEventReminders: (value: boolean) => void;
  setBudgetStyle: (value: BudgetStyle) => void;
  completeOnboarding: () => void;
  t: typeof strings.en;
  formatPrice: (krwValue: number) => string;
  formatTemp: (celsius: number) => string;
  labelRisk: (value: "Low" | "Moderate" | "High") => string;
  labelRain: (value: "Dry" | "Mixed" | "Rainy") => string;
  labelImpact: (value: "Low" | "Medium" | "High") => string;
  labelMonth: (value: string) => string;
  labelCountry: (value: string) => string;
  availableCountries: typeof countryOptions;
  availableAirports: Array<{ code: string; name: string }>;
  homeCountryLabel: string;
  homeAirportLabel: string;
  hydrated: boolean;
};

const defaultState: SettingsState = {
  language: "en",
  currency: "KRW",
  tempUnit: "C",
  distanceUnit: "km",
  homeCountry: "KR",
  homeAirport: "ICN",
  priceAlerts: true,
  weatherAlerts: true,
  eventReminders: true,
  budgetStyle: "normal",
  onboardingCompleted: false,
};

const STORAGE_KEY = "tripvibe.settings.v3";
const SettingsContext = createContext<SettingsContextType | null>(null);

const countryNameMap: Record<string, { en: string; ko: string }> = {
  Japan: { en: "Japan", ko: "\uC77C\uBCF8" },
  Thailand: { en: "Thailand", ko: "\uD0DC\uAD6D" },
  Spain: { en: "Spain", ko: "\uC2A4\uD398\uC778" },
  "South Korea": { en: "South Korea", ko: "\uB300\uD55C\uBBFC\uAD6D" },
  "United States": { en: "United States", ko: "\uBBF8\uAD6D" },
};

const monthMap: Record<string, { en: string; ko: string }> = {
  Jan: { en: "Jan", ko: "1\uC6D4" },
  Feb: { en: "Feb", ko: "2\uC6D4" },
  Mar: { en: "Mar", ko: "3\uC6D4" },
  Apr: { en: "Apr", ko: "4\uC6D4" },
  May: { en: "May", ko: "5\uC6D4" },
  Jun: { en: "Jun", ko: "6\uC6D4" },
  Jul: { en: "Jul", ko: "7\uC6D4" },
  Aug: { en: "Aug", ko: "8\uC6D4" },
  Sep: { en: "Sep", ko: "9\uC6D4" },
  Oct: { en: "Oct", ko: "10\uC6D4" },
  Nov: { en: "Nov", ko: "11\uC6D4" },
  Dec: { en: "Dec", ko: "12\uC6D4" },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        const nextCountry = parsed.homeCountry ?? defaultState.homeCountry;
        const airportList = airportsByCountry[nextCountry];
        const nextAirport = parsed.homeAirport && airportList.some((item) => item.code === parsed.homeAirport)
          ? parsed.homeAirport
          : airportList[0].code;
        setSettings((prev) => ({ ...prev, ...parsed, homeCountry: nextCountry, homeAirport: nextAirport }));
      } catch {
        setSettings(defaultState);
      } finally {
        setHydrated(true);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<SettingsContextType>(() => {
    const t = strings[settings.language];

    const setLanguage = (language: Language) => setSettings((prev) => ({ ...prev, language }));
    const setCurrency = (currency: Currency) => setSettings((prev) => ({ ...prev, currency }));
    const setTempUnit = (tempUnit: TempUnit) => setSettings((prev) => ({ ...prev, tempUnit }));
    const setDistanceUnit = (distanceUnit: DistanceUnit) => setSettings((prev) => ({ ...prev, distanceUnit }));
    const setHomeCountry = (homeCountry: HomeCountryCode) =>
      setSettings((prev) => ({ ...prev, homeCountry, homeAirport: airportsByCountry[homeCountry][0].code }));
    const setHomeAirport = (homeAirport: string) => setSettings((prev) => ({ ...prev, homeAirport }));
    const setPriceAlerts = (priceAlerts: boolean) => setSettings((prev) => ({ ...prev, priceAlerts }));
    const setWeatherAlerts = (weatherAlerts: boolean) => setSettings((prev) => ({ ...prev, weatherAlerts }));
    const setEventReminders = (eventReminders: boolean) => setSettings((prev) => ({ ...prev, eventReminders }));
    const setBudgetStyle = (budgetStyle: BudgetStyle) => setSettings((prev) => ({ ...prev, budgetStyle }));
    const completeOnboarding = () => setSettings((prev) => ({ ...prev, onboardingCompleted: true }));

    const formatPrice = (krwValue: number) => {
      if (settings.currency === "KRW") return `KRW ${krwValue.toLocaleString()}`;
      if (settings.currency === "USD") return `USD ${(krwValue * 0.00074).toFixed(0)}`;
      return `EUR ${(krwValue * 0.00068).toFixed(0)}`;
    };
    const formatTemp = (celsius: number) => {
      if (settings.tempUnit === "C") return `${celsius}C`;
      return `${Math.round((celsius * 9) / 5 + 32)}F`;
    };
    const labelRisk = (value: "Low" | "Moderate" | "High") => {
      if (settings.language === "en") return value;
      if (value === "Low") return "\uB0AE\uC74C";
      if (value === "Moderate") return "\uBCF4\uD1B5";
      return "\uB192\uC74C";
    };
    const labelRain = (value: "Dry" | "Mixed" | "Rainy") => {
      if (settings.language === "en") return value;
      if (value === "Dry") return "\uAC74\uAE30";
      if (value === "Mixed") return "\uBCF5\uD569";
      return "\uC6B0\uAE30";
    };
    const labelImpact = (value: "Low" | "Medium" | "High") => {
      if (settings.language === "en") return value;
      if (value === "Low") return "\uB0AE\uC74C";
      if (value === "Medium") return "\uC911\uAC04";
      return "\uB192\uC74C";
    };
    const labelMonth = (value: string) => monthMap[value]?.[settings.language] ?? value;
    const labelCountry = (value: string) => countryNameMap[value]?.[settings.language] ?? value;

    const availableCountries = countryOptions;
    const availableAirports = airportsByCountry[settings.homeCountry].map((item) => ({
      code: item.code,
      name: settings.language === "ko" ? item.nameKo : item.nameEn,
    }));
    const homeCountryLabel =
      availableCountries.find((item) => item.code === settings.homeCountry)?.[settings.language === "ko" ? "nameKo" : "nameEn"] ??
      settings.homeCountry;
    const homeAirportLabel =
      availableAirports.find((item) => item.code === settings.homeAirport)?.name ?? settings.homeAirport;

    return {
      ...settings,
      setLanguage,
      setCurrency,
      setTempUnit,
      setDistanceUnit,
      setHomeCountry,
      setHomeAirport,
      setPriceAlerts,
      setWeatherAlerts,
      setEventReminders,
      setBudgetStyle,
      completeOnboarding,
      t,
      formatPrice,
      formatTemp,
      labelRisk,
      labelRain,
      labelImpact,
      labelMonth,
      labelCountry,
      availableCountries,
      availableAirports,
      homeCountryLabel,
      homeAirportLabel,
      hydrated,
    };
  }, [hydrated, settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used within SettingsProvider");
  return value;
}
