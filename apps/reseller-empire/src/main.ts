import './style.css';
import { loadLocalSave, saveLocal } from '@yg-lab/shared-core';
import { yandexBridge } from '@yg-lab/yandex-bridge';

type Locale = 'ru' | 'en';
type Category = 'household' | 'bike' | 'phone' | 'electronics' | 'collectible';
type Tab = 'market' | 'inventory' | 'progress';

type ItemTemplate = {
  id: string;
  category: Category;
  icon: string;
  base: number;
  name: Record<Locale, string>;
};

type MarketItem = {
  id: string;
  templateId: string;
  condition: number;
  rarity: 1 | 1.2 | 1.65;
  defect: boolean;
  fairValue: number;
  ask: number;
  sellerId: number;
  revealed: boolean;
  negotiationFailed: boolean;
};

type BuyerOffer = {
  buyerId: number;
  amount: number;
};

type OwnedItem = MarketItem & {
  paid: number;
  repairSpent: number;
  prepared: boolean;
  listed: boolean;
  offer: BuyerOffer | null;
};

type Save = {
  version: 1;
  cash: number;
  reputation: number;
  day: number;
  totalProfit: number;
  deals: number;
  seed: number;
  market: MarketItem[];
  inventory: OwnedItem[];
  tab: Tab;
  refreshedDay: number;
  rescueCount: number;
  bestCash: number;
};

const SAVE_KEY = 'yg.reseller.v0';
const START_CASH = 5000;
const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');

const ITEMS: ItemTemplate[] = [
  { id: 'lamp', category: 'household', icon: '💡', base: 900, name: { ru: 'Настольная лампа', en: 'Desk lamp' } },
  { id: 'tools', category: 'household', icon: '🧰', base: 1800, name: { ru: 'Набор инструментов', en: 'Tool kit' } },
  { id: 'chair', category: 'household', icon: '🪑', base: 2200, name: { ru: 'Винтажное кресло', en: 'Vintage chair' } },
  { id: 'coffee', category: 'household', icon: '☕', base: 2600, name: { ru: 'Кофеварка', en: 'Coffee maker' } },
  { id: 'citybike', category: 'bike', icon: '🚲', base: 5200, name: { ru: 'Городской велосипед', en: 'City bicycle' } },
  { id: 'bmx', category: 'bike', icon: '🚴', base: 6800, name: { ru: 'BMX', en: 'BMX' } },
  { id: 'foldbike', category: 'bike', icon: '🚲', base: 7400, name: { ru: 'Складной велосипед', en: 'Folding bicycle' } },
  { id: 'phone-old', category: 'phone', icon: '📱', base: 8500, name: { ru: 'Смартфон', en: 'Smartphone' } },
  { id: 'phone-pro', category: 'phone', icon: '📲', base: 13500, name: { ru: 'Флагман прошлых лет', en: 'Older flagship phone' } },
  { id: 'tablet', category: 'phone', icon: '▣', base: 12000, name: { ru: 'Планшет', en: 'Tablet' } },
  { id: 'speaker', category: 'electronics', icon: '🔊', base: 7200, name: { ru: 'Акустика', en: 'Speakers' } },
  { id: 'camera', category: 'electronics', icon: '📷', base: 16000, name: { ru: 'Камера', en: 'Camera' } },
  { id: 'console', category: 'electronics', icon: '🎮', base: 19000, name: { ru: 'Игровая консоль', en: 'Game console' } },
  { id: 'turntable', category: 'electronics', icon: '🎵', base: 14500, name: { ru: 'Проигрыватель', en: 'Turntable' } },
  { id: 'watch', category: 'collectible', icon: '⌚', base: 22000, name: { ru: 'Коллекционные часы', en: 'Collectible watch' } },
  { id: 'poster', category: 'collectible', icon: '🖼️', base: 11000, name: { ru: 'Редкий постер', en: 'Rare poster' } },
  { id: 'vinyl', category: 'collectible', icon: '💿', base: 15000, name: { ru: 'Редкий винил', en: 'Rare vinyl' } },
  { id: 'figure', category: 'collectible', icon: '🗿', base: 18000, name: { ru: 'Коллекционная фигурка', en: 'Collectible figure' } }
];

const SELLERS = [
  { floor: .78, name: { ru: 'Нужно продать сегодня', en: 'Needs it sold today' } },
  { floor: .84, name: { ru: 'Спокойный продавец', en: 'Easygoing seller' } },
  { floor: .90, name: { ru: 'Знает цену', en: 'Knows the value' } },
  { floor: .94, name: { ru: 'Упрямый продавец', en: 'Stubborn seller' } }
];

const BUYERS = [
  { ceiling: .98, name: { ru: 'Охотник за скидкой', en: 'Bargain hunter' } },
  { ceiling: 1.05, name: { ru: 'Обычный покупатель', en: 'Regular buyer' } },
  { ceiling: 1.12, name: { ru: 'Ищет именно это', en: 'Looking for this item' } },
  { ceiling: 1.20, name: { ru: 'Коллекционер', en: 'Collector' } }
];

const categoryNames: Record<Category, Record<Locale, string>> = {
  household: { ru: 'Дом', en: 'Home' },
  bike: { ru: 'Велосипеды', en: 'Bicycles' },
  phone: { ru: 'Телефоны', en: 'Phones' },
  electronics: { ru: 'Электроника', en: 'Electronics' },
  collectible: { ru: 'Коллекционка', en: 'Collectibles' }
};

const copy = {
  ru: {
    title: 'Перекуп: с гаража до империи', subtitle: 'Купи дёшево. Сторгуйся. Продай дороже.',
    cash: 'Деньги', rep: 'Репутация', day: 'День', stage: 'Бизнес', market: 'Рынок', inventory: 'Склад', progress: 'Рост',
    endDay: 'Завершить день', buy: 'Купить', negotiate: 'Торговаться', exact: 'Узнать точную цену', refresh: 'Обновить рынок',
    prepare: 'Подготовить', list: 'Выставить', delist: 'Снять с продажи', accept: 'Продать', counter: 'Контрпредложение', instant: 'Найти покупателя',
    estimate: 'Оценка перепродажи', seller: 'Продавец', condition: 'Состояние', defect: 'Есть дефект', clean: 'Без явных дефектов',
    paid: 'Куплено', invested: 'Вложено', offer: 'Предложение', margin: 'Прибыль', capacity: 'Мест на складе',
    emptyMarket: 'На сегодня рынок разобран. Заверши день, чтобы появились новые лоты.',
    emptyInventory: 'Склад пуст. Найди недооценённый лот на рынке.',
    sold: 'Сделка закрыта', noCash: 'Не хватает денег', noSpace: 'Склад заполнен', adFail: 'Реклама сейчас недоступна',
    negotiation: 'Предложить продавцу', sellerWants: 'Цена продавца', sellerAccepted: 'Продавец согласился', sellerRejected: 'Продавец отказался',
    rescueNegotiation: 'Вернуть продавца', buyerTitle: 'Покупатель написал', buyerMax: 'Попробовать поднять цену', withdrawn: 'Покупатель ушёл. Новый может появиться завтра.',
    garage: 'Гараж', kiosk: 'Киоск', shop: 'Магазин', next: 'До следующей ступени', totalProfit: 'Общая прибыль', deals: 'Сделок',
    unlocked: 'Открыто', locked: 'Закрыто', rewarded: 'за рекламу', prepared: 'Подготовлен', listed: 'Выставлен', newBuyer: 'Новый покупатель найден',
    rescueLot: 'Касса почти пуста — знакомый подкинул бесплатный спасательный лот.', mockAd: 'ТЕСТОВАЯ РЕКЛАМА', mockAdNote: 'Имитация rewarded · 1,4 сек'
  },
  en: {
    title: 'Reseller: Garage to Empire', subtitle: 'Buy low. Negotiate. Sell higher.',
    cash: 'Cash', rep: 'Reputation', day: 'Day', stage: 'Business', market: 'Market', inventory: 'Inventory', progress: 'Growth',
    endDay: 'End day', buy: 'Buy', negotiate: 'Negotiate', exact: 'Reveal exact value', refresh: 'Refresh market',
    prepare: 'Prepare', list: 'List', delist: 'Delist', accept: 'Sell', counter: 'Counteroffer', instant: 'Find buyer',
    estimate: 'Resale estimate', seller: 'Seller', condition: 'Condition', defect: 'Has a defect', clean: 'No obvious defects',
    paid: 'Paid', invested: 'Invested', offer: 'Offer', margin: 'Profit', capacity: 'Inventory slots',
    emptyMarket: 'The market is picked clean today. End the day for fresh listings.',
    emptyInventory: 'Inventory is empty. Find an undervalued item on the market.',
    sold: 'Deal closed', noCash: 'Not enough cash', noSpace: 'Inventory is full', adFail: 'Ad is unavailable right now',
    negotiation: 'Make an offer', sellerWants: 'Seller ask', sellerAccepted: 'Seller accepted', sellerRejected: 'Seller declined',
    rescueNegotiation: 'Bring seller back', buyerTitle: 'Buyer messaged you', buyerMax: 'Push the price', withdrawn: 'Buyer walked away. Another may appear tomorrow.',
    garage: 'Garage', kiosk: 'Kiosk', shop: 'Shop', next: 'Until next tier', totalProfit: 'Total profit', deals: 'Deals',
    unlocked: 'Unlocked', locked: 'Locked', rewarded: 'rewarded', prepared: 'Prepared', listed: 'Listed', newBuyer: 'New buyer found',
    rescueLot: 'Cash is almost gone — a friend dropped off a free rescue item.', mockAd: 'TEST AD', mockAdNote: 'Rewarded simulation · 1.4 sec'
  }
};

let locale: Locale = 'ru';
let telemetry: Record<string, number> = {};

function freshSave(): Save {
  return { version: 1, cash: START_CASH, reputation: 0, day: 1, totalProfit: 0, deals: 0, seed: Math.floor(Math.random() * 2_000_000_000), market: [], inventory: [], tab: 'market', refreshedDay: 0, rescueCount: 0, bestCash: START_CASH };
}

let state = normalize(loadLocalSave<Partial<Save>>(SAVE_KEY, {}));

function normalize(raw: Partial<Save>): Save {
  const base = freshSave();
  return {
    ...base,
    ...raw,
    version: 1,
    cash: Number.isFinite(raw.cash) ? Math.max(0, Math.floor(raw.cash!)) : base.cash,
    reputation: Number.isFinite(raw.reputation) ? Math.max(0, Math.floor(raw.reputation!)) : 0,
    day: Number.isFinite(raw.day) ? Math.max(1, Math.floor(raw.day!)) : 1,
    totalProfit: Number.isFinite(raw.totalProfit) ? Math.floor(raw.totalProfit!) : 0,
    deals: Number.isFinite(raw.deals) ? Math.max(0, Math.floor(raw.deals!)) : 0,
    market: Array.isArray(raw.market) ? raw.market : [],
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    tab: raw.tab === 'inventory' || raw.tab === 'progress' ? raw.tab : 'market'
  };
}

function persist() {
  state.bestCash = Math.max(state.bestCash, state.cash);
  saveLocal(SAVE_KEY, state);
}

function track(event: string) {
  telemetry[event] = (telemetry[event] ?? 0) + 1;
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function template(id: string) { return ITEMS.find((item) => item.id === id) ?? ITEMS[0]; }
function money(value: number) { return `${Math.round(value).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} ₽`; }
function t() { return copy[locale]; }

function stageIndex() { return state.reputation >= 350 ? 2 : state.reputation >= 120 ? 1 : 0; }
function stageName() { return [t().garage, t().kiosk, t().shop][stageIndex()]; }
function capacity() { return [4, 6, 9][stageIndex()]; }
function estimateWidth() { return [.32, .22, .15][stageIndex()]; }
function nextStageTarget() { return stageIndex() === 0 ? 120 : stageIndex() === 1 ? 350 : 350; }

function unlocked(category: Category) {
  const threshold: Record<Category, number> = { household: 0, bike: 0, phone: 60, electronics: 150, collectible: 300 };
  return state.reputation >= threshold[category];
}

function generateMarket(forceSalt = 0) {
  const rng = seeded(state.seed + state.day * 911 + forceSalt * 7919);
  const pool = ITEMS.filter((item) => unlocked(item.category));
  const count = 5;
  const market: MarketItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const item = pool[Math.floor(rng() * pool.length)];
    const condition = Math.round(52 + rng() * 47);
    const rarityRoll = rng();
    const rarity: 1 | 1.2 | 1.65 = rarityRoll > .93 ? 1.65 : rarityRoll > .72 ? 1.2 : 1;
    const defect = rng() < .22;
    const fair = Math.max(250, Math.round(item.base * (.62 + condition / 210) * rarity * (defect ? .72 : 1)));
    const sellerId = Math.floor(rng() * SELLERS.length);
    const askFactor = i === 0 ? .72 + rng() * .10 : .80 + rng() * .38;
    const ask = Math.max(150, Math.round(fair * askFactor / 10) * 10);
    market.push({ id: `${state.day}-${forceSalt}-${i}-${Math.floor(rng()*99999)}`, templateId: item.id, condition, rarity, defect, fairValue: fair, ask, sellerId, revealed: false, negotiationFailed: false });
  }
  state.market = market;
  persist();
}

function estimate(item: { fairValue: number; revealed?: boolean }) {
  if (item.revealed) return money(item.fairValue);
  const width = estimateWidth();
  return `${money(item.fairValue * (1 - width))} – ${money(item.fairValue * (1 + width))}`;
}

function conditionLabel(value: number) {
  if (value >= 90) return locale === 'ru' ? 'Отличное' : 'Excellent';
  if (value >= 75) return locale === 'ru' ? 'Хорошее' : 'Good';
  if (value >= 60) return locale === 'ru' ? 'Среднее' : 'Fair';
  return locale === 'ru' ? 'Уставшее' : 'Worn';
}

function rarityLabel(value: number) {
  if (value === 1.65) return locale === 'ru' ? 'Редкий' : 'Rare';
  if (value === 1.2) return locale === 'ru' ? 'Необычный' : 'Uncommon';
  return locale === 'ru' ? 'Обычный' : 'Common';
}

function showToast(message: string) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = message; document.body.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

function showModal(title: string, body: string, actions: Array<{ label: string; className?: string; run: () => void }>) {
  document.querySelector('.modal-backdrop')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div'); modal.className = 'modal';
  modal.innerHTML = `<h3>${title}</h3><p>${body}</p>`;
  const row = document.createElement('div'); row.className = 'actions';
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.className = `btn ${action.className ?? ''}`; button.textContent = action.label;
    button.onclick = () => { backdrop.remove(); action.run(); };
    row.appendChild(button);
  });
  const close = document.createElement('button'); close.className = 'btn'; close.textContent = locale === 'ru' ? 'Закрыть' : 'Close'; close.onclick = () => backdrop.remove(); row.appendChild(close);
  modal.appendChild(row); backdrop.appendChild(modal); document.body.appendChild(backdrop);
  backdrop.addEventListener('pointerdown', (event) => { if (event.target === backdrop) backdrop.remove(); });
}

function showMockAd() {
  if (!yandexBridge.isMockMode()) return () => {};
  const overlay = document.createElement('div'); overlay.className = 'ad-overlay';
  overlay.innerHTML = `<div><b>${t().mockAd}</b><span>${t().mockAdNote}</span></div>`;
  document.body.appendChild(overlay);
  return () => overlay.remove();
}

async function withRewarded(eventName: string, reward: () => void) {
  yandexBridge.gameplayStop(); track(`${eventName}_offer`);
  const close = showMockAd();
  const ok = await yandexBridge.showRewardedAndWait(12000);
  close();
  if (ok) { reward(); track(`${eventName}_rewarded`); persist(); render(); }
  else { track(`${eventName}_failed`); showToast(t().adFail); }
  if (!document.hidden) yandexBridge.gameplayStart();
  return ok;
}

function buy(id: string) {
  const item = state.market.find((entry) => entry.id === id); if (!item) return;
  if (state.inventory.length >= capacity()) return showToast(t().noSpace);
  if (state.cash < item.ask) return showToast(t().noCash);
  state.cash -= item.ask;
  state.market = state.market.filter((entry) => entry.id !== id);
  state.inventory.push({ ...item, paid: item.ask, repairSpent: 0, prepared: false, listed: false, offer: null });
  track('buy'); persist(); state.tab = 'inventory'; render();
}

function negotiate(id: string) {
  const item = state.market.find((entry) => entry.id === id); if (!item) return;
  const seller = SELLERS[item.sellerId];
  const actions = [.78, .87, .94].map((ratio) => ({
    label: money(item.ask * ratio),
    className: ratio === .94 ? 'primary' : '',
    run: () => {
      const offer = Math.round(item.ask * ratio / 10) * 10;
      if (ratio + .001 >= seller.floor) {
        item.ask = offer; item.negotiationFailed = false; track('negotiate_success'); persist(); render(); showToast(t().sellerAccepted);
      } else {
        item.negotiationFailed = true; track('negotiate_fail'); persist(); render();
        showModal(t().sellerRejected, locale === 'ru' ? 'Он больше не отвечает на обычные предложения.' : 'They stopped responding to normal offers.', [
          { label: `▶ ${t().rescueNegotiation} · ${t().rewarded}`, className: 'reward', run: () => void rescueNegotiation(id) }
        ]);
      }
    }
  }));
  showModal(t().negotiation, `${t().sellerWants}: <b>${money(item.ask)}</b><br>${t().seller}: ${seller.name[locale]}`, actions);
}

async function rescueNegotiation(id: string) {
  await withRewarded('rescue_negotiation', () => {
    const item = state.market.find((entry) => entry.id === id); if (!item) return;
    item.negotiationFailed = false; item.ask = Math.round(item.ask * .90 / 10) * 10;
  });
}

async function revealValue(id: string) {
  await withRewarded('reveal_value', () => { const item = state.market.find((entry) => entry.id === id); if (item) item.revealed = true; });
}

async function refreshMarket() {
  if (state.refreshedDay === state.day) return;
  await withRewarded('refresh_market', () => { state.refreshedDay = state.day; generateMarket(1); });
}

function prepareItem(id: string) {
  const item = state.inventory.find((entry) => entry.id === id); if (!item || item.prepared) return;
  const cost = Math.max(80, Math.round(item.fairValue * .07 / 10) * 10);
  if (state.cash < cost) return showToast(t().noCash);
  state.cash -= cost; item.repairSpent += cost; item.prepared = true; item.condition = Math.min(100, item.condition + 15); item.defect = false; item.fairValue = Math.round(item.fairValue * 1.13);
  track('prepare'); persist(); render();
}

function generateOffer(item: OwnedItem, salt = 0): BuyerOffer {
  const rng = seeded(state.seed + state.day * 313 + item.id.length * 97 + state.deals * 61 + salt);
  const buyerId = Math.floor(rng() * BUYERS.length);
  const buyer = BUYERS[buyerId];
  const low = .83 + rng() * .11;
  const factor = Math.min(buyer.ceiling, low + rng() * .13);
  return { buyerId, amount: Math.max(100, Math.round(item.fairValue * factor / 10) * 10) };
}

function toggleListing(id: string) {
  const item = state.inventory.find((entry) => entry.id === id); if (!item) return;
  item.listed = !item.listed;
  item.offer = item.listed ? generateOffer(item) : null;
  track(item.listed ? 'list' : 'delist'); persist(); render();
}

function offerModal(id: string) {
  const item = state.inventory.find((entry) => entry.id === id); if (!item?.offer) return;
  const buyer = BUYERS[item.offer.buyerId];
  const profit = item.offer.amount - item.paid - item.repairSpent;
  showModal(t().buyerTitle, `${buyer.name[locale]}<div class="offer-big">${money(item.offer.amount)}</div>${t().margin}: <b class="${profit >= 0 ? 'profit-pos' : 'profit-neg'}">${profit >= 0 ? '+' : ''}${money(profit)}</b>`, [
    { label: `${t().accept} · ${money(item.offer.amount)}`, className: 'good', run: () => sell(id, item.offer!.amount) },
    { label: `${t().buyerMax} +5%`, run: () => counterOffer(id, 1.05) },
    { label: `${t().buyerMax} +10%`, run: () => counterOffer(id, 1.10) },
    { label: `${t().buyerMax} +15%`, run: () => counterOffer(id, 1.15) }
  ]);
}

function counterOffer(id: string, multiplier: number) {
  const item = state.inventory.find((entry) => entry.id === id); if (!item?.offer) return;
  const buyer = BUYERS[item.offer.buyerId];
  const counter = Math.round(item.offer.amount * multiplier / 10) * 10;
  if (counter <= item.fairValue * buyer.ceiling) {
    track('counter_success'); sell(id, counter); showToast(t().sold);
  } else {
    track('counter_fail'); item.offer = null; persist(); render(); showToast(t().withdrawn);
  }
}

function sell(id: string, amount: number) {
  const item = state.inventory.find((entry) => entry.id === id); if (!item) return;
  const profit = amount - item.paid - item.repairSpent;
  state.cash += amount; state.totalProfit += profit; state.deals += 1;
  const repGain = Math.max(3, Math.min(42, 6 + Math.floor(Math.max(0, profit) / 250)));
  state.reputation += repGain;
  state.inventory = state.inventory.filter((entry) => entry.id !== id);
  track('sale'); persist(); render();
  showToast(`${t().sold}: ${profit >= 0 ? '+' : ''}${money(profit)} · +${repGain} REP`);
}

async function instantBuyer(id: string) {
  await withRewarded('instant_buyer', () => {
    const item = state.inventory.find((entry) => entry.id === id); if (!item) return;
    item.listed = true; item.offer = generateOffer(item, Date.now() % 10000); showToast(t().newBuyer);
  });
}

async function endDay() {
  yandexBridge.gameplayStop();
  const close = showMockAd();
  await yandexBridge.showInterstitial(); close();
  state.day += 1; state.refreshedDay = 0;
  for (const item of state.inventory) if (item.listed) item.offer = generateOffer(item, state.day);
  maybeRescueLot(); generateMarket(0); track('day_end'); persist(); render();
  if (!document.hidden) yandexBridge.gameplayStart();
}

function maybeRescueLot() {
  if (state.cash >= 300 || state.inventory.length > 0 || state.rescueCount >= 2) return;
  const base = ITEMS.find((item) => item.id === 'lamp')!;
  const id = `rescue-${state.day}-${state.rescueCount}`;
  state.inventory.push({ id, templateId: base.id, condition: 82, rarity: 1, defect: false, fairValue: 1450, ask: 0, sellerId: 0, revealed: true, negotiationFailed: false, paid: 0, repairSpent: 0, prepared: false, listed: false, offer: null });
  state.rescueCount += 1; showToast(t().rescueLot); track('rescue_lot');
}

function marketCard(item: MarketItem) {
  const tpl = template(item.templateId); const affordable = state.cash >= item.ask; const space = state.inventory.length < capacity();
  const tags = [`${t().condition}: ${conditionLabel(item.condition)}`, rarityLabel(item.rarity), item.defect ? t().defect : t().clean];
  const dealClass = item.ask < item.fairValue * .88 ? 'good-deal' : '';
  return `<article class="card ${dealClass}" data-card="market-${item.id}">
    <div class="card-top"><div class="item-icon">${tpl.icon}</div><div class="item-main"><div class="item-name">${tpl.name[locale]}</div><div class="item-meta">${categoryNames[tpl.category][locale]} · ${SELLERS[item.sellerId].name[locale]}</div><div class="est">${t().estimate}: ${estimate(item)}</div></div><div class="price">${money(item.ask)}</div></div>
    <div class="tags">${tags.map((tag, i) => `<span class="tag ${i === 2 && item.defect ? 'bad' : ''}">${tag}</span>`).join('')}</div>
    <div class="actions">
      <button class="btn primary" data-action="buy" data-id="${item.id}" ${!affordable || !space ? 'disabled' : ''}>${t().buy}</button>
      <button class="btn" data-action="negotiate" data-id="${item.id}" ${item.negotiationFailed ? 'disabled' : ''}>${t().negotiate}</button>
      ${item.revealed ? '' : `<button class="btn reward" data-action="reveal" data-id="${item.id}">▶ ${t().exact}</button>`}
    </div>
  </article>`;
}

function inventoryCard(item: OwnedItem) {
  const tpl = template(item.templateId); const currentOffer = item.offer?.amount ?? 0; const expectedProfit = currentOffer ? currentOffer - item.paid - item.repairSpent : item.fairValue - item.paid - item.repairSpent;
  return `<article class="card" data-card="inventory-${item.id}">
    <div class="card-top"><div class="item-icon">${tpl.icon}</div><div class="item-main"><div class="item-name">${tpl.name[locale]}</div><div class="item-meta">${conditionLabel(item.condition)} · ${item.prepared ? t().prepared : categoryNames[tpl.category][locale]}</div><div class="est">${t().estimate}: ${estimate(item)}</div></div>${item.listed ? `<span class="tag good">${t().listed}</span>` : ''}</div>
    <div class="kpi-row"><div class="kpi"><span>${t().paid}</span><b>${money(item.paid)}</b></div><div class="kpi"><span>${t().invested}</span><b>${money(item.repairSpent)}</b></div><div class="kpi"><span>${t().margin}</span><b class="${expectedProfit >= 0 ? 'profit-pos' : 'profit-neg'}">${expectedProfit >= 0 ? '+' : ''}${money(expectedProfit)}</b></div></div>
    ${item.offer ? `<div class="notice" style="margin-top:10px"><strong>${t().offer}: ${money(item.offer.amount)}</strong><br>${BUYERS[item.offer.buyerId].name[locale]}</div>` : ''}
    <div class="actions">
      ${!item.prepared ? `<button class="btn" data-action="prepare" data-id="${item.id}">${t().prepare}</button>` : ''}
      <button class="btn ${item.listed ? '' : 'primary'}" data-action="list" data-id="${item.id}">${item.listed ? t().delist : t().list}</button>
      ${item.offer ? `<button class="btn good" data-action="offer" data-id="${item.id}">${t().buyerTitle}</button>` : item.listed ? `<button class="btn reward" data-action="instant" data-id="${item.id}">▶ ${t().instant}</button>` : ''}
    </div>
  </article>`;
}

function progressView() {
  const next = nextStageTarget(); const currentStart = stageIndex() === 0 ? 0 : stageIndex() === 1 ? 120 : 350; const pct = stageIndex() === 2 ? 100 : Math.min(100, ((state.reputation - currentStart) / (next - currentStart)) * 100);
  const milestones = [
    { name: t().garage, rep: 0, cap: 4 }, { name: t().kiosk, rep: 120, cap: 6 }, { name: t().shop, rep: 350, cap: 9 }
  ];
  const categories = (Object.keys(categoryNames) as Category[]).map((cat) => `<div class="milestone ${unlocked(cat) ? 'done' : ''}"><span>${categoryNames[cat][locale]}</span><b>${unlocked(cat) ? t().unlocked : t().locked}</b></div>`).join('');
  return `<div class="progress-card"><div class="section-head"><div><h2>${stageName()}</h2><p>${t().rep}: ${state.reputation}</p></div><b>${stageIndex() === 2 ? 'MAX' : `${Math.max(0, next - state.reputation)} REP`}</b></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div class="kpi-row"><div class="kpi"><span>${t().totalProfit}</span><b class="${state.totalProfit >= 0 ? 'profit-pos' : 'profit-neg'}">${money(state.totalProfit)}</b></div><div class="kpi"><span>${t().deals}</span><b>${state.deals}</b></div><div class="kpi"><span>${t().capacity}</span><b>${capacity()}</b></div></div><div class="milestones">${milestones.map((m) => `<div class="milestone ${state.reputation >= m.rep ? 'done' : ''}"><span>${m.name} · ${m.rep} REP</span><b>${m.cap} slots</b></div>`).join('')}</div></div><div class="section-head"><div><h2>${locale === 'ru' ? 'Категории' : 'Categories'}</h2><p>${locale === 'ru' ? 'Новые рынки открываются репутацией' : 'New markets unlock with reputation'}</p></div></div><div class="milestones">${categories}</div>`;
}

function render() {
  if (!state.market.length) generateMarket(0);
  const c = t();
  let body = '';
  if (state.tab === 'market') body = `<div class="section-head"><div><h2>${c.market}</h2><p>${locale === 'ru' ? 'Ищи разницу между ценой продавца и реальной стоимостью' : 'Look for the gap between seller ask and real value'}</p></div>${state.refreshedDay === state.day ? '' : `<button class="btn reward" data-action="refresh">↻ ${c.refresh}</button>`}</div><div class="stack">${state.market.length ? state.market.map(marketCard).join('') : `<div class="empty">${c.emptyMarket}</div>`}</div>`;
  if (state.tab === 'inventory') body = `<div class="section-head"><div><h2>${c.inventory} · ${state.inventory.length}/${capacity()}</h2><p>${locale === 'ru' ? 'Подготовь товар, выставь и дожми покупателя' : 'Prepare, list and close the buyer'}</p></div></div><div class="stack">${state.inventory.length ? state.inventory.map(inventoryCard).join('') : `<div class="empty">${c.emptyInventory}</div>`}</div>`;
  if (state.tab === 'progress') body = progressView();
  app.innerHTML = `<div class="app-shell"><header class="hero"><div><div class="eyebrow">Yandex market probe · v0</div><h1>${c.title}</h1><div class="subtitle">${c.subtitle}</div></div><div class="lang-pill">${locale.toUpperCase()}</div></header><div class="stats"><div class="stat"><div class="stat-label">${c.cash}</div><div class="stat-value">${money(state.cash)}</div></div><div class="stat"><div class="stat-label">${c.rep}</div><div class="stat-value">${state.reputation}</div></div><div class="stat"><div class="stat-label">${c.day}</div><div class="stat-value">#${state.day}</div></div><div class="stat"><div class="stat-label">${c.stage}</div><div class="stat-value">${stageName()}</div></div></div><div class="notice"><strong>${locale === 'ru' ? 'Подсказка:' : 'Tip:'}</strong> ${locale === 'ru' ? 'точную цену ты не знаешь. Смотри на диапазон, состояние и характер продавца.' : 'you do not know exact value. Read the range, condition and seller personality.'}</div><nav class="tabs"><button class="tab ${state.tab === 'market' ? 'active' : ''}" data-action="tab" data-tab="market">${c.market}</button><button class="tab ${state.tab === 'inventory' ? 'active' : ''}" data-action="tab" data-tab="inventory">${c.inventory} ${state.inventory.length ? `(${state.inventory.length})` : ''}</button><button class="tab ${state.tab === 'progress' ? 'active' : ''}" data-action="tab" data-tab="progress">${c.progress}</button></nav>${body}</div><div class="bottom-bar"><button class="btn primary" data-action="end-day">${c.endDay} →</button></div>`;
}

app.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]'); if (!target) return;
  const action = target.dataset.action; const id = target.dataset.id ?? '';
  if (action === 'tab') { state.tab = (target.dataset.tab as Tab) || 'market'; persist(); render(); }
  if (action === 'buy') buy(id);
  if (action === 'negotiate') negotiate(id);
  if (action === 'reveal') void revealValue(id);
  if (action === 'refresh') void refreshMarket();
  if (action === 'prepare') prepareItem(id);
  if (action === 'list') toggleListing(id);
  if (action === 'offer') offerModal(id);
  if (action === 'instant') void instantBuyer(id);
  if (action === 'end-day') void endDay();
});

document.addEventListener('visibilitychange', () => { if (document.hidden) yandexBridge.gameplayStop(); else yandexBridge.gameplayStart(); });

autoBoot();
async function autoBoot() {
  await yandexBridge.init();
  const lang = yandexBridge.getLanguage(navigator.language || 'ru').toLowerCase();
  locale = lang.startsWith('ru') ? 'ru' : 'en';
  if (!state.market.length) generateMarket(0);
  render();
  await yandexBridge.gameplayReady();
  yandexBridge.gameplayStart();
  (globalThis as any).__RESELLER_TEST__ = {
    getState: () => JSON.parse(JSON.stringify(state)),
    getTelemetry: () => ({ ...telemetry }),
    buy,
    prepareItem,
    toggleListing,
    sell,
    endDay,
    reset: () => { state = freshSave(); generateMarket(0); persist(); render(); },
    forceLocale: (value: Locale) => { locale = value; render(); }
  };
}
