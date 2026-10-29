import { PROJECT_VALUE_BY_TIER } from "./constants";
import { DEFAULT_SCORING } from "./scoring";
import type { AppSettings } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  userName: "Mick",
  companyName: "MK Studios",
  companyWebsite: "",
  email: "mkstudios2026@outlook.com",
  defaultRadiusKm: 25,
  defaultMinRating: 0,
  defaultMinReviews: 0,
  notifyFollowUps: true,
  notifyHotLeads: true,
  scoring: DEFAULT_SCORING,
  projectValues: { ...PROJECT_VALUE_BY_TIER },
};

/** Merges saved (possibly older/partial) settings with the defaults. */
export function mergeSettings(saved: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    theme: saved?.theme === "light" ? "light" : "dark",
    scoring: { ...DEFAULT_SETTINGS.scoring, ...saved?.scoring },
    projectValues: { ...DEFAULT_SETTINGS.projectValues, ...saved?.projectValues },
  };
}
