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
};

type OwnedItem = MarketItem & {
  paid: number;
  repairSpent: number;
  prepCount?: number;
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
  version: 1;
  day: number;
  cash: number;
  reputation: number;
  lifetimeProfit: number;
  deals: number;
  stage: Stage;
  inventory: OwnedItem[];
  marketSeed: number;
  logs: string[];
  rescueUsedDay?: number;
};

const SAVE_KEY = 'yg-reseller-v1';
const START_CASH = 5000;
const MAX_MARKET = 6;

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
    day: 'День', cash: 'Касса', rep: 'Репутация', profit: 'Прибыль', business: 'Бизнес', market: 'Рынок', inventory: 'Инвентарь',
    feed: 'Свежие объявления', marketHint: 'Ищи недооценённые вещи и не замораживай всю кассу.', owned: 'Твои вещи',
    listed: 'На продаже', buy: 'Купить', negotiate: 'Торговаться', reveal: 'Точная оценка', skip: 'Пропустить', repair: 'Подготовить', list: 'Выставить',
    buyer: 'Покупатель', accept: 'Принять', counter: 'Контроффер', reject: 'Отказать', refresh: 'Обновить рынок', instant: 'Найти покупателя', endDay: 'Закончить день',
    estimate: 'Оценка', ask: 'Цена продавца', condition: 'Состояние', defect: 'Есть дефект', clean: 'Без явных дефектов', paid: 'Вложено', expected: 'Ожидаемая продажа',
    emptyInv: 'Пока пусто. Выбери первую сделку на рынке.', emptyListed: 'Нет активных объявлений.', activity: 'История сделок', next: 'До следующего уровня',
    garage: 'Гараж', kiosk: 'Киоск', shop: 'Магазин', slots: 'мест', reward: 'реклама', noMoney: 'Не хватает денег', full: 'Нет свободного места', sold: 'Продано',
    language: 'EN', rescue: 'Аварийный лот', ad: 'ТЕСТОВАЯ РЕКЛАМА', adNote: 'Имитация rewarded · 1,4 сек', fair: 'Справедливая цена',
    sellerSays: 'Продавец просит', yourOffer: 'Твоё предложение', deal: 'Сделка', walk: 'Уйти', offerLow: 'Снизить на 10%', offerMed: 'Снизить на 5%',
    buyerOffers: 'Покупатель предлагает', counter5: '+5%', counter10: '+10%', profitDeal: 'Прибыль со сделки', lossDeal: 'Убыток со сделки'
  },
  en: {
    title: 'Reseller: Garage to Empire', subtitle: 'Buy low · negotiate · improve · sell higher',
    day: 'Day', cash: 'Cash', rep: 'Reputation', profit: 'Profit', business: 'Business', market: 'Market', inventory: 'Inventory',
    feed: 'Fresh listings', marketHint: 'Find underpriced items without freezing all your cash.', owned: 'Your items', listed: 'Listed', buy: 'Buy', negotiate: 'Negotiate', reveal: 'Exact estimate', skip: 'Skip', repair: 'Prep', list: 'List',
    buyer: 'Buyer', accept: 'Accept', counter: 'Counter', reject: 'Reject', refresh: 'Refresh market', instant: 'Find buyer', endDay: 'End day',
    estimate: 'Estimate', ask: 'Seller ask', condition: 'Condition', defect: 'Has a defect', clean: 'No obvious defects', paid: 'Invested', expected: 'Expected sale',
    emptyInv: 'Empty for now. Pick your first market deal.', emptyListed: 'No active listings.', activity: 'Deal history', next: 'To next stage', garage: 'Garage', kiosk: 'Kiosk', shop: 'Shop', slots: 'slots', reward: 'ad', noMoney: 'Not enough cash', full: 'No free inventory slots', sold: 'Sold',
    language: 'RU', rescue: 'Rescue lot', ad: 'TEST AD', adNote: 'Rewarded simulation · 1.4 sec', fair: 'Fair value', sellerSays: 'Seller asks', yourOffer: 'Your offer', deal: 'Deal', walk: 'Walk away', offerLow: 'Offer -10%', offerMed: 'Offer -5%', buyerOffers: 'Buyer offers', counter5: '+5%', counter10: '+10%', profitDeal: 'Deal profit', lossDeal: 'Deal loss'
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
function stageInfo() {
  if (save.reputation >= 60) return { stage: 'shop' as Stage, slots: 10, next: 0, threshold: 60 };
  if (save.reputation >= 20) return { stage: 'kiosk' as Stage, slots: 7, next: 60 - save.reputation, threshold: 60 };
  return { stage: 'garage' as Stage, slots: 4, next: 20 - save.reputation, threshold: 20 };
}
function stageLabel(stage: Stage) { return TEXT[locale][stage]; }
function normalizeSave(raw: Partial<Save>): Save {
  return {
    version: 1,
    day: Math.max(1, raw.day ?? 1), cash: Math.max(0, raw.cash ?? START_CASH), reputation: Math.max(0, raw.reputation ?? 0),
    lifetimeProfit: raw.lifetimeProfit ?? 0, deals: Math.max(0, raw.deals ?? 0), stage: raw.stage ?? 'garage', inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    marketSeed: raw.marketSeed ?? 20261014, logs: Array.isArray(raw.logs) ? raw.logs.slice(0, 14) : []
  };
}
function persist() { save.stage = stageInfo().stage; saveLocal(SAVE_KEY, save); }
function log(message: string) { save.logs.unshift(message); save.logs = save.logs.slice(0, 14); persist(); }
function toast(message: string) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; document.body.appendChild(el);
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el.remove(), 2200);
}

function generateMarket() {
  const random = rng(save.marketSeed + save.day * 7919 + save.reputation * 31);
  const categories = Object.keys(CATEGORIES) as Category[];
  market = Array.from({ length: MAX_MARKET }, (_, i) => {
    const stage = stageInfo().stage;
    const pool: Category[] = stage === 'garage' ? ['household','household','bike','bike','phone'] : stage === 'kiosk' ? ['household','bike','phone','phone','electronics'] : categories;
    const category = pool[Math.floor(random() * pool.length)];
    const data = CATEGORIES[category];
    const names = data[locale];
    const condition = Math.round(35 + random() * 64);
    const rarity = random() < .08 ? 3 : random() < .25 ? 2 : 1;
    const defect = random() < .24;
    const stage = stageInfo().stage;
    const stageScale = stage === 'garage' ? .52 : stage === 'kiosk' ? .9 : 1.25;
    const base = (data.base[0] + random() * (data.base[1] - data.base[0])) * stageScale;
    const conditionFactor = .48 + condition / 190;
    const rarityFactor = rarity === 3 ? 1.7 : rarity === 2 ? 1.25 : 1;
    const defectFactor = defect ? .67 : 1;
    const fairValue = Math.round(base * conditionFactor * rarityFactor * defectFactor / 50) * 50;
    const sellerMood = .95 + random() * .20;
    const ask = Math.max(250, Math.round(fairValue * sellerMood / 50) * 50);
    return { id: `d${save.day}-${save.marketSeed}-${i}`, category, title: names[Math.floor(random() * names.length)], icon: data.icon, condition, rarity, defect, fairValue, ask, sellerMood, revealed: false };
  });
}

function estimate(item: MarketItem) {
  const stage = stageInfo().stage;
  const width = stage === 'shop' ? .08 : stage === 'kiosk' ? .16 : .27;
  if (item.revealed) return [item.fairValue, item.fairValue];
  return [Math.round(item.fairValue * (1 - width) / 50) * 50, Math.round(item.fairValue * (1 + width) / 50) * 50];
}
function resaleValue(item: MarketItem | OwnedItem) {
  const prep = 'repairSpent' in item ? Math.min(.10, item.repairSpent / Math.max(1, item.fairValue) * .55) : 0;
  return Math.round(item.fairValue * (1.035 + prep) / 50) * 50;
}
function inventorySlots() { return stageInfo().slots; }
function ownedCount() { return save.inventory.length; }
function getOwned(id: string) { return save.inventory.find((x) => x.id === id); }

async function rewarded(effect: () => void, eventName: string) {
  const overlay = document.createElement('div');
  if (yandexBridge.isMockMode()) {
    overlay.className = 'ad-overlay'; overlay.innerHTML = `<div class="ad-card"><strong>${TEXT[locale].ad}</strong><span>${TEXT[locale].adNote}</span></div>`; document.body.appendChild(overlay);
  }
  yandexBridge.gameplayStop();
  const ok = await yandexBridge.showRewardedAndWait(12000);
  overlay.remove();
  if (ok) { effect(); (globalThis as any).__RESELLER_TELEMETRY__ ??= {}; (globalThis as any).__RESELLER_TELEMETRY__[eventName] = ((globalThis as any).__RESELLER_TELEMETRY__[eventName] ?? 0) + 1; }
  else toast(locale === 'ru' ? 'Реклама сейчас недоступна' : 'Ad unavailable');
  yandexBridge.gameplayStart();
  render();
}

function buy(item: MarketItem, price = item.ask) {
  if (ownedCount() >= inventorySlots()) return toast(TEXT[locale].full);
  if (save.cash < price) return toast(TEXT[locale].noMoney);
  save.cash -= price;
  save.inventory.push({ ...item, paid: price, repairSpent: 0, prepCount: 0, state: 'owned' });
  market = market.filter((x) => x.id !== item.id);
  log(`${locale === 'ru' ? 'Куплено' : 'Bought'}: ${item.title} · ${money(price)}`);
  persist(); render();
}

function startNegotiation(item: MarketItem) { negotiationItem = item; render(); }
function sellerCounter(item: MarketItem, offer: number) {
  const floor = Math.round(item.fairValue * (.88 + (item.sellerMood - .95) * .16) / 50) * 50;
  if (offer >= floor) {
    item.ask = offer;
    toast(locale === 'ru' ? `Продавец согласен на ${money(offer)}. Подтверди покупку.` : `Seller agrees to ${money(offer)}. Confirm the purchase.`);
    render();
    return;
  }
  const counter = Math.max(floor, Math.max(offer + 100, Math.round(((item.ask + offer) / 2) / 50) * 50));
  item.ask = counter;
  toast(locale === 'ru' ? `Продавец предлагает ${money(counter)}. Решение за тобой.` : `Seller counters ${money(counter)}. Your call.`);
  render();
}

function repair(item: OwnedItem) {
  if (item.state !== 'owned') return;
  item.prepCount ??= 0;
  if (item.prepCount >= 1) return toast(locale === 'ru' ? 'Предмет уже подготовлен' : 'Item is already prepped');
  const cost = Math.max(150, Math.round(item.fairValue * (item.defect ? .08 : .04) / 50) * 50);
  if (save.cash < cost) return toast(TEXT[locale].noMoney);
  save.cash -= cost; item.repairSpent += cost; item.prepCount = 1; item.condition = clamp(item.condition + (item.defect ? 16 : 8), 1, 100); item.defect = false;
  item.fairValue = Math.round(item.fairValue * 1.07 / 50) * 50;
  log(`${locale === 'ru' ? 'Подготовка' : 'Prep'}: ${item.title} · -${money(cost)}`);
  persist(); render();
}

function listItem(item: OwnedItem) {
  item.state = 'listed'; item.listedPrice = Math.round(resaleValue(item) * 1.08 / 50) * 50;
  log(`${locale === 'ru' ? 'Выставлено' : 'Listed'}: ${item.title} · ${money(item.listedPrice)}`);
  persist(); maybeGenerateBuyer(item); render();
}
function maybeGenerateBuyer(item: OwnedItem) {
  const random = rng(save.day * 1709 + item.id.length * 97 + save.deals * 13);
  if (random() < .62 || yandexBridge.isMockMode()) {
    const personalities = locale === 'ru' ? ['Спешит', 'Торгаш', 'Коллекционер', 'Осторожный'] : ['In a hurry', 'Haggler', 'Collector', 'Careful'];
    const names = locale === 'ru' ? ['Макс', 'Игорь', 'Лера', 'Антон', 'Саша', 'Миша'] : ['Max', 'Alex', 'Mia', 'Sam', 'Chris', 'Nick'];
    const target = resaleValue(item);
    const amount = Math.round(target * (.84 + random() * .18) / 50) * 50;
    buyerOffer = { itemId: item.id, buyer: names[Math.floor(random() * names.length)], personality: personalities[Math.floor(random() * personalities.length)], amount, patience: 2, rounds: 0 };
  }
}
function sell(item: OwnedItem, amount: number) {
  const invested = item.paid + item.repairSpent;
  const profit = amount - invested;
  save.cash += amount; save.lifetimeProfit += profit; save.deals += 1; save.reputation = Math.max(0, save.reputation + (profit >= 0 ? 3 + Math.min(5, Math.floor(profit / 2500)) : -1));
  save.inventory = save.inventory.filter((x) => x.id !== item.id); buyerOffer = null;
  log(`${TEXT[locale].sold}: ${item.title} · ${money(amount)} · ${profit >= 0 ? '+' : ''}${money(profit)}`);
  persist(); render();
}
function counterBuyer(item: OwnedItem, pct: number) {
  if (!buyerOffer) return;
  const desired = Math.round(buyerOffer.amount * (1 + pct) / 50) * 50;
  const ceiling = resaleValue(item) * (buyerOffer.personality.includes('Коллек') || buyerOffer.personality.includes('Collector') ? 1.11 : 1.03);
  buyerOffer.rounds += 1; buyerOffer.patience -= 1;
  if (desired <= ceiling || buyerOffer.rounds >= 2) {
    buyerOffer.amount = Math.round(Math.min(desired, ceiling) / 50) * 50;
    if (buyerOffer.patience <= 0 && desired > ceiling) { toast(locale === 'ru' ? 'Покупатель ушёл' : 'Buyer walked away'); buyerOffer = null; }
  } else {
    buyerOffer.amount = Math.round((buyerOffer.amount + ceiling * .96) / 2 / 50) * 50;
  }
  render();
}

async function endDay() {
  save.day += 1; save.marketSeed += 17; buyerOffer = null; negotiationItem = null;
  if (save.cash < 400 && save.inventory.length === 0) {
    const rescue = generateRescueLot(); save.inventory.push(rescue); log(`${TEXT[locale].rescue}: ${rescue.title}`);
  }
  persist(); generateMarket(); render();
  yandexBridge.gameplayStop(); await yandexBridge.showInterstitial(); yandexBridge.gameplayStart();
}
function generateRescueLot(): OwnedItem {
  const item: MarketItem = { id: `rescue-${save.day}`, category: 'household', title: locale === 'ru' ? 'Старый набор инструментов' : 'Old Tool Set', icon: '🧰', condition: 55, rarity: 1, defect: false, fairValue: 1300, ask: 0, sellerMood: 1, revealed: true };
  return { ...item, paid: 0, repairSpent: 0, prepCount: 0, state: 'owned' };
}

function stageProgress() {
  const s = stageInfo(); if (s.stage === 'shop') return 100;
  const from = s.stage === 'garage' ? 0 : 20; return clamp((save.reputation - from) / (s.threshold - from) * 100, 0, 100);
}
function card(item: MarketItem) {
  const [lo, hi] = estimate(item); const margin = resaleValue(item) - item.ask;
  return `<article class="card" data-market="${item.id}">
    <div class="card-title"><div class="icon">${item.icon}</div><div><h3>${item.title}</h3><div class="meta">${TEXT[locale].condition}: ${item.condition}% · ${item.defect ? TEXT[locale].defect : TEXT[locale].clean}</div></div></div>
    <div class="row"><span>${TEXT[locale].ask}</span><span class="price">${money(item.ask)}</span></div>
    <div class="row"><span>${TEXT[locale].estimate}</span><span>${lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`}</span></div>
    <div class="row"><span>${locale === 'ru' ? 'Потенциал' : 'Potential'}</span><strong class="${margin >= 0 ? 'good' : 'bad'}">${margin >= 0 ? '+' : ''}${money(margin)}</strong></div>
    <div class="actions"><button class="btn primary" data-buy="${item.id}">${TEXT[locale].buy}</button><button class="btn" data-negotiate="${item.id}">${TEXT[locale].negotiate}</button><button class="btn reward" data-reveal="${item.id}">▶ ${TEXT[locale].reveal}</button></div>
  </article>`;
}
function ownedCard(item: OwnedItem) {
  const expected = resaleValue(item); const invested = item.paid + item.repairSpent; const delta = expected - invested;
  return `<article class="card">
    <div class="card-title"><div class="icon">${item.icon}</div><div><h3>${item.title}</h3><div class="meta">${TEXT[locale].condition}: ${item.condition}% · ${item.state === 'listed' ? TEXT[locale].listed : TEXT[locale].owned}</div></div></div>
    <div class="kpi"><div><small>${TEXT[locale].paid}</small><strong>${money(invested)}</strong></div><div><small>${TEXT[locale].expected}</small><strong class="${delta >= 0 ? 'good' : 'bad'}">${money(expected)}</strong></div></div>
    <div class="actions">${item.state === 'owned' ? `<button class="btn" data-repair="${item.id}" ${(item.prepCount ?? 0) >= 1 ? 'disabled' : ''}>${(item.prepCount ?? 0) >= 1 ? (locale === 'ru' ? 'Подготовлено' : 'Prepped') : TEXT[locale].repair}</button><button class="btn good" data-list="${item.id}">${TEXT[locale].list}</button>` : `<button class="btn reward" data-instant="${item.id}">▶ ${TEXT[locale].instant}</button>`}</div>
  </article>`;
}
function buyerPanel() {
  if (!buyerOffer) return `<div class="empty">${TEXT[locale].emptyListed}</div>`;
  const item = getOwned(buyerOffer.itemId); if (!item) return '';
  const invested = item.paid + item.repairSpent; const profit = buyerOffer.amount - invested;
  return `<div class="dealbox"><span class="badge">${buyerOffer.buyer} · ${buyerOffer.personality}</span><strong>${item.icon} ${item.title}</strong><span>${TEXT[locale].buyerOffers}</span><div class="offer-amount">${money(buyerOffer.amount)}</div><div class="row"><span>${profit >= 0 ? TEXT[locale].profitDeal : TEXT[locale].lossDeal}</span><strong class="${profit >= 0 ? 'good' : 'bad'}">${profit >= 0 ? '+' : ''}${money(profit)}</strong></div><div class="actions"><button class="btn good" data-accept-buyer>${TEXT[locale].accept}</button><button class="btn" data-counter-buyer=".05">${TEXT[locale].counter5}</button><button class="btn" data-counter-buyer=".10">${TEXT[locale].counter10}</button><button class="btn ghost" data-reject-buyer>${TEXT[locale].reject}</button></div></div>`;
}
function modal() {
  if (!negotiationItem) return '';
  const item = negotiationItem;
  return `<div class="modal-backdrop"><div class="modal"><h2>${TEXT[locale].negotiate}: ${item.title}</h2><div class="quote"><small>${TEXT[locale].sellerSays}</small><div class="offer-amount">${money(item.ask)}</div></div><div class="actions"><button class="btn primary" data-seller-accept>${locale === 'ru' ? `Купить за ${money(item.ask)}` : `Buy for ${money(item.ask)}`}</button><button class="btn" data-seller-offer=".90">${TEXT[locale].offerLow}</button><button class="btn" data-seller-offer=".95">${TEXT[locale].offerMed}</button><button class="btn ghost" data-seller-walk>${TEXT[locale].walk}</button></div></div></div>`;
}

function render() {
  const s = stageInfo();
  app.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand"><h1>${TEXT[locale].title}</h1><p>${TEXT[locale].subtitle}</p></div><button class="lang" data-lang>${TEXT[locale].language}</button></header>
    <section class="stats">
      <div class="stat"><small>${TEXT[locale].day}</small><strong>${save.day}</strong></div>
      <div class="stat"><small>${TEXT[locale].cash}</small><strong>${money(save.cash)}</strong></div>
      <div class="stat"><small>${TEXT[locale].rep}</small><strong>${save.reputation}</strong><div class="progress"><span style="width:${stageProgress()}%"></span></div></div>
      <div class="stat"><small>${TEXT[locale].profit}</small><strong class="${save.lifetimeProfit >= 0 ? 'good' : 'bad'}">${save.lifetimeProfit >= 0 ? '+' : ''}${money(save.lifetimeProfit)}</strong></div>
      <div class="stat"><small>${TEXT[locale].business}</small><strong>${stageLabel(s.stage)}</strong><div class="meta">${s.slots} ${TEXT[locale].slots}${s.next ? ` · ${locale === 'ru' ? 'до улучшения' : 'to upgrade'}: ${s.next} ${locale === 'ru' ? 'реп.' : 'rep'}` : ''}</div><div class="meta">${s.stage === 'garage' ? (locale === 'ru' ? 'Киоск: 7 мест, точнее оценка, дороже рынок' : 'Kiosk: 7 slots, tighter estimates, richer market') : s.stage === 'kiosk' ? (locale === 'ru' ? 'Магазин: 10 мест, лучшие оценки, премиум-лоты' : 'Shop: 10 slots, best estimates, premium lots') : (locale === 'ru' ? 'Максимальный уровень бизнеса' : 'Maximum business tier')}</div></div>
    </section>
    <div class="layout">
      <section class="panel"><div class="panel-head"><div><h2>${TEXT[locale].feed}</h2><p>${TEXT[locale].marketHint}</p></div><button class="btn reward" data-refresh>▶ ${TEXT[locale].refresh}</button></div><div class="grid">${market.map(card).join('')}</div></section>
      <aside class="side-stack">
        <section class="panel"><div class="panel-head"><h2>${TEXT[locale].inventory} ${ownedCount()}/${s.slots}</h2></div><div class="grid">${save.inventory.length ? save.inventory.map(ownedCard).join('') : `<div class="empty">${TEXT[locale].emptyInv}</div>`}</div></section>
        <section class="panel"><h2>${TEXT[locale].buyer}</h2>${buyerPanel()}</section>
        <section class="panel"><div class="panel-head"><h2>${TEXT[locale].activity}</h2><button class="btn warn" data-end-day>${TEXT[locale].endDay}</button></div><div class="log">${save.logs.length ? save.logs.map((x) => `<div class="log-entry">${x}</div>`).join('') : `<div class="empty">—</div>`}</div></section>
      </aside>
    </div>
    <footer>Virtual economy only · no real marketplace · v0.1</footer>
  </div>${modal()}`;
  bind();
  (globalThis as any).__RESELLER_TEST__ = { getState: () => structuredClone({ save, market, buyerOffer, negotiationItem }), reset: () => { localStorage.removeItem(SAVE_KEY); location.reload(); } };
}

function bind() {
  document.querySelector('[data-lang]')?.addEventListener('click', () => { locale = locale === 'ru' ? 'en' : 'ru'; generateMarket(); render(); });
  document.querySelectorAll<HTMLElement>('[data-buy]').forEach((el) => el.addEventListener('click', () => { const item = market.find((x) => x.id === el.dataset.buy); if (item) buy(item); }));
  document.querySelectorAll<HTMLElement>('[data-negotiate]').forEach((el) => el.addEventListener('click', () => { const item = market.find((x) => x.id === el.dataset.negotiate); if (item) startNegotiation(item); }));
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => el.addEventListener('click', () => { const item = market.find((x) => x.id === el.dataset.reveal); if (item) void rewarded(() => { item.revealed = true; }, 'reveal_value'); }));
  document.querySelectorAll<HTMLElement>('[data-repair]').forEach((el) => el.addEventListener('click', () => { const item = getOwned(el.dataset.repair ?? ''); if (item) repair(item); }));
  document.querySelectorAll<HTMLElement>('[data-list]').forEach((el) => el.addEventListener('click', () => { const item = getOwned(el.dataset.list ?? ''); if (item) listItem(item); }));
  document.querySelectorAll<HTMLElement>('[data-instant]').forEach((el) => el.addEventListener('click', () => { const item = getOwned(el.dataset.instant ?? ''); if (item) void rewarded(() => maybeGenerateBuyer(item), 'instant_buyer'); }));
  document.querySelector('[data-refresh]')?.addEventListener('click', () => void rewarded(() => { save.marketSeed += 101; generateMarket(); persist(); }, 'refresh_market'));
  document.querySelector('[data-end-day]')?.addEventListener('click', () => void endDay());
  document.querySelector('[data-accept-buyer]')?.addEventListener('click', () => { if (!buyerOffer) return; const item = getOwned(buyerOffer.itemId); if (item) sell(item, buyerOffer.amount); });
  document.querySelectorAll<HTMLElement>('[data-counter-buyer]').forEach((el) => el.addEventListener('click', () => { if (!buyerOffer) return; const item = getOwned(buyerOffer.itemId); if (item) counterBuyer(item, Number(el.dataset.counterBuyer)); }));
  document.querySelector('[data-reject-buyer]')?.addEventListener('click', () => { buyerOffer = null; render(); });
  document.querySelector('[data-seller-accept]')?.addEventListener('click', () => { if (negotiationItem) { const item = negotiationItem; negotiationItem = null; buy(item); } });
  document.querySelectorAll<HTMLElement>('[data-seller-offer]').forEach((el) => el.addEventListener('click', () => { if (negotiationItem) sellerCounter(negotiationItem, Math.round(negotiationItem.ask * Number(el.dataset.sellerOffer) / 50) * 50); }));
  document.querySelector('[data-seller-walk]')?.addEventListener('click', () => { negotiationItem = null; render(); });
}

async function boot() {
  await yandexBridge.init();
  locale = yandexBridge.getLanguage(navigator.language).startsWith('ru') ? 'ru' : 'en';
  save = normalizeSave(loadLocalSave<Partial<Save>>(SAVE_KEY, {}));
  generateMarket(); render();
  await yandexBridge.gameplayReady(); yandexBridge.gameplayStart();
  document.addEventListener('visibilitychange', () => document.hidden ? yandexBridge.gameplayStop() : yandexBridge.gameplayStart());
}

void boot();
