export type Locale = 'ru' | 'en';
export type GenomeId = 'biomass' | 'predator' | 'parasite' | 'cyber' | 'psi' | 'abyss';
export type BackgroundId = 'void' | 'neon' | 'biolab' | 'reactor' | 'abyss';

export type GenomeDefinition = {
  id: GenomeId;
  unlockResearch: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  forms: Record<Locale, string[]>;
  colors: number[];
};

export type BackgroundDefinition = {
  id: BackgroundId;
  cost: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  preview: [number, number, number];
};

export const GENOMES: GenomeDefinition[] = [
  {
    id: 'biomass', unlockResearch: 0,
    name: { ru: 'Биомасса', en: 'Biomass' },
    description: { ru: 'Базовая органическая линия', en: 'Baseline organic line' },
    forms: {
      ru: ['Спора', 'Клетка', 'Слизень', 'Глазастик', 'Хвататель', 'Пульсар', 'Шиповик', 'Хищник', 'Пси-форма', 'Титан', 'Омега'],
      en: ['Spore', 'Cell', 'Slime', 'Watcher', 'Grasper', 'Pulsar', 'Spiker', 'Predator', 'Psi Form', 'Titan', 'Omega']
    },
    colors: [0x72e06a, 0x30d5c8, 0x58a6ff, 0x8d72e1, 0xd267e3, 0xff6b9a, 0xff7a59, 0xffb347, 0xf4e04d, 0xb8ef5a, 0xffffff]
  },
  {
    id: 'predator', unlockResearch: 800,
    name: { ru: 'Хищная линия', en: 'Predator Line' },
    description: { ru: 'Клыки, рога и агрессивные формы', en: 'Fangs, horns and aggressive forms' },
    forms: {
      ru: ['Икра', 'Личинка', 'Коготь', 'Пасть', 'Скакун', 'Раптор', 'Альфа', 'Крушитель', 'Цербер', 'Левиафан', 'Апекс'],
      en: ['Spawn', 'Larva', 'Claw', 'Maw', 'Stalker', 'Raptor', 'Alpha', 'Crusher', 'Cerberus', 'Leviathan', 'Apex']
    },
    colors: [0xd8ef8a, 0xb9e769, 0x91d84f, 0x70c345, 0xe8c448, 0xe39a3f, 0xdd7040, 0xd14949, 0xb63d58, 0x8e344e, 0x55243f]
  },
  {
    id: 'parasite', unlockResearch: 2500,
    name: { ru: 'Паразитарная линия', en: 'Parasite Line' },
    description: { ru: 'Колонии, коконы и захватчики', en: 'Colonies, cocoons and invaders' },
    forms: {
      ru: ['Яйцо', 'Червь', 'Присоска', 'Носитель', 'Споронос', 'Захватчик', 'Кокон', 'Пожиратель', 'Колония', 'Матка', 'Улей'],
      en: ['Egg', 'Worm', 'Sucker', 'Carrier', 'Sporehost', 'Invader', 'Cocoon', 'Devourer', 'Colony', 'Queen', 'Hive']
    },
    colors: [0xc7ef92, 0x9edb78, 0x68c982, 0x48b28f, 0x529b95, 0x707f9d, 0x8c6598, 0xaa5387, 0xc24570, 0xde5269, 0xf47a6f]
  },
  {
    id: 'cyber', unlockResearch: 6000,
    name: { ru: 'Кибермутация', en: 'Cyber Mutation' },
    description: { ru: 'Синтетические организмы и машины', en: 'Synthetic organisms and machines' },
    forms: {
      ru: ['Искра', 'Чип', 'Дрон', 'Скаут', 'Узел', 'Турель', 'Синт', 'Страж', 'Меха', 'Колосс', 'Сингуляр'],
      en: ['Spark', 'Chip', 'Drone', 'Scout', 'Node', 'Turret', 'Synth', 'Sentinel', 'Mecha', 'Colossus', 'Singular']
    },
    colors: [0x84f3ff, 0x58d9ff, 0x32bfff, 0x3f9cff, 0x5b7eff, 0x735de5, 0x8b48c8, 0xaa3fac, 0xce438c, 0xee5e7a, 0xffffff]
  },
  {
    id: 'psi', unlockResearch: 12000,
    name: { ru: 'Пси-формы', en: 'Psi Forms' },
    description: { ru: 'Энергетическая и ментальная эволюция', en: 'Energetic and mental evolution' },
    forms: {
      ru: ['Импульс', 'Эхо', 'Взор', 'Шепот', 'Мираж', 'Оракул', 'Разлом', 'Архонт', 'Ноосфера', 'Аватар', 'Омни'],
      en: ['Pulse', 'Echo', 'Gaze', 'Whisper', 'Mirage', 'Oracle', 'Rift', 'Archon', 'Noosphere', 'Avatar', 'Omni']
    },
    colors: [0xbefcff, 0xa5e9ff, 0xa6cfff, 0xb8b6ff, 0xca9cff, 0xdf88f5, 0xf27fdd, 0xff84c5, 0xff9aae, 0xffbea0, 0xfff1bb]
  },
  {
    id: 'abyss', unlockResearch: 22000,
    name: { ru: 'Бездна', en: 'Abyss' },
    description: { ru: 'Формы из-за границы камеры', en: 'Forms from beyond the chamber' },
    forms: {
      ru: ['Пыль', 'Тень', 'Осколок', 'Пасть', 'Щупальце', 'Безликий', 'Провал', 'Кошмар', 'Бездна', 'Древний', 'Ничто'],
      en: ['Dust', 'Shade', 'Shard', 'Maw', 'Tentacle', 'Faceless', 'Voidfall', 'Nightmare', 'Abyss', 'Ancient', 'Nothing']
    },
    colors: [0x8790a5, 0x74778f, 0x675e82, 0x644c78, 0x6b3d72, 0x78356d, 0x872f64, 0x942d58, 0xa8324c, 0xc1484c, 0xf06b5d]
  }
];

export const BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: 'void', cost: 0,
    name: { ru: 'Тёмная камера', en: 'Dark Chamber' },
    description: { ru: 'Базовый фон', en: 'Default background' },
    preview: [0x0b1019, 0x151d2b, 0x42536c]
  },
  {
    id: 'neon', cost: 1000,
    name: { ru: 'Неоновая лаборатория', en: 'Neon Lab' },
    description: { ru: 'Первый косметический апгрейд', en: 'First cosmetic upgrade' },
    preview: [0x07151c, 0x0b3948, 0x2de2e6]
  },
  {
    id: 'biolab', cost: 2500,
    name: { ru: 'Биокапсула', en: 'Bio Vat' },
    description: { ru: 'Живая органическая камера', en: 'Living organic chamber' },
    preview: [0x11150e, 0x27351c, 0x8fdc58]
  },
  {
    id: 'reactor', cost: 6000,
    name: { ru: 'Реактор', en: 'Reactor' },
    description: { ru: 'Тёплое ядро и силовые контуры', en: 'Hot core and power conduits' },
    preview: [0x160e09, 0x472218, 0xff9f43]
  },
  {
    id: 'abyss', cost: 12000,
    name: { ru: 'Портал Бездны', en: 'Abyss Gate' },
    description: { ru: 'Редкий поздний фон', en: 'Rare late-game background' },
    preview: [0x09070f, 0x241235, 0xb15cff]
  }
];

export const genomeById = (id: GenomeId) => GENOMES.find((item) => item.id === id) ?? GENOMES[0];
export const backgroundById = (id: BackgroundId) => BACKGROUNDS.find((item) => item.id === id) ?? BACKGROUNDS[0];
