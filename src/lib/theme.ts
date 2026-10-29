import type { ThemeName } from "./types";

/** Small key so the page can paint the right theme before the CRM data loads. */
export const THEME_STORAGE_KEY = "mkstudios.theme";

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode can block storage; the attribute still switches the theme.
  }
}
