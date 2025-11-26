const SUPPORTED_LANGUAGES = ["en", "nl"];
const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "svo-lang";

let currentLang = DEFAULT_LANGUAGE;
let translations = {};
const translationCache = {};

function isSupportedLanguage(lang) {
  return typeof lang === "string" && SUPPORTED_LANGUAGES.includes(lang.toLowerCase());
}

function detectPreferredLanguage() {
  const preferred = navigator.languages || [navigator.language || DEFAULT_LANGUAGE];
  if (preferred.some((lang) => typeof lang === "string" && lang.toLowerCase().startsWith("nl"))) {
    return "nl";
  }
  return DEFAULT_LANGUAGE;
}

function getStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to access localStorage for language preference", error);
    return null;
  }
}

function setStoredLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (error) {
    console.warn("Unable to persist language preference", error);
  }
}

async function loadTranslations(lang) {
  const normalized = isSupportedLanguage(lang) ? lang.toLowerCase() : DEFAULT_LANGUAGE;
  if (translationCache[normalized]) {
    return translationCache[normalized];
  }

  const response = await fetch(`./translations/${normalized}.json`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load translations for ${normalized}`);
  }
  const data = await response.json();
  translationCache[normalized] = data;
  return data;
}

function toDatasetKey(attr) {
  if (!attr || attr === "text") {
    return "i18nFallbackText";
  }
  if (attr === "html") {
    return "i18nFallbackHtml";
  }
  const parts = attr.split("-").filter(Boolean);
  const camel = parts
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");
  return `i18nFallback${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

function getFallbackValue(element, attr) {
  const key = toDatasetKey(attr);
  if (!element.dataset[key]) {
    let value = "";
    if (!attr || attr === "text") {
      value = element.textContent.trim();
    } else if (attr === "html") {
      value = element.innerHTML;
    } else {
      value = element.getAttribute(attr) || "";
    }
    element.dataset[key] = value;
  }
  return element.dataset[key];
}

function setElementValue(element, attr, value) {
  if (attr === "html") {
    element.innerHTML = value;
  } else if (!attr || attr === "text") {
    element.textContent = value;
  } else {
    element.setAttribute(attr, value);
  }
}

export function applyTranslations(root = document) {
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (!key) {
      return;
    }
    const attrList = element.getAttribute("data-i18n-attr");
    if (attrList) {
      attrList
        .split(",")
        .map((attr) => attr.trim())
        .filter(Boolean)
        .forEach((attr) => {
          const fallback = getFallbackValue(element, attr);
          const translation = t(key, fallback);
          setElementValue(element, attr, translation);
        });
    } else {
      const fallback = getFallbackValue(element, "text");
      const translation = t(key, fallback);
      setElementValue(element, "text", translation);
    }
  });
}

function setDocumentLanguage(lang) {
  document.documentElement.setAttribute("lang", lang);
}

async function applyLanguage(lang, { persist }) {
  let target = isSupportedLanguage(lang) ? lang.toLowerCase() : DEFAULT_LANGUAGE;
  try {
    translations = await loadTranslations(target);
    currentLang = target;
  } catch (error) {
    console.error(error);
    if (target !== DEFAULT_LANGUAGE) {
      translations = await loadTranslations(DEFAULT_LANGUAGE);
      currentLang = DEFAULT_LANGUAGE;
      target = DEFAULT_LANGUAGE;
    } else {
      return;
    }
  }

  setDocumentLanguage(currentLang);
  applyTranslations();

  if (persist) {
    setStoredLanguage(currentLang);
  }
}

export async function initI18n() {
  const stored = getStoredLanguage();
  const initial = isSupportedLanguage(stored) ? stored.toLowerCase() : detectPreferredLanguage();
  await applyLanguage(initial, { persist: false });
}

export async function changeLanguage(lang) {
  await applyLanguage(lang, { persist: true });
}

export function t(key, fallback = "") {
  if (translations && Object.prototype.hasOwnProperty.call(translations, key)) {
    return translations[key];
  }
  const defaultTranslations = translationCache[DEFAULT_LANGUAGE];
  if (defaultTranslations && Object.prototype.hasOwnProperty.call(defaultTranslations, key)) {
    return defaultTranslations[key];
  }
  return fallback || key;
}

export function getCurrentLanguage() {
  return currentLang;
}
