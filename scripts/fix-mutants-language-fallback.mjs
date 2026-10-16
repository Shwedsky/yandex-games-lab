import fs from 'node:fs';

const path = 'apps/mutants-merge/src/game.ts';
let source = fs.readFileSync(path, 'utf8');
const before = `  const platformLanguage = yandexBridge.getLanguage(detectLocale());\n  locale = platformLanguage.startsWith('ru') ? 'ru' : 'en';`;
const after = `  const platformLanguage = yandexBridge.getLanguage(detectLocale()).toLowerCase();\n  // Yandex fallback set for a game that ships RU + EN only:\n  // be/kk/uk/uz -> RU, every other unsupported platform language -> EN.\n  locale = ['ru', 'be', 'kk', 'uk', 'uz'].includes(platformLanguage) ? 'ru' : 'en';`;
if (!source.includes(before)) throw new Error('Mutants language bootstrap anchor not found');
source = source.replace(before, after);
fs.writeFileSync(path, source);
