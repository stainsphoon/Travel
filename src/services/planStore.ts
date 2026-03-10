import AsyncStorage from "@react-native-async-storage/async-storage";
import { SavedPlan } from "../types";

const PLAN_STORAGE_KEY = "tripvibe.plans.v1";

export async function loadPlans(): Promise<SavedPlan[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlan[];
  } catch {
    return [];
  }
}

export async function savePlan(input: Omit<SavedPlan, "id" | "createdAt">): Promise<SavedPlan> {
  const current = await loadPlans();
  const plan: SavedPlan = {
    id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const next = [plan, ...current].slice(0, 100);
  await AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next));
  return plan;
}
