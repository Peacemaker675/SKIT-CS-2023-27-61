import { useSyncExternalStore } from "react";
import en from "./en.json";
import hi from "./hi.json";

// English / Hindi UI text. English is the default; the choice is saved and
// set as <html lang>. Works like theme/theme.js.
//
// Text from the backend or data (intersection names, lane ids, phases) is
// shown as sent and not translated here.
export const LANGUAGES = { en, hi };
const STORAGE_KEY = "intelliroute.lang";
const listeners = new Set();
// Last choice on this page, in case localStorage is blocked.
let pageChoice = null;

function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value in LANGUAGES) return value;
  } catch {
    // storage blocked or not available (tests)
  }
  return pageChoice;
}

function currentLang() {
  return readSaved() || "en";
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function lookup(dict, key) {
  return key
    .split(".")
    .reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

// Text for `key` in `lang`, with {name} placeholders filled from `vars`.
// Falls back to English, then to the key itself, so a missing Hindi entry
// never shows a blank.
export function translate(lang, key, vars) {
  let text = lookup(LANGUAGES[lang], key);
  if (typeof text !== "string") text = lookup(en, key);
  if (typeof text !== "string") return key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function setLang(lang) {
  pageChoice = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage unavailable - still switch for this page view
  }
  document.documentElement.lang = lang;
  for (const fn of listeners) fn();
}

// Current language, t(key, vars) for it, and a toggle between en and hi.
export function useT() {
  const lang = useSyncExternalStore(subscribe, currentLang, () => "en");
  const t = (key, vars) => translate(lang, key, vars);
  const toggle = () => setLang(lang === "hi" ? "en" : "hi");
  return { lang, t, toggle };
}
