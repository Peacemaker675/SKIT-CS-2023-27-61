import { useSyncExternalStore } from "react";

// Light/dark theme. With no saved choice the app follows the OS setting;
// clicking the toggle saves "light" or "dark" and sets <html data-theme>,
// which index.css uses to pick the colour tokens.
const STORAGE_KEY = "intelliroute.theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();
// Last choice made on this page, used when localStorage is unavailable.
let pageChoice = null;

function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // storage blocked (e.g. some private modes)
  }
  return pageChoice;
}

function currentTheme() {
  return readSaved() || (darkQuery.matches ? "dark" : "light");
}

function notify() {
  for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

darkQuery.addEventListener("change", notify);

export function setTheme(theme) {
  pageChoice = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable - still switch for this page view
  }
  document.documentElement.dataset.theme = theme;
  notify();
}

// Returns the active theme ("light" | "dark") and a toggle function.
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme);
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");
  return { theme, toggle };
}
