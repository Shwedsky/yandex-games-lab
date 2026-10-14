import fs from 'node:fs';

const HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const SAVE_KEY = 'yg-lab:mutants:v2';
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
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result?.value;
}

async function waitForCanvas() {
  for (let i = 0; i < 60; i += 1) {
    if (await evaluate(`Boolean(document.querySelector('canvas'))`)) return;
    await sleep(100);
  }
  throw new Error('Phaser canvas did not appear');
}

async function waitForTestHook() {
  for (let i = 0; i < 60; i += 1) {
    if (await evaluate(`Boolean(globalThis.__MUTANTS_TEST__)`)) return;
    await sleep(100);
  }
  throw new Error('Local Mutants test hook did not appear');
}

async function clickGame(x, y) {
  const point = await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (${x} / 540) * rect.width, y: rect.top + (${y} / 960) * rect.height };
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

async function getTestState() {
  return await evaluate(`globalThis.__MUTANTS_TEST__?.state?.() ?? null`);
}

async function acceptedDrop(x) {
  const before = (await getTelemetry())?.drop ?? 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await clickGame(x, 430);
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
await waitForTestHook();
await sleep(500);
await screenshot('mutants-smoke-start.png');

// In local test mode a rewarded action must visibly wait instead of resolving instantly.
await clickGame(395, 246);
await sleep(300);
await screenshot('mutants-smoke-mock-ad.png');
await sleep(1450);

for (let i = 0; i < 8; i += 1) await acceptedDrop(270);
await sleep(1100);

const telemetry = await getTelemetry();
const saveAfterPlay = await getSave();
const biomassDiscoveries = saveAfterPlay?.genomeDiscoveries?.biomass ?? [];

if ((telemetry?.drop ?? 0) < 8) throw new Error(`Expected 8 accepted drops, got ${telemetry?.drop ?? 0}`);
if ((telemetry?.merge_tier_1 ?? 0) < 1) throw new Error('Expected at least one tier-1 merge');
if ((telemetry?.reward_upgrade_next_rewarded ?? 0) < 1) throw new Error('Mock rewarded upgrade did not complete');
if (!Array.isArray(biomassDiscoveries) || biomassDiscoveries.length < 2) throw new Error('Expected at least two Biomass forms after gameplay');
if ((saveAfterPlay?.dna ?? 0) <= 0 || (saveAfterPlay?.researchDna ?? 0) <= 0) throw new Error('DNA discovery progression did not advance');
if ((saveAfterPlay?.researchDna ?? 0) > 500) throw new Error('Early-run DNA progression is still much too fast');

// Selected-removal rewarded: select a concrete on-board mutant and verify merge-equivalent rewards.
const beforeSelectedRemoveState = await getTestState();
const beforeSelectedRemoveSave = await getSave();
const target = beforeSelectedRemoveState?.mutants?.[0];
if (!target) throw new Error('No live mutant available for selected-removal regression');
await clickGame(145, 246);
await sleep(180);
const selectingState = await getTestState();
if (!selectingState?.selectingRemoval) throw new Error('Remove selected did not enter selection mode');
await clickGame(target.x, target.y);
await sleep(300);
await screenshot('mutants-smoke-remove-selected-ad.png');
await sleep(1450);
const afterSelectedRemoveState = await getTestState();
const afterSelectedRemoveSave = await getSave();
const telemetryAfterSelectedRemove = await getTelemetry();
if (afterSelectedRemoveState?.selectingRemoval || afterSelectedRemoveState?.rewardBusy) throw new Error('Selected-removal flow remained blocked');
if ((telemetryAfterSelectedRemove?.reward_remove_selected_rewarded ?? 0) < 1) throw new Error('Selected-removal rewarded flow did not complete');
if ((afterSelectedRemoveState?.score ?? 0) <= (beforeSelectedRemoveState?.score ?? 0)) throw new Error('Selected removal did not award merge-equivalent score');
if ((afterSelectedRemoveSave?.dna ?? 0) <= (beforeSelectedRemoveSave?.dna ?? 0)) throw new Error('Selected removal did not award DNA');

await screenshot('mutants-smoke-play.png');

// Genome lab / 66-form collection.
await clickGame(365, 203);
await sleep(400);
await screenshot('mutants-smoke-collection.png');
await clickGame(270, 912);
await sleep(350);

// Seed deterministic test-only balance: enough for Neon, but below Parasite unlock.
await evaluate(`(() => {
  const key = ${JSON.stringify(SAVE_KEY)};
  const save = JSON.parse(localStorage.getItem(key) || '{}');
  save.dna = 4500;
  save.researchDna = 4500;
  save.unlockedGenomes = ['biomass', 'predator'];
  save.ownedBackgrounds = ['void'];
  save.selectedBackground = 'void';
  localStorage.setItem(key, JSON.stringify(save));
  return true;
})()`);
await send('Page.reload', { ignoreCache: true });
await waitForCanvas();
await waitForTestHook();
await sleep(550);

await clickGame(477, 203);
await sleep(350);
await clickGame(270, 282);
await sleep(450);
await screenshot('mutants-smoke-shop.png');

const saveAfterShop = await getSave();
if (saveAfterShop?.selectedBackground !== 'neon') throw new Error('Neon background was not equipped after purchase');
if (!(saveAfterShop?.ownedBackgrounds ?? []).includes('neon')) throw new Error('Purchased background was not persisted as owned');
if ((saveAfterShop?.dna ?? -1) !== 1500) throw new Error(`Expected 1500 spendable DNA after 3000-DNA purchase, got ${saveAfterShop?.dna}`);
if ((saveAfterShop?.researchDna ?? -1) !== 4500) throw new Error('Lifetime research DNA changed when cosmetic DNA was spent');
if (!(saveAfterShop?.unlockedGenomes ?? []).includes('predator')) throw new Error('Predator genome unlock did not persist');
if ((saveAfterShop?.unlockedGenomes ?? []).includes('parasite')) throw new Error('Parasite genome unlocked too early below 5000 research DNA');

await clickGame(270, 880);
await sleep(350);

// Explicitly regression-test the two game-over rewarded buttons that failed in human testing.
await evaluate(`globalThis.__MUTANTS_TEST__.forceGameOver()`);
await sleep(250);
await screenshot('mutants-smoke-gameover.png');
await clickGame(270, 515); // revive
await sleep(300);
await screenshot('mutants-smoke-revive-ad.png');
await sleep(1450);
let state = await getTestState();
let telemetryAfterRevive = await getTelemetry();
if (!state || state.ended || state.rewardBusy || !state.revivedThisRun) throw new Error(`Revive did not return to gameplay cleanly: ${JSON.stringify(state)}`);
if ((telemetryAfterRevive?.reward_revive_rewarded ?? 0) < 1) throw new Error('Revive rewarded flow did not complete');

await evaluate(`globalThis.__MUTANTS_TEST__.forceGameOver()`);
await sleep(250);
const dnaBeforeDouble = (await getSave())?.dna ?? 0;
await clickGame(270, 515); // after revive has been used, x2 occupies the first rewarded slot
await sleep(300);
await screenshot('mutants-smoke-double-ad.png');
await sleep(1800);
await waitForCanvas();
await waitForTestHook();
state = await getTestState();
const telemetryAfterDouble = await getTelemetry();
const saveAfterDouble = await getSave();
if (!state || state.ended || state.rewardBusy) throw new Error(`DNA x2 left the game blocked: ${JSON.stringify(state)}`);
if ((telemetryAfterDouble?.reward_double_dna_rewarded ?? 0) < 1) throw new Error('DNA x2 rewarded flow did not complete');
if ((saveAfterDouble?.dna ?? 0) <= dnaBeforeDouble) throw new Error('DNA x2 did not increase the wallet');

const saveAtReloadBoundary = await getSave();
await send('Page.reload', { ignoreCache: true });
await waitForCanvas();
await waitForTestHook();
await sleep(550);
const saveAfterReload = await getSave();

if ((saveAfterReload?.dna ?? -1) !== (saveAtReloadBoundary?.dna ?? -2)) throw new Error('DNA did not persist across reload');
if ((saveAfterReload?.researchDna ?? -1) !== (saveAtReloadBoundary?.researchDna ?? -2)) throw new Error('Research DNA did not persist across reload');
if (saveAfterReload?.selectedBackground !== saveAtReloadBoundary?.selectedBackground) throw new Error('Selected background did not persist across reload');
if (JSON.stringify(saveAfterReload?.genomeDiscoveries ?? {}) !== JSON.stringify(saveAtReloadBoundary?.genomeDiscoveries ?? {})) {
  throw new Error('Genome discoveries did not persist across reload');
}

const report = {
  canvas: true,
  drops: telemetry.drop ?? 0,
  tier1Merges: telemetry.merge_tier_1 ?? 0,
  tier2Merges: telemetry.merge_tier_2 ?? 0,
  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,
  rewardedRemoveSelected: telemetryAfterSelectedRemove.reward_remove_selected_rewarded ?? 0,
  rewardedRevive: telemetryAfterRevive.reward_revive_rewarded ?? 0,
  rewardedDoubleDna: telemetryAfterDouble.reward_double_dna_rewarded ?? 0,
  biomassDiscovered: biomassDiscoveries.length,
  earlyResearchDna: saveAfterPlay.researchDna ?? 0,
  dnaAfterCosmeticPurchase: saveAfterShop.dna ?? 0,
  researchDna: saveAfterReload.researchDna ?? 0,
  unlockedGenomes: saveAfterReload.unlockedGenomes ?? [],
  selectedBackground: saveAfterReload.selectedBackground,
  mockAdScreenshotTaken: true,
  collectionScreenshotTaken: true,
  shopScreenshotTaken: true,
  gameOverRewardedRegression: true,
  reloadPersistence: true
};
fs.writeFileSync('mutants-smoke-report.json', JSON.stringify(report, null, 2));
console.log('Gameplay smoke report:', report);
ws.close();
