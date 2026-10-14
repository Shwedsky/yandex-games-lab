import fs from 'node:fs';

const HOST = 'http://127.0.0.1:9222';
const SAVE_KEY = 'yg-lab:mutants:v1';
const TELEMETRY_KEY = 'yg-lab:mutants:telemetry:v1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 30) {
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
  const ok = await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + (${x} / 540) * rect.width;
    const clientY = rect.top + (${y} / 960) * rect.height;
    const base = { clientX, clientY, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', button: 0 };
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...base, buttons: 0 }));
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...base, buttons: 1 }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...base, buttons: 0 }));
    return true;
  })()`);
  if (!ok) throw new Error(`Could not click game at ${x},${y}`);
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

// Exercise a rewarded action. mockAds=1 guarantees the local-development fallback resolves as rewarded.
await clickGame(395, 236);
await sleep(550);

// Drop deterministic pairs into four lanes. Repeated same-lane drops should force several tier-1 merges.
const lanes = [135, 225, 315, 405];
for (let i = 0; i < 24; i += 1) {
  await clickGame(lanes[Math.floor(i / 2) % lanes.length], 360);
  await sleep(285);
}
await sleep(1200);

const telemetry = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(TELEMETRY_KEY)}) || '{}')`);
const saveBeforeReload = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) || '{}')`);

if ((telemetry?.drop ?? 0) < 20) throw new Error(`Expected at least 20 registered drops, got ${telemetry?.drop ?? 0}`);
if ((telemetry?.merge_tier_1 ?? 0) < 1) throw new Error('Expected at least one tier-1 merge');
if ((telemetry?.reward_upgrade_next_rewarded ?? 0) < 1) throw new Error('Mock rewarded upgrade did not complete');
if (!Array.isArray(saveBeforeReload?.discovered) || saveBeforeReload.discovered.length < 2) {
  throw new Error('Expected at least two discovered forms before reload');
}

await screenshot('mutants-smoke-play.png');

// Open collection and verify overlay copy is present.
await clickGame(450, 205);
await sleep(300);
const collectionVisible = await evaluate(`document.body.innerText.includes(${JSON.stringify('Collection')})`);
// Phaser canvas text is not DOM text, so collectionVisible can be false; screenshot is the visual assertion.
await screenshot('mutants-smoke-collection.png');
await clickGame(270, 893);
await sleep(250);

// Reload and prove local save continuity.
await send('Page.reload', { ignoreCache: true });
await waitForCanvas();
await sleep(450);
const saveAfterReload = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) || '{}')`);
if ((saveAfterReload?.coins ?? -1) !== (saveBeforeReload?.coins ?? -2)) throw new Error('Coins did not persist across reload');
if (JSON.stringify(saveAfterReload?.discovered ?? []) !== JSON.stringify(saveBeforeReload?.discovered ?? [])) {
  throw new Error('Discovered forms did not persist across reload');
}

const report = {
  canvas: true,
  drops: telemetry.drop ?? 0,
  tier1Merges: telemetry.merge_tier_1 ?? 0,
  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,
  discovered: saveAfterReload.discovered?.length ?? 0,
  coins: saveAfterReload.coins ?? 0,
  collectionScreenshotTaken: true,
  collectionDomTextVisible: collectionVisible,
  reloadPersistence: true
};
fs.writeFileSync('mutants-smoke-report.json', JSON.stringify(report, null, 2));
console.log('Gameplay smoke report:', report);
ws.close();
