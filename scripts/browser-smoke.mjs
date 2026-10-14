import fs from 'node:fs';

const HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const SAVE_KEY = 'yg-lab:mutants:v1';
const TELEMETRY_KEY = 'yg-lab:mutants:telemetry:v1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 50) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
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
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}

async function waitForCanvas() {
  for (let i = 0; i < 50; i += 1) {
    if (await evaluate(`Boolean(document.querySelector('canvas'))`)) return;
    await sleep(100);
  }
  throw new Error('Phaser canvas did not appear');
}

async function clickGame(x, y) {
  const point = await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (${x} / 540) * rect.width,
      y: rect.top + (${y} / 960) * rect.height
    };
  })()`);
  if (!point) throw new Error(`Could not resolve canvas coordinates for ${x},${y}`);

  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none', buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 1 });
}

async function getTelemetry() {
  return await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(TELEMETRY_KEY)}) || '{}')`);
}

async function getSave() {
  return await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) || '{}')`);
}

async function acceptedDrop(x) {
  const before = (await getTelemetry())?.drop ?? 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await clickGame(x, 360);
    await sleep(330);
    const after = (await getTelemetry())?.drop ?? 0;
    if (after > before) return after;
    await sleep(120);
  }
  throw new Error(`Game did not accept a drop after retries; previous count=${before}`);
}

async function screenshot(path) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path, Buffer.from(result.data, 'base64'));
}

await send('Page.enable');
await send('Runtime.enable');
await waitForCanvas();
await sleep(400);
await screenshot('mutants-smoke-start.png');

await clickGame(395, 236);
await sleep(650);

for (let i = 0; i < 8; i += 1) {
  await acceptedDrop(270);
}
await sleep(1100);

const telemetry = await getTelemetry();
const saveAfterPlay = await getSave();

if ((telemetry?.drop ?? 0) < 8) throw new Error(`Expected 8 accepted drops, got ${telemetry?.drop ?? 0}`);
if ((telemetry?.merge_tier_1 ?? 0) < 1) throw new Error('Expected at least one tier-1 merge');
if ((telemetry?.reward_upgrade_next_rewarded ?? 0) < 1) throw new Error('Mock rewarded upgrade did not complete');
if (!Array.isArray(saveAfterPlay?.discovered) || saveAfterPlay.discovered.length < 2) {
  throw new Error('Expected at least two discovered forms after gameplay');
}

await screenshot('mutants-smoke-play.png');

await clickGame(450, 205);
await sleep(350);
await screenshot('mutants-smoke-collection.png');
await clickGame(270, 893);
await sleep(450);

// Take the reference snapshot at the actual reload boundary, after any final physics/merge callbacks have settled.
const saveAtReloadBoundary = await getSave();
await send('Page.reload', { ignoreCache: true });
await waitForCanvas();
await sleep(500);
const saveAfterReload = await getSave();

if ((saveAfterReload?.coins ?? -1) !== (saveAtReloadBoundary?.coins ?? -2)) throw new Error('Coins did not persist across reload');
if ((saveAfterReload?.bestScore ?? -1) !== (saveAtReloadBoundary?.bestScore ?? -2)) throw new Error('Best score did not persist across reload');
if (JSON.stringify(saveAfterReload?.discovered ?? []) !== JSON.stringify(saveAtReloadBoundary?.discovered ?? [])) {
  throw new Error('Discovered forms did not persist across reload');
}

const report = {
  canvas: true,
  drops: telemetry.drop ?? 0,
  tier1Merges: telemetry.merge_tier_1 ?? 0,
  tier2Merges: telemetry.merge_tier_2 ?? 0,
  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,
  discovered: saveAfterReload.discovered?.length ?? 0,
  coins: saveAfterReload.coins ?? 0,
  bestScore: saveAfterReload.bestScore ?? 0,
  collectionScreenshotTaken: true,
  reloadPersistence: true
};
fs.writeFileSync('mutants-smoke-report.json', JSON.stringify(report, null, 2));
console.log('Gameplay smoke report:', report);
ws.close();
