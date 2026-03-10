import AsyncStorage from "@react-native-async-storage/async-storage";
import { VoyagePage } from "../types";

const STORAGE_V3 = "tripvibe.voyage.pages.v3";
const STORAGE_V2 = "tripvibe.voyage.pages.v2";
const MAX_PAGES = 30;

type LegacyV2Page = {
  id: string;
  pageNo: number;
  countryLabel?: string;
  countryCode?: string;
  city: string;
  note: string;
  createdAt: string;
  photoUri?: string;
  photoUris?: string[];
};

function toCountryText(page: LegacyV2Page) {
  if (page.countryLabel && page.countryLabel.length > 0) return page.countryLabel;
  if (page.countryCode && page.countryCode.length > 0) return page.countryCode;
  return "Unknown";
}

function migrateV2ToV3(input: LegacyV2Page[]): VoyagePage[] {
  return input.map((page, index) => ({
    id: page.id,
    pageNo: page.pageNo || index + 1,
    title: `Untitled Page ${index + 1}`,
    country: toCountryText(page),
    city: page.city ?? "",
    note: page.note ?? "",
    photoUri: page.photoUri,
    photoUris: page.photoUris ?? (page.photoUri ? [page.photoUri] : []),
    createdAt: page.createdAt ?? new Date().toISOString(),
  }));
}

export async function loadVoyagePages(): Promise<VoyagePage[]> {
  try {
    const rawV3 = await AsyncStorage.getItem(STORAGE_V3);
    if (rawV3) return JSON.parse(rawV3) as VoyagePage[];

    const rawV2 = await AsyncStorage.getItem(STORAGE_V2);
    if (!rawV2) return [];

    const v2Data = JSON.parse(rawV2) as LegacyV2Page[];
    const migrated = migrateV2ToV3(v2Data);
    await AsyncStorage.setItem(STORAGE_V3, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

export async function saveVoyagePage(
  input: Omit<VoyagePage, "id" | "pageNo" | "createdAt">,
): Promise<VoyagePage> {
  const current = await loadVoyagePages();
  if (current.length >= MAX_PAGES) {
    throw new Error("voyage_page_limit_reached");
  }
  const page: VoyagePage = {
    id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
    pageNo: current.length + 1,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const next = [...current, page];
  await AsyncStorage.setItem(STORAGE_V3, JSON.stringify(next));
  return page;
}

export async function updateVoyagePage(
  pageId: string,
  patch: Omit<VoyagePage, "id" | "pageNo" | "createdAt">,
): Promise<VoyagePage> {
  const current = await loadVoyagePages();
  const index = current.findIndex((item) => item.id === pageId);
  if (index < 0) {
    throw new Error("voyage_page_not_found");
  }

  const existing = current[index];
  const updated: VoyagePage = {
    ...existing,
    ...patch,
    id: existing.id,
    pageNo: existing.pageNo,
    createdAt: existing.createdAt,
  };

  const next = [...current];
  next[index] = updated;
  await AsyncStorage.setItem(STORAGE_V3, JSON.stringify(next));
  return updated;
}
