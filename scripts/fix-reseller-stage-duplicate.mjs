import fs from 'node:fs';
const p='apps/reseller-empire/src/main.ts';
let s=fs.readFileSync(p,'utf8');
const needle="    const defect = random() < .24;\n    const stage = stageInfo().stage;\n    const stageScale = stage === 'garage' ? .52 : stage === 'kiosk' ? .9 : 1.25;";
const repl="    const defect = random() < .24;\n    const stageScale = stage === 'garage' ? .52 : stage === 'kiosk' ? .9 : 1.25;";
if(!s.includes(needle)) throw new Error('duplicate-stage anchor missing');
s=s.replace(needle,repl);
fs.writeFileSync(p,s);
