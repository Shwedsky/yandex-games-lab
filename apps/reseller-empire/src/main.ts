import { loadLocalSave, saveLocal, type Locale } from '@yg-lab/shared-core';
import { yandexBridge } from '@yg-lab/yandex-bridge';

type Category = 'household' | 'bike' | 'phone' | 'electronics' | 'collectible';
type Stage = 'garage' | 'kiosk' | 'shop';
type ItemState = 'owned' | 'listed';

type MarketItem = {
  id: string;
  category: Category;
  title: string;
  icon: string;
  condition: number;
  rarity: number;
  defect: boolean;
  fairValue: number;
  ask: number;
  sellerMood: number;
  revealed: boolean;
  negotiationRounds: number;
};

type OwnedItem = MarketItem & {
  paid: number;
  repairSpent: number;
  prepCount: number;
  state: ItemState;
  listedPrice?: number;
};

type BuyerOffer = {
  itemId: string;
  buyer: string;
  personality: string;
  amount: number;
  patience: number;
  rounds: number;
};

type Save = {
  version: 2;
  day: number;
  cash: number;
  reputation: number;
  lifetimeProfit: number;
  deals: number;
  stage: Stage;
  inventory: OwnedItem[];
  marketSeed: number;
  logs: string[];
};

type StageConfig = {
  slots: number;
  estimateWidth: number;
  marketFactor: number;
  next?: Stage;
  requiredRep?: number;
  upgradeCost?: number;
};

const SAVE_KEY = 'yg-reseller-v2';
const START_CASH = 5000;
const MAX_MARKET = 6;

const STAGE_CONFIG: Record<Stage, StageConfig> = {
  garage: { slots: 4, estimateWidth: .28, marketFactor: .58, next: 'kiosk', requiredRep: 14, upgradeCost: 12000 },
  kiosk: { slots: 7, estimateWidth: .16, marketFactor: .9, next: 'shop', requiredRep: 45, upgradeCost: 60000 },
  shop: { slots: 10, estimateWidth: .08, marketFactor: 1.25 }
};

const CATEGORIES: Record<Category, { ru: string[]; en: string[]; icon: string; base: [number, number] }> = {
  household: { ru: ['Кофеварка', 'Настольная лампа', 'Пылесос', 'Набор инструментов', 'Винтажный вентилятор'], en: ['Coffee Maker', 'Desk Lamp', 'Vacuum', 'Tool Set', 'Vintage Fan'], icon: '🏠', base: [700, 3500] },
  bike: { ru: ['Городской велосипед', 'BMX', 'Горный велосипед', 'Самокат', 'Складной велосипед'], en: ['City Bike', 'BMX', 'Mountain Bike', 'Scooter', 'Folding Bike'], icon: '🚲', base: [1800, 12000] },
  phone: { ru: ['Смартфон', 'Компактный телефон', 'Игровой смартфон', 'Планшет', 'Умные часы'], en: ['Smartphone', 'Compact Phone', 'Gaming Phone', 'Tablet', 'Smart Watch'], icon: '📱', base: [2500, 25000] },
  electronics: { ru: ['Монитор', 'Игровая приставка', 'Колонки', 'Ноутбук', 'Проектор'], en: ['Monitor', 'Game Console', 'Speakers', 'Laptop', 'Projector'], icon: '💻', base: [3000, 32000] },
  collectible: { ru: ['Редкая фигурка', 'Старая камера', 'Виниловый проигрыватель', 'Коллекционные часы', 'Постер в раме'], en: ['Rare Figure', 'Old Camera', 'Turntable', 'Collectible Watch', 'Framed Poster'], icon: '🧿', base: [1600, 28000] }
};

const TEXT = {
  ru: {
    title: 'Перекуп: с гаража до империи', subtitle: 'Покупай дешевле · торгуйся · улучшай · продавай дороже',
    day: 'День', cash: 'Касса', rep: 'Репутация', profit: 'Прибыль', business: 'Бизнес', inventory: 'Инвентарь',
    feed: 'Свежие объявления', marketHint: 'Ищи недооценённые вещи и следи за трендом дня.', owned: 'Твои вещи', listed: 'На продаже',
    buy: 'Купить', negotiate: 'Торговаться', reveal: 'Точная оценка', repair: 'Подготовить', list: 'Выставить', buyer: 'Покупатель',
    accept: 'Принять', reject: 'Отказать', refresh: 'Обновить рынок', instant: 'Найти покупателя', endDay: 'Закончить день',
    estimate: 'Оценка', ask: 'Цена продавца', condition: 'Состояние', defect: 'Есть дефект', clean: 'Без явных дефектов', paid: 'Вложено', expected: 'Ожидаемая продажа',
    emptyInv: 'Пока пусто. Выбери первую сделку на рынке.', emptyListed: 'Нет активных предложений покупателя.', activity: 'История сделок',
    garage: 'Гараж', kiosk: 'Киоск', shop: 'Магазин', slots: 'мест', noMoney: 'Не хватает денег', full: 'Нет свободного места', sold: 'Продано',
    language: 'EN', rescue: 'Аварийный лот', ad: 'ТЕСТОВАЯ РЕКЛАМА', adNote: 'Имитация rewarded · 1,4 сек', sellerSays: 'Продавец просит',
    walk: 'Уйти', offerLow: 'Снизить на 10%', offerMed: 'Снизить на 5%', buyerOffers: 'Покупатель предлагает', counter5: '+5%', counter10: '+10%',
    profitDeal: 'Прибыль со сделки', lossDeal: 'Убыток со сделки'
  },
  en: {
    title: 'Reseller: Garage to Empire', subtitle: 'Buy low · negotiate · improve · sell higher',
    day: 'Day', cash: 'Cash', rep: 'Reputation', profit: 'Profit', business: 'Business', inventory: 'Inventory',
    feed: 'Fresh listings', marketHint: 'Find underpriced items and watch today’s trend.', owned: 'Your items', listed: 'Listed',
    buy: 'Buy', negotiate: 'Negotiate', reveal: 'Exact estimate', repair: 'Prep', list: 'List', buyer: 'Buyer', accept: 'Accept', reject: 'Reject',
    refresh: 'Refresh market', instant: 'Find buyer', endDay: 'End day', estimate: 'Estimate', ask: 'Seller ask', condition: 'Condition', defect: 'Has a defect', clean: 'No obvious defects',
    paid: 'Invested', expected: 'Expected sale', emptyInv: 'Empty for now. Pick your first market deal.', emptyListed: 'No active buyer offer.', activity: 'Deal history',
    garage: 'Garage', kiosk: 'Kiosk', shop: 'Shop', slots: 'slots', noMoney: 'Not enough cash', full: 'No free inventory slots', sold: 'Sold', language: 'RU',
    rescue: 'Rescue lot', ad: 'TEST AD', adNote: 'Rewarded simulation · 1.4 sec', sellerSays: 'Seller asks', walk: 'Walk away', offerLow: 'Offer -10%', offerMed: 'Offer -5%',
    buyerOffers: 'Buyer offers', counter5: '+5%', counter10: '+10%', profitDeal: 'Deal profit', lossDeal: 'Deal loss'
  }
} as const;

let locale: Locale = 'ru';
let save: Save;
let market: MarketItem[] = [];
let buyerOffer: BuyerOffer | null = null;
let negotiationItem: MarketItem | null = null;
let toastTimer = 0;

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');

function money(value: number) {
  return `${Math.round(value).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
}
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function stageLabel(stage: Stage) { return TEXT[locale][stage]; }
function stageInfo() { return { stage: save.stage, ...STAGE_CONFIG[save.stage] }; }
function inventorySlots() { return STAGE_CONFIG[save.stage].slots; }
function ownedCount() { return save.inventory.length; }
function getOwned(id: string) { return save.inventory.find((x) => x.id === id); }
function categoryLabel(category: Category) {
  const ru: Record<Category, string> = { household: 'бытовая техника', bike: 'велосипеды', phone: 'гаджеты', electronics: 'электроника', collectible: 'коллекционное' };
  const en: Record<Category, string> = { household: 'household', bike: 'bikes', phone: 'gadgets', electronics: 'electronics', collectible: 'collectibles' };
  return (locale === 'ru' ? ru : en)[category];
}
function normalizeSave(raw: Partial<Save>): Save {
  const stage: Stage = raw.stage === 'kiosk' || raw.stage === 'shop' ? raw.stage : 'garage';
  const inventory: OwnedItem[] = Array.isArray(raw.inventory)
    ? raw.inventory.map((item) => ({ ...item, prepCount: clamp(Number(item.prepCount ?? 0), 0, 1), negotiationRounds: Number(item.negotiationRounds ?? 0) }))
    : [];
  return {
    version: 2,
    day: Math.max(1, raw.day ?? 1),
    cash: Math.max(0, raw.cash ?? START_CASH),
    reputation: Math.max(0, raw.reputation ?? 0),
    lifetimeProfit: raw.lifetimeProfit ?? 0,
    deals: Math.max(0, raw.deals ?? 0),
    stage,
    inventory,
    marketSeed: raw.marketSeed ?? 20261014,
    logs: Array.isArray(raw.logs) ? raw.logs.slice(0, 16) : []
  };
}
function persist() { saveLocal(SAVE_KEY, save); }
function log(message: string) { save.logs.unshift(message); save.logs = save.logs.slice(0, 16); persist(); }
function toast(message: string) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.remove(), 2200);
}

function marketTrend() {
  const categories = Object.keys(CATEGORIES) as Category[];
  const random = rng(700001 + save.day * 3571);
  const hot = categories[Math.floor(random() * categories.length)];
  let cold = categories[Math.floor(random() * categories.length)];
  if (cold === hot) cold = categories[(categories.indexOf(hot) + 2) % categories.length];
  return { hot, cold, hotBonus: .15, coldPenalty: .08 };
}
function demandMultiplier(category: Category) {
  const trend = marketTrend();
  if (category === trend.hot) return 1 + trend.hotBonus;
  if (category === trend.cold) return 1 - trend.coldPenalty;
  return 1;
}
function trendText() {
  const trend = marketTrend();
  return locale === 'ru'
    ? `Сегодня: 📈 ${categoryLabel(trend.hot)} +15% · 📉 ${categoryLabel(trend.cold)} -8%`
    : `Today: 📈 ${categoryLabel(trend.hot)} +15% · 📉 ${categoryLabel(trend.cold)} -8%`;
}

function categoryPool(): Category[] {
  if (save.stage === 'garage') return ['household', 'household', 'household', 'bike', 'bike', 'phone'];
  if (save.stage === 'kiosk') return ['household', 'bike', 'phone', 'phone', 'electronics', 'electronics'];
  return ['household', 'bike', 'phone', 'electronics', 'electronics', 'collectible', 'collectible'];
}
function generateMarket() {
  const random = rng(save.marketSeed + save.day * 7919 + save.reputation * 31);
  const pool = categoryPool();
  const stageCfg = STAGE_CONFIG[save.stage];
  const dayFactor = 1 + Math.min(8, save.day - 1) * .02;
  market = Array.from({ length: MAX_MARKET }, (_, i) => {
    const category = pool[Math.floor(random() * pool.length)];
    const data = CATEGORIES[category];
    const names = data[locale];
    const condition = Math.round(38 + random() * 60);
    const rarityRoll = random();
    const rarity = save.stage === 'garage'
      ? (rarityRoll < .12 ? 2 : 1)
      : save.stage === 'kiosk'
        ? (rarityRoll < .05 ? 3 : rarityRoll < .24 ? 2 : 1)
        : (rarityRoll < .12 ? 3 : rarityRoll < .36 ? 2 : 1);
    const defect = random() < (save.stage === 'garage' ? .28 : .21);
    const base = (data.base[0] + random() * (data.base[1] - data.base[0])) * stageCfg.marketFactor * dayFactor;
    const conditionFactor = .5 + condition / 195;
    const rarityFactor = rarity === 3 ? 1.55 : rarity === 2 ? 1.2 : 1;
    const defectFactor = defect ? .7 : 1;
    const fairValue = Math.max(250, Math.round(base * conditionFactor * rarityFactor * defectFactor / 50) * 50);
    const moodBase = save.stage === 'garage' ? .9 : save.stage === 'kiosk' ? .88 : .86;
    const moodRange = save.stage === 'garage' ? .25 : save.stage === 'kiosk' ? .3 : .34;
    const sellerMood = moodBase + random() * moodRange;
    const ask = Math.max(250, Math.round(fairValue * sellerMood / 50) * 50);
    return {
      id: `d${save.day}-${save.marketSeed}-${i}`,
      category,
      title: names[Math.floor(random() * names.length)],
      icon: data.icon,
      condition,
      rarity,
      defect,
      fairValue,
      ask,
      sellerMood,
      revealed: false,
      negotiationRounds: 0
    };
  });
}
function estimate(item: MarketItem) {
  const width = STAGE_CONFIG[save.stage].estimateWidth;
  if (item.revealed) return [item.fairValue, item.fairValue];
  return [Math.round(item.fairValue * (1 - width) / 50) * 50, Math.round(item.fairValue * (1 + width) / 50) * 50];
}
function resaleValue(item: MarketItem | OwnedItem) {
  const prep = 'repairSpent' in item ? Math.min(.06, item.repairSpent / Math.max(1, item.fairValue) * .45) : 0;
  return Math.max(250, Math.round(item.fairValue * (1.03 + prep) * demandMultiplier(item.category) / 50) * 50);
}

async function rewarded(effect: () => void, eventName: string) {
  const overlay = document.createElement('div');
  if (yandexBridge.isMockMode()) {
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `<div class="ad-card"><strong>${TEXT[locale].ad}</strong><span>${TEXT[locale].adNote}</span></div>`;
    document.body.appendChild(overlay);
  }
  yandexBridge.gameplayStop();
  const ok = await yandexBridge.showRewardedAndWait(12000);
  overlay.remove();
  if (ok) {
    effect();
    (globalThis as any).__RESELLER_TELEMETRY__ ??= {};
    (globalThis as any).__RESELLER_TELEMETRY__[eventName] = ((globalThis as any).__RESELLER_TELEMETRY__[eventName] ?? 0) + 1;
  } else toast(locale === 'ru' ? 'Реклама сейчас недоступна' : 'Ad unavailable');
  yandexBridge.gameplayStart();
  render();
}

function buy(item: MarketItem, price = item.ask) {
  if (ownedCount() >= inventorySlots()) return toast(TEXT[locale].full);
  if (save.cash < price) return toast(TEXT[locale].noMoney);
  save.cash -= price;
  save.inventory.push({ ...item, paid: price, repairSpent: 0, prepCount: 0, state: 'owned' });
  market = market.filter((x) => x.id !== item.id);
  negotiationItem = null;
  log(`${locale === 'ru' ? 'Куплено' : 'Bought'}: ${item.title} · ${money(price)}`);
  persist();
  render();
}
function startNegotiation(item: MarketItem) {
  negotiationItem = item;
  render();
}
function sellerCounter(item: MarketItem, offer: number) {
  if (item.negotiationRounds >= 2) return;
  item.negotiationRounds += 1;
  const floor = Math.round(item.fairValue * (.84 + Math.max(0, item.sellerMood - .9) * .18) / 50) * 50;
  if (offer >= floor) {
    item.ask = offer;
    toast(locale === 'ru' ? `Продавец согласен на ${money(offer)}. Теперь подтверди покупку.` : `Seller agrees to ${money(offer)}. Now confirm the purchase.`);
    render();
    return;
  }
  const counter = Math.max(floor, Math.round(((item.ask + Math.max(offer, floor)) / 2) / 50) * 50);
  item.ask = counter;
  toast(item.negotiationRounds >= 2
    ? (locale === 'ru' ? `Финальная цена продавца: ${money(counter)}` : `Seller final price: ${money(counter)}`)
    : (locale === 'ru' ? `Продавец предлагает ${money(counter)}` : `Seller counters ${money(counter)}`));
  render();
}
function repair(item: OwnedItem) {
  if (item.state !== 'owned') return;
  if (item.prepCount >= 1) return toast(locale === 'ru' ? 'Этот предмет уже подготовлен: 1/1' : 'This item is already prepped: 1/1');
  const cost = Math.max(150, Math.round(item.fairValue * (item.defect ? .075 : .035) / 50) * 50);
  if (save.cash < cost) return toast(TEXT[locale].noMoney);
  save.cash -= cost;
  item.repairSpent += cost;
  item.prepCount = 1;
  item.condition = clamp(item.condition + (item.defect ? 14 : 7), 1, 100);
  item.defect = false;
  item.fairValue = Math.round(item.fairValue * 1.05 / 50) * 50;
  log(`${locale === 'ru' ? 'Подготовка 1/1' : 'Prep 1/1'}: ${item.title} · -${money(cost)}`);
  persist();
  render();
}
function listItem(item: OwnedItem) {
  item.state = 'listed';
  item.listedPrice = Math.round(resaleValue(item) * 1.07 / 50) * 50;
  log(`${locale === 'ru' ? 'Выставлено' : 'Listed'}: ${item.title} · ${money(item.listedPrice)}`);
  persist();
  maybeGenerateBuyer(item);
  render();
}
function maybeGenerateBuyer(item: OwnedItem, force = false) {
  const random = rng(save.day * 1709 + item.id.length * 97 + save.deals * 13 + Math.round(item.listedPrice ?? 0));
  if (!force && random() >= .62 && !yandexBridge.isMockMode()) return;
  const personalities = locale === 'ru' ? ['Спешит', 'Торгаш', 'Коллекционер', 'Осторожный'] : ['In a hurry', 'Haggler', 'Collector', 'Careful'];
  const names = locale === 'ru' ? ['Макс', 'Игорь', 'Лера', 'Антон', 'Саша', 'Миша'] : ['Max', 'Alex', 'Mia', 'Sam', 'Chris', 'Nick'];
  const target = resaleValue(item);
  const amount = Math.round(target * (.88 + random() * .14) / 50) * 50;
  buyerOffer = {
    itemId: item.id,
    buyer: names[Math.floor(random() * names.length)],
    personality: personalities[Math.floor(random() * personalities.length)],
    amount,
    patience: 2,
    rounds: 0
  };
}
function sell(item: OwnedItem, amount: number) {
  const invested = item.paid + item.repairSpent;
  const profit = amount - invested;
  save.cash += amount;
  save.lifetimeProfit += profit;
  save.deals += 1;
  save.reputation = Math.max(0, save.reputation + (profit >= 0 ? 2 + Math.min(2, Math.floor(profit / 2500)) : -1));
  save.inventory = save.inventory.filter((x) => x.id !== item.id);
  buyerOffer = null;
  log(`${TEXT[locale].sold}: ${item.title} · ${money(amount)} · ${profit >= 0 ? '+' : ''}${money(profit)}`);
  persist();
  render();
}
function counterBuyer(item: OwnedItem, pct: number) {
  if (!buyerOffer) return;
  const desired = Math.round(buyerOffer.amount * (1 + pct) / 50) * 50;
  const collector = buyerOffer.personality.includes('Коллек') || buyerOffer.personality.includes('Collector');
  const ceiling = resaleValue(item) * (collector ? 1.1 : 1.025);
  buyerOffer.rounds += 1;
  buyerOffer.patience -= 1;
  if (desired <= ceiling) buyerOffer.amount = desired;
  else if (buyerOffer.patience <= 0) {
    toast(locale === 'ru' ? 'Покупатель ушёл после долгого торга' : 'Buyer walked away after too much bargaining');
    buyerOffer = null;
  } else buyerOffer.amount = Math.round((buyerOffer.amount + ceiling * .96) / 2 / 50) * 50;
  render();
}

function generateRescueLot(): OwnedItem {
  const item: MarketItem = {
    id: `rescue-${save.day}`,
    category: 'household',
    title: locale === 'ru' ? 'Старый набор инструментов' : 'Old Tool Set',
    icon: '🧰', condition: 55, rarity: 1, defect: false, fairValue: 900, ask: 0, sellerMood: 1, revealed: true, negotiationRounds: 0
  };
  return { ...item, paid: 0, repairSpent: 0, prepCount: 0, state: 'owned' };
}
async function endDay() {
  save.day += 1;
  save.marketSeed += 17;
  buyerOffer = null;
  negotiationItem = null;
  if (save.cash < 300 && save.inventory.length === 0) {
    const rescue = generateRescueLot();
    save.inventory.push(rescue);
    log(`${TEXT[locale].rescue}: ${rescue.title}`);
  }
  persist();
  generateMarket();
  render();
  yandexBridge.gameplayStop();
  await yandexBridge.showInterstitial();
  yandexBridge.gameplayStart();
}

function stageProgress() {
  const info = stageInfo();
  if (!info.next || !info.requiredRep) return 100;
  return clamp(save.reputation / info.requiredRep * 100, 0, 100);
}
function upgradeBusiness() {
  const info = stageInfo();
  if (!info.next || !info.requiredRep || !info.upgradeCost) return;
  if (save.reputation < info.requiredRep) return toast(locale === 'ru' ? `Нужно репутации: ${info.requiredRep}` : `Reputation required: ${info.requiredRep}`);
  if (save.cash < info.upgradeCost) return toast(locale === 'ru' ? `На развитие нужно ${money(info.upgradeCost)}` : `Upgrade costs ${money(info.upgradeCost)}`);
  save.cash -= info.upgradeCost;
  save.stage = info.next;
  save.marketSeed += 303;
  generateMarket();
  log(locale === 'ru' ? `Бизнес улучшен: ${stageLabel(save.stage)}` : `Business upgraded: ${stageLabel(save.stage)}`);
  persist();
  render();
}
function currentStageBenefit() {
  if (save.stage === 'garage') return locale === 'ru' ? '4 места · оценка ±28% · базовые лоты' : '4 slots · ±28% estimates · basic lots';
  if (save.stage === 'kiosk') return locale === 'ru' ? '7 мест · оценка ±16% · открыта электроника' : '7 slots · ±16% estimates · electronics unlocked';
  return locale === 'ru' ? '10 мест · оценка ±8% · премиальные лоты' : '10 slots · ±8% estimates · premium lots';
}
function nextStageBenefit(next: Stage) {
  return next === 'kiosk'
    ? (locale === 'ru' ? '7 мест, точнее оценка и более дорогая электроника' : '7 slots, better estimates and pricier electronics')
    : (locale === 'ru' ? '10 мест, оценка ±8% и коллекционные премиум-лоты' : '10 slots, ±8% estimates and premium collectibles');
}
function businessProgressPanel() {
  const info = stageInfo();
  if (!info.next || !info.requiredRep || !info.upgradeCost) {
    return `<section class="business-progress"><div><small>${TEXT[locale].business}</small><h2>${stageLabel(save.stage)}</h2><p>${currentStageBenefit()}</p></div><span class="badge good">${locale === 'ru' ? 'Максимальный уровень' : 'Max level'}</span></section>`;
  }
  const repReady = save.reputation >= info.requiredRep;
  const cashReady = save.cash >= info.upgradeCost;
  const ready = repReady && cashReady;
  return `<section class="business-progress">
    <div class="business-copy"><small>${TEXT[locale].business}</small><h2>${stageLabel(save.stage)} → ${stageLabel(info.next)}</h2><p>${currentStageBenefit()}</p>
      <div class="requirements"><span class="${repReady ? 'good' : ''}">${TEXT[locale].rep}: ${save.reputation}/${info.requiredRep}</span><span class="${cashReady ? 'good' : ''}">${TEXT[locale].cash}: ${money(save.cash)} / ${money(info.upgradeCost)}</span></div>
      <p class="meta">${nextStageBenefit(info.next)}</p></div>
    <button class="btn primary" data-upgrade-stage ${ready ? '' : 'disabled'}>${locale === 'ru' ? `Открыть ${stageLabel(info.next)}` : `Open ${stageLabel(info.next)}`}</button>
  </section>`;
}

function card(item: MarketItem) {
  const [lo, hi] = estimate(item);
  const margin = resaleValue(item) - item.ask;
  return `<article class="card" data-market="${item.id}">
    <div class="card-title"><div class="icon">${item.icon}</div><div><h3>${item.title}</h3><div class="meta">${TEXT[locale].condition}: ${item.condition}% · ${item.defect ? TEXT[locale].defect : TEXT[locale].clean}</div></div></div>
    <div class="row"><span>${TEXT[locale].ask}</span><span class="price">${money(item.ask)}</span></div>
    <div class="row"><span>${TEXT[locale].estimate}</span><span>${lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`}</span></div>
    <div class="row"><span>${locale === 'ru' ? 'Потенциал сегодня' : 'Potential today'}</span><strong class="${margin >= 0 ? 'good' : 'bad'}">${margin >= 0 ? '+' : ''}${money(margin)}</strong></div>
    <div class="actions"><button class="btn primary" data-buy="${item.id}">${TEXT[locale].buy}</button><button class="btn" data-negotiate="${item.id}">${TEXT[locale].negotiate}</button><button class="btn reward" data-reveal="${item.id}">▶ ${TEXT[locale].reveal}</button></div>
  </article>`;
}
function ownedCard(item: OwnedItem) {
  const expected = resaleValue(item);
  const invested = item.paid + item.repairSpent;
  const delta = expected - invested;
  const prepped = item.prepCount >= 1;
  const prepText = prepped ? (locale === 'ru' ? 'Подготовлено 1/1' : 'Prepped 1/1') : (locale === 'ru' ? 'Подготовить 0/1' : 'Prep 0/1');
  return `<article class="card">
    <div class="card-title"><div class="icon">${item.icon}</div><div><h3>${item.title}</h3><div class="meta">${TEXT[locale].condition}: ${item.condition}% · ${item.state === 'listed' ? TEXT[locale].listed : TEXT[locale].owned} · ${locale === 'ru' ? 'подготовка' : 'prep'} ${item.prepCount}/1</div></div></div>
    <div class="kpi"><div><small>${TEXT[locale].paid}</small><strong>${money(invested)}</strong></div><div><small>${TEXT[locale].expected}</small><strong class="${delta >= 0 ? 'good' : 'bad'}">${money(expected)}</strong></div></div>
    <div class="actions">${item.state === 'owned'
      ? `<button class="btn" data-repair="${item.id}" ${prepped ? 'disabled' : ''}>${prepText}</button><button class="btn good" data-list="${item.id}">${TEXT[locale].list}</button>`
      : `<button class="btn reward" data-instant="${item.id}">▶ ${TEXT[locale].instant}</button>`}</div>
  </article>`;
}
function buyerPanel() {
  if (!buyerOffer) return `<div class="empty">${TEXT[locale].emptyListed}</div>`;
  const item = getOwned(buyerOffer.itemId);
  if (!item) return '';
  const invested = item.paid + item.repairSpent;
  const profit = buyerOffer.amount - invested;
  return `<div class="dealbox"><span class="badge">${buyerOffer.buyer} · ${buyerOffer.personality}</span><strong>${item.icon} ${item.title}</strong><span>${TEXT[locale].buyerOffers}</span><div class="offer-amount">${money(buyerOffer.amount)}</div><div class="row"><span>${profit >= 0 ? TEXT[locale].profitDeal : TEXT[locale].lossDeal}</span><strong class="${profit >= 0 ? 'good' : 'bad'}">${profit >= 0 ? '+' : ''}${money(profit)}</strong></div><div class="actions"><button class="btn good" data-accept-buyer>${TEXT[locale].accept}</button><button class="btn" data-counter-buyer=".05">${TEXT[locale].counter5}</button><button class="btn" data-counter-buyer=".10">${TEXT[locale].counter10}</button><button class="btn ghost" data-reject-buyer>${TEXT[locale].reject}</button></div></div>`;
}
function modal() {
  if (!negotiationItem) return '';
  const item = negotiationItem;
  const final = item.negotiationRounds >= 2;
  return `<div class="modal-backdrop"><div class="modal"><h2>${TEXT[locale].negotiate}: ${item.title}</h2><div class="quote"><small>${TEXT[locale].sellerSays}</small><div class="offer-amount">${money(item.ask)}</div></div><div class="meta">${locale === 'ru' ? `Раунд торга ${item.negotiationRounds}/2 · скидка не покупает товар автоматически` : `Negotiation round ${item.negotiationRounds}/2 · an offer never auto-buys the item`}</div><div class="actions"><button class="btn primary" data-seller-accept>${locale === 'ru' ? `Купить за ${money(item.ask)}` : `Buy for ${money(item.ask)}`}</button><button class="btn" data-seller-offer=".90" ${final ? 'disabled' : ''}>${TEXT[locale].offerLow}</button><button class="btn" data-seller-offer=".95" ${final ? 'disabled' : ''}>${TEXT[locale].offerMed}</button><button class="btn ghost" data-seller-walk>${TEXT[locale].walk}</button></div></div></div>`;
}

function render() {
  const info = stageInfo();
  app.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand"><h1>${TEXT[locale].title}</h1><p>${TEXT[locale].subtitle}</p></div><button class="lang" data-lang>${TEXT[locale].language}</button></header>
    <section class="stats">
      <div class="stat"><small>${TEXT[locale].day}</small><strong>${save.day}</strong></div>
      <div class="stat"><small>${TEXT[locale].cash}</small><strong>${money(save.cash)}</strong></div>
      <div class="stat"><small>${TEXT[locale].rep}</small><strong>${save.reputation}</strong><div class="progress"><span style="width:${stageProgress()}%"></span></div></div>
      <div class="stat"><small>${TEXT[locale].profit}</small><strong class="${save.lifetimeProfit >= 0 ? 'good' : 'bad'}">${save.lifetimeProfit >= 0 ? '+' : ''}${money(save.lifetimeProfit)}</strong></div>
      <div class="stat"><small>${TEXT[locale].business}</small><strong>${stageLabel(save.stage)}</strong><div class="meta">${info.slots} ${TEXT[locale].slots} · ${locale === 'ru' ? 'оценка' : 'estimate'} ±${Math.round(info.estimateWidth * 100)}%</div></div>
    </section>
    ${businessProgressPanel()}
    <div class="layout">
      <section class="panel"><div class="panel-head"><div><h2>${TEXT[locale].feed}</h2><p>${TEXT[locale].marketHint}</p><div class="trend">${trendText()}</div></div><button class="btn reward" data-refresh>▶ ${TEXT[locale].refresh}</button></div><div class="grid">${market.map(card).join('')}</div></section>
      <aside class="side-stack">
        <section class="panel"><div class="panel-head"><h2>${TEXT[locale].inventory} ${ownedCount()}/${info.slots}</h2></div><div class="grid">${save.inventory.length ? save.inventory.map(ownedCard).join('') : `<div class="empty">${TEXT[locale].emptyInv}</div>`}</div></section>
        <section class="panel"><h2>${TEXT[locale].buyer}</h2>${buyerPanel()}</section>
        <section class="panel"><div class="panel-head"><h2>${TEXT[locale].activity}</h2><button class="btn warn" data-end-day>${TEXT[locale].endDay}</button></div><div class="log">${save.logs.length ? save.logs.map((x) => `<div class="log-entry">${x}</div>`).join('') : `<div class="empty">—</div>`}</div></section>
      </aside>
    </div>
    <footer>Virtual economy only · no real marketplace · v0.2</footer>
  </div>${modal()}`;
  bind();
  if (new URLSearchParams(location.search).get('ciTest') === '1') {
    (globalThis as any).__RESELLER_TEST__ = {
      getState: () => structuredClone({ save, market, buyerOffer, negotiationItem }),
      reset: () => { localStorage.removeItem(SAVE_KEY); location.reload(); },
      setUpgradeReady: () => { save.cash = 15000; save.reputation = 14; persist(); render(); }
    };
  }
}

function bind() {
  document.querySelector('[data-lang]')?.addEventListener('click', () => { locale = locale === 'ru' ? 'en' : 'ru'; generateMarket(); render(); });
  document.querySelectorAll<HTMLElement>('[data-buy]').forEach((el) => el.addEventListener('click', () => { const item = market.find((x) => x.id === el.dataset.buy); if (item) buy(item); }));
  document.querySelectorAll<HTMLElement>('[data-negotiate]').forEach((el) => el.addEventListener('click', () => { const item = market.find((x) => x.id === el.dataset.negotiate); if (item) startNegotiation(item); }));
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => el.addEventListener('click', () => { const item = market.find((x) => x.id === el.dataset.reveal); if (item) void rewarded(() => { item.revealed = true; }, 'reveal_value'); }));
  document.querySelectorAll<HTMLElement>('[data-repair]').forEach((el) => el.addEventListener('click', () => { const item = getOwned(el.dataset.repair ?? ''); if (item) repair(item); }));
  document.querySelectorAll<HTMLElement>('[data-list]').forEach((el) => el.addEventListener('click', () => { const item = getOwned(el.dataset.list ?? ''); if (item) listItem(item); }));
  document.querySelectorAll<HTMLElement>('[data-instant]').forEach((el) => el.addEventListener('click', () => { const item = getOwned(el.dataset.instant ?? ''); if (item) void rewarded(() => maybeGenerateBuyer(item, true), 'instant_buyer'); }));
  document.querySelector('[data-refresh]')?.addEventListener('click', () => void rewarded(() => { save.marketSeed += 101; generateMarket(); persist(); }, 'refresh_market'));
  document.querySelector('[data-end-day]')?.addEventListener('click', () => void endDay());
  document.querySelector('[data-upgrade-stage]')?.addEventListener('click', upgradeBusiness);
  document.querySelector('[data-accept-buyer]')?.addEventListener('click', () => { if (!buyerOffer) return; const item = getOwned(buyerOffer.itemId); if (item) sell(item, buyerOffer.amount); });
  document.querySelectorAll<HTMLElement>('[data-counter-buyer]').forEach((el) => el.addEventListener('click', () => { if (!buyerOffer) return; const item = getOwned(buyerOffer.itemId); if (item) counterBuyer(item, Number(el.dataset.counterBuyer)); }));
  document.querySelector('[data-reject-buyer]')?.addEventListener('click', () => { buyerOffer = null; render(); });
  document.querySelector('[data-seller-accept]')?.addEventListener('click', () => { if (negotiationItem) buy(negotiationItem); });
  document.querySelectorAll<HTMLElement>('[data-seller-offer]').forEach((el) => el.addEventListener('click', () => {
    if (!negotiationItem) return;
    sellerCounter(negotiationItem, Math.round(negotiationItem.ask * Number(el.dataset.sellerOffer) / 50) * 50);
  }));
  document.querySelector('[data-seller-walk]')?.addEventListener('click', () => { negotiationItem = null; render(); });
}

async function boot() {
  await yandexBridge.init();
  locale = yandexBridge.getLanguage(navigator.language).startsWith('ru') ? 'ru' : 'en';
  save = normalizeSave(loadLocalSave<Partial<Save>>(SAVE_KEY, {}));
  generateMarket();
  render();
  await yandexBridge.gameplayReady();
  yandexBridge.gameplayStart();
  document.addEventListener('visibilitychange', () => document.hidden ? yandexBridge.gameplayStop() : yandexBridge.gameplayStart());
}

void boot();
