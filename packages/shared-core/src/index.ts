export type Locale = 'ru' | 'en';

export function detectLocale(): Locale {
  const platformLang = (globalThis as any).__YG_LANG__;
  const lang = (typeof platformLang === 'string' && platformLang.length > 0
    ? platformLang
    : navigator.language
  ).toLowerCase();
  return lang.startsWith('ru') ? 'ru' : 'en';
}

export function loadLocalSave<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
