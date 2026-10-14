import fs from 'node:fs';

const HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const SAVE_KEY = 'yg.reseller.v0';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 60) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

const pages = await waitForJson(`${HOST}/json`);
const page = pages.find((item) => item.type === 'page');
if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target was not found');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}
async function waitForHook() {
  for (let i = 0; i < 80; i += 1) {
    if (await evaluate(`Boolean(globalThis.__RESELLER_TEST__)`)) return;
    await sleep(100);
  }
  throw new Error('Reseller test hook did not appear');
}
async function screenshot(path) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path, Buffer.from(result.data, 'base64'));
}
async function state() { return await evaluate(`globalThis.__RESELLER_TEST__.getState()`); }
async function telemetry() { return await evaluate(`globalThis.__RESELLER_TEST__.getTelemetry()`); }
async function clickSelector(selector) {
  const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error(`Missing clickable selector: ${selector}`);
}

await send('Page.enable');
await send('Runtime.enable');
await waitForHook();
await evaluate(`globalThis.__RESELLER_TEST__.reset()`);
await sleep(350);
await screenshot('reseller-smoke-start.png');

let s = await state();
if (s.cash !== 5000 || s.day !== 1) throw new Error(`Unexpected fresh economy: ${JSON.stringify({ cash: s.cash, day: s.day })}`);
if (!Array.isArray(s.market) || s.market.length !== 5) throw new Error('Fresh market must contain 5 listings');
const first = s.market[0];
if (!(first.ask < first.fairValue * 0.85)) throw new Error('First market slot should guarantee a plausible underpriced deal');

// Rewarded price reveal must visibly wait in mock mode and then reveal exact value.
await clickSelector(`[data-action="reveal"][data-id="${first.id}"]`);
await sleep(300);
const adVisible = await evaluate(`Boolean(document.querySelector('.ad-overlay'))`);
if (!adVisible) throw new Error('Mock rewarded ad overlay did not become visible');
await screenshot('reseller-smoke-rewarded.png');
await sleep(1450);
s = await state();
if (!s.market.find((x) => x.id === first.id)?.revealed) throw new Error('Rewarded exact-value reveal did not apply');

// Buy -> inventory -> prepare -> list -> buyer offer -> sale.
await evaluate(`globalThis.__RESELLER_TEST__.buy(${JSON.stringify(first.id)})`);
await sleep(180);
s = await state();
if (s.inventory.length !== 1 || s.market.length !== 4) throw new Error('Buying did not move listing into inventory');
if (!(s.cash < 5000)) throw new Error('Buying did not reduce cash');
const ownedId = s.inventory[0].id;
await screenshot('reseller-smoke-inventory.png');

await evaluate(`globalThis.__RESELLER_TEST__.prepareItem(${JSON.stringify(ownedId)})`);
await evaluate(`globalThis.__RESELLER_TEST__.toggleListing(${JSON.stringify(ownedId)})`);
await sleep(180);
s = await state();
const listed = s.inventory.find((x) => x.id === ownedId);
if (!listed?.listed || !listed.offer?.amount) throw new Error('Listing did not create a buyer offer');
await screenshot('reseller-smoke-offer.png');
const saleAmount = listed.offer.amount;
const cashBeforeSale = s.cash;
await evaluate(`globalThis.__RESELLER_TEST__.sell(${JSON.stringify(ownedId)}, ${saleAmount})`);
await sleep(180);
s = await state();
if (s.inventory.length !== 0 || s.deals !== 1) throw new Error('Sale did not close inventory/deal state');
if (!(s.cash > cashBeforeSale)) throw new Error('Sale did not add proceeds to cash');
if (!(s.reputation > 0)) throw new Error('Sale did not award reputation');

// Day transition + fresh market.
const dayBefore = s.day;
await evaluate(`globalThis.__RESELLER_TEST__.endDay()`);
await sleep(1650);
s = await state();
if (s.day !== dayBefore + 1) throw new Error('End day did not advance the day');
if (!Array.isArray(s.market) || s.market.length !== 5) throw new Error('New day did not refresh market');
await screenshot('reseller-smoke-next-day.png');

const beforeReload = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) || '{}')`);
await send('Page.reload', { ignoreCache: true });
await waitForHook();
await sleep(450);
const afterReload = await state();
if (afterReload.cash !== beforeReload.cash || afterReload.day !== beforeReload.day || afterReload.deals !== beforeReload.deals) {
  throw new Error('Core reseller progression did not persist across reload');
}

const events = await telemetry();
if ((events.reveal_value_rewarded ?? 0) < 1) throw new Error('Rewarded telemetry missing');
if ((events.buy ?? 0) < 1 || (events.sale ?? 0) < 1 || (events.day_end ?? 0) < 1) throw new Error('Core loop telemetry missing');

const report = {
  cash: afterReload.cash,
  reputation: afterReload.reputation,
  day: afterReload.day,
  deals: afterReload.deals,
  totalProfit: afterReload.totalProfit,
  marketCount: afterReload.market.length,
  rewardedReveal: events.reveal_value_rewarded ?? 0,
  buyEvents: events.buy ?? 0,
  saleEvents: events.sale ?? 0,
  dayEndEvents: events.day_end ?? 0
};
fs.writeFileSync('reseller-smoke-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
ws.close();
