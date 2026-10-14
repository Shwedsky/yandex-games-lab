import fs from 'node:fs';

const HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const SAVE_KEY = 'yg-lab:mutants:v2';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const outDir = 'promo-raw';
const framesDir = `${outDir}/frames`;
fs.mkdirSync(framesDir, { recursive: true });

async function waitForJson(url, attempts = 80) {
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
if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target not found');
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
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}
async function waitForCanvas() {
  for (let i = 0; i < 80; i += 1) {
    if (await evaluate(`Boolean(document.querySelector('canvas'))`)) return;
    await sleep(100);
  }
  throw new Error('Canvas did not appear');
}
async function clickGame(x, y) {
  const point = await evaluate(`(() => { const c=document.querySelector('canvas'); if(!c)return null; const r=c.getBoundingClientRect(); return {x:r.left+(${x}/540)*r.width,y:r.top+(${y}/960)*r.height}; })()`);
  if (!point) throw new Error('Canvas coordinates unavailable');
  await send('Input.dispatchMouseEvent', { type:'mouseMoved', x:point.x, y:point.y, button:'none', buttons:0 });
  await send('Input.dispatchMouseEvent', { type:'mousePressed', x:point.x, y:point.y, button:'left', buttons:1, clickCount:1 });
  await send('Input.dispatchMouseEvent', { type:'mouseReleased', x:point.x, y:point.y, button:'left', buttons:0, clickCount:1 });
}
async function screenshot(path) {
  const result = await send('Page.captureScreenshot', { format:'png', fromSurface:true });
  fs.writeFileSync(path, Buffer.from(result.data, 'base64'));
}
async function acceptedDrop(x) {
  for (let attempt=0; attempt<5; attempt += 1) {
    await clickGame(x, 430);
    await sleep(330);
    return;
  }
}

await send('Page.enable');
await send('Runtime.enable');
await waitForCanvas();
await sleep(800);

// Fresh Russian Biomass gameplay.
await evaluate(`localStorage.removeItem(${JSON.stringify(SAVE_KEY)})`);
await send('Page.reload', { ignoreCache:true });
await waitForCanvas(); await sleep(700);
for (const x of [270,270,270,270,195,195,345,345,270,270,225,315]) await acceptedDrop(x);
await sleep(1100);
await screenshot(`${outDir}/mobile-01-biomass.png`);
await clickGame(365,203); await sleep(500); await screenshot(`${outDir}/mobile-02-genome-lab.png`);
await clickGame(270,912); await sleep(350);
await clickGame(477,203); await sleep(500); await screenshot(`${outDir}/mobile-03-background-shop.png`);
await clickGame(270,880); await sleep(350);

// Seed only this isolated capture profile to show a later genome and a vivid owned background.
await evaluate(`(() => {
  const k=${JSON.stringify(SAVE_KEY)};
  let s=JSON.parse(localStorage.getItem(k)||'{}');
  s.bestScore=4210; s.dna=3500; s.researchDna=3500;
  s.unlockedGenomes=['biomass','predator']; s.selectedGenome='predator';
  s.genomeDiscoveries={biomass:[0,1,2],predator:[0,1,2,3,4]};
  s.ownedBackgrounds=['void','neon']; s.selectedBackground='neon';
  localStorage.setItem(k, JSON.stringify(s));
})()`);
await send('Page.reload', { ignoreCache:true }); await waitForCanvas(); await sleep(700);
for (const x of [270,270,270,270,175,175,365,365,270,270,220,320]) await acceptedDrop(x);
await sleep(1000);
await screenshot(`${outDir}/mobile-04-predator-neon.png`);

// Record an actual gameplay frame sequence. Each captured frame comes directly from the production canvas.
const xs = [270,180,360,230,310,145,395,270,210,330,165,375,250,290,190,350];
let dropIndex = 0;
for (let i=0; i<120; i += 1) {
  if (i % 7 === 0 && dropIndex < xs.length) {
    await clickGame(xs[dropIndex++], 430);
  }
  await sleep(70);
  await screenshot(`${framesDir}/frame-${String(i).padStart(4,'0')}.png`);
}

fs.writeFileSync(`${outDir}/capture-report.json`, JSON.stringify({
  locale: await evaluate('navigator.language'),
  stills: 4,
  videoFrames: 120,
  releaseTitle: await evaluate(`document.title`)
}, null, 2));
ws.close();
