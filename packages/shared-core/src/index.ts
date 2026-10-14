export type Locale = 'ru' | 'en';

export function detectLocale(): Locale {
  const lang = navigator.language.toLowerCase();
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
