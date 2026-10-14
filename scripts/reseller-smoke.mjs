import fs from 'node:fs';

const HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 50) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try { const response = await fetch(url); if (response.ok) return await response.json(); }
    catch (error) { lastError = error; }
    await sleep(200);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

const pages = await waitForJson(`${HOST}/json`);
const page = pages.find((item) => item.type === 'page');
if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target was not found');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let nextId = 1; const pending = new Map();
ws.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (!message.id) return; const waiter = pending.get(message.id); if (!waiter) return; pending.delete(message.id); if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result); });
function send(method, params = {}) { const id = nextId++; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${JSON.stringify(result.exceptionDetails)}`); return result.result?.value; }
async function waitForHook() { for (let i = 0; i < 80; i += 1) { if (await evaluate(`Boolean(globalThis.__RESELLER_TEST__)`)) return; await sleep(100); } throw new Error('Reseller test hook did not appear'); }
async function click(selector) { const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`); if (!ok) throw new Error(`Missing clickable selector: ${selector}`); }
async function state() { return await evaluate(`globalThis.__RESELLER_TEST__?.getState?.() ?? null`); }
async function screenshot(path) { const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); fs.writeFileSync(path, Buffer.from(result.data, 'base64')); }

await send('Page.enable'); await send('Runtime.enable'); await waitForHook(); await sleep(350); await screenshot('reseller-smoke-start.png');
let s = await state();
if (!s?.market?.length) throw new Error('Market did not generate');
if (s.save.cash !== 5000) throw new Error(`Unexpected starting cash: ${s.save.cash}`);
if (s.save.stage !== 'garage') throw new Error(`Expected garage start, got ${s.save.stage}`);
if (Math.max(...s.market.map(x => x.ask)) > 15000) throw new Error('Garage market is still too expensive for the opening stage');

const targetId = await evaluate(`(() => { const st = globalThis.__RESELLER_TEST__.getState(); const item = st.market.filter(x => x.ask <= st.save.cash).sort((a,b)=>a.ask-b.ask)[0]; if (!item) return null; document.querySelector('[data-negotiate="'+item.id+'"]')?.click(); return item.id; })()`);
if (!targetId) throw new Error('No affordable starting item found');
await sleep(100);
await click('[data-seller-offer=".90"]');
await sleep(120);
s = await state();
if (s.save.inventory.length !== 0) throw new Error('Seller negotiation auto-bought the item');
if (!s.negotiationItem) throw new Error('Negotiation closed instead of waiting for explicit confirmation');
await click('[data-seller-accept]');
await sleep(150);
s = await state();
if (s.save.inventory.length !== 1) throw new Error('Confirmed negotiated purchase did not add inventory');
if (s.save.cash >= 5000) throw new Error('Purchase did not reduce cash');

await click('[data-repair]'); await sleep(120);
s = await state();
const spentOnce = s.save.inventory[0]?.repairSpent ?? 0;
if (spentOnce <= 0 || s.save.inventory[0]?.prepCount !== 1) throw new Error('Prep did not apply exactly once');
const cashAfterPrep = s.save.cash;
await click('[data-repair]'); await sleep(100);
s = await state();
if ((s.save.inventory[0]?.repairSpent ?? 0) !== spentOnce || s.save.cash !== cashAfterPrep) throw new Error('Repeated prep changed item or cash');

await click('[data-list]'); await sleep(180);
s = await state();
if (s.save.inventory[0]?.state !== 'listed') throw new Error('Item was not listed');
if (!s.buyerOffer) throw new Error('Mock-mode listing did not generate buyer offer');
await screenshot('reseller-smoke-listed.png');
await click('[data-accept-buyer]'); await sleep(120);
s = await state();
if (s.save.inventory.length !== 0 || s.save.deals !== 1) throw new Error('Sale did not complete');
if (!Number.isFinite(s.save.lifetimeProfit)) throw new Error('Profit state invalid');
await screenshot('reseller-smoke-sold.png');

await click('[data-refresh]'); await sleep(250); await screenshot('reseller-smoke-rewarded.png'); await sleep(1350);
const telemetry = await evaluate(`globalThis.__RESELLER_TELEMETRY__ ?? {}`);
if ((telemetry.refresh_market ?? 0) < 1) throw new Error('Rewarded market refresh did not complete');
const dayBefore = (await state()).save.day;
await click('[data-end-day]'); await sleep(1550);
s = await state();
if (s.save.day !== dayBefore + 1) throw new Error('Day transition failed');
await screenshot('reseller-smoke-next-day.png');
await send('Page.reload', { ignoreCache: true }); await waitForHook(); await sleep(350);
s = await state();
if (s.save.day !== dayBefore + 1 || s.save.deals !== 1) throw new Error('Local save did not survive reload');
const report = { day:s.save.day, cash:s.save.cash, reputation:s.save.reputation, lifetimeProfit:s.save.lifetimeProfit, deals:s.save.deals, stage:s.save.stage, marketCount:s.market.length, maxGarageAsk:Math.max(...s.market.map(x=>x.ask)), rewardedRefresh:telemetry.refresh_market ?? 0 };
fs.writeFileSync('reseller-smoke-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); ws.close();
