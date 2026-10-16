import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('apps/reseller-empire/dist');
const index = path.join(dist, 'index.html');
const maxBytes = 100 * 1024 * 1024;
function fail(message) { console.error(`RESELLER PACKAGE CHECK FAILED: ${message}`); process.exitCode = 1; }
if (!fs.existsSync(index)) { fail('index.html must exist at package root'); process.exit(); }
const html = fs.readFileSync(index, 'utf8');
if (!html.includes('src="/sdk.js"')) fail('Yandex SDK /sdk.js is not included');
if (!html.includes('viewport')) fail('mobile viewport settings are missing');
if (!html.includes('Перекуп: с гаража до империи')) fail('production title is missing from index.html');
let total = 0;
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else { const stat = fs.statSync(absolute); total += stat.size; files.push(path.relative(dist, absolute)); }
  }
}
walk(dist);
if (total >= maxBytes) fail(`unpacked build is ${(total / 1024 / 1024).toFixed(2)} MB; must remain below 100 MB`);
if (files.some((name) => name.endsWith('.map'))) fail('source maps must not be shipped');
if (!files.some((name) => name.endsWith('.js'))) fail('compiled JavaScript bundle is missing');
if (!process.exitCode) console.log(`Reseller Yandex package OK: ${files.length} files, ${(total / 1024).toFixed(1)} KiB unpacked`);
