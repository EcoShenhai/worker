import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.json';
import fr from './locales/fr.json';

// 72 UI languages, native names. Translated dictionaries live in ./locales/.
// Any language (or key) without a translation falls back to English.
export const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'dv']);

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'ko', label: '한국어' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'fa', label: 'فارسی' },
  { code: 'ro', label: 'Română' },
  { code: 'sv', label: 'Svenska' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'sq', label: 'Shqip' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'hy', label: 'Հայերեն' },
  { code: 'az', label: 'Azərbaycan dili' },
  { code: 'be', label: 'Беларуская' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'bs', label: 'Bosanski' },
  { code: 'bg', label: 'Български' },
  { code: 'my', label: 'မြန်မာ' },
  { code: 'ca', label: 'Català' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'cs', label: 'Čeština' },
  { code: 'da', label: 'Dansk' },
  { code: 'dv', label: 'ދިވެހި' },
  { code: 'et', label: 'Eesti' },
  { code: 'fil', label: 'Filipino' },
  { code: 'fi', label: 'Suomi' },
  { code: 'ka', label: 'ქართული' },
  { code: 'kl', label: 'Kalaallisut' },
  { code: 'he', label: 'עברית' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'hu', label: 'Magyar' },
  { code: 'is', label: 'Íslenska' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ga', label: 'Gaeilge' },
  { code: 'ja', label: '日本語' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'km', label: 'ខ្មែរ' },
  { code: 'ky', label: 'Кыргызча' },
  { code: 'lo', label: 'ລາວ' },
  { code: 'lv', label: 'Latviešu' },
  { code: 'lt', label: 'Lietuvių' },
  { code: 'mk', label: 'Македонски' },
  { code: 'mt', label: 'Malti' },
  { code: 'mn', label: 'Монгол' },
  { code: 'cnr', label: 'Crnogorski' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'no', label: 'Norsk' },
  { code: 'pl', label: 'Polski' },
  { code: 'sr', label: 'Српски' },
  { code: 'si', label: 'සිංහල' },
  { code: 'sk', label: 'Slovenčina' },
  { code: 'sl', label: 'Slovenščina' },
  { code: 'so', label: 'Soomaali' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'tg', label: 'Тоҷикӣ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'tet', label: 'Tetum' },
  { code: 'th', label: 'ไทย' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'tk', label: 'Türkmençe' },
  { code: 'uk', label: 'Українська' },
  { code: 'ur', label: 'اردو' },
  { code: 'uz', label: 'O‘zbek' },
  { code: 'vi', label: 'Tiếng Việt' },
];

const DICTS = { en, fr };
const STORAGE_KEY = 'worker.lang';
const isSupported = (code) => LANGS.some((l) => l.code === code);

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isSupported(saved)) return saved;
  } catch { /* storage unavailable */ }
  return 'en';
}

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  // The language actually rendered: selected one if translated, else English.
  const rendered = DICTS[lang] ? lang : 'en';
  const dir = RTL_LANGS.has(rendered) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = rendered;
    document.documentElement.dir = dir;
  }, [rendered, dir]);

  const setLang = useCallback((code) => {
    if (!isSupported(code)) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key, vars) => {
    const val = lookup(DICTS[rendered], key) ?? lookup(DICTS.en, key) ?? key;
    return interpolate(val, vars);
  }, [rendered]);

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, setLang, t, dir]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Safe even outside the provider: falls back to English.
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    lang: 'en', setLang: () => {}, dir: 'ltr',
    t: (key, vars) => interpolate(lookup(DICTS.en, key) ?? key, vars),
  };
}
