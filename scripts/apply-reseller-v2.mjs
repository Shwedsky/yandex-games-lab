import fs from 'node:fs';

const mainPath = 'apps/reseller-empire/src/main.ts';
const cssPath = 'apps/reseller-empire/src/styles.css';
const smokePath = 'scripts/reseller-smoke.mjs';

let main = fs.readFileSync(mainPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let smoke = fs.readFileSync(smokePath, 'utf8');

function replaceRequired(label, source, pattern, replacement) {
  if (!pattern.test(source)) throw new Error(`Patch anchor not found: ${label}`);
  return source.replace(pattern, replacement);
}

main = replaceRequired('market item negotiation rounds', main, /  revealed: boolean;\n};/, `  revealed: boolean;\n  negotiationRounds?: number;\n};`);
main = replaceRequired('owned prep count', main, /  listedPrice\?: number;\n};/, `  listedPrice?: number;\n  prepCount?: number;\n};`);

main = replaceRequired(
  'stage info',
  main,
  /function stageInfo\(\) \{[\s\S]*?\n\}\nfunction stageLabel\(stage: Stage\) \{ return TEXT\[locale\]\[stage\]; \}/,
  `const STAGE_CONFIG: Record<Stage, { slots: number; estimateWidth: number; marketFactor: number; next?: Stage; requiredRep?: number; upgradeCost?: number }> = {\n  garage: { slots: 4, estimateWidth: .27, marketFactor: .62, next: 'kiosk', requiredRep: 18, upgradeCost: 12000 },\n  kiosk: { slots: 7, estimateWidth: .16, marketFactor: .9, next: 'shop', requiredRep: 60, upgradeCost: 65000 },\n  shop: { slots: 10, estimateWidth: .08, marketFactor: 1.18 }\n};\nfunction stageInfo() {\n  const config = STAGE_CONFIG[save.stage];\n  return { stage: save.stage, ...config };\n}\nfunction stageLabel(stage: Stage) { return TEXT[locale][stage]; }\nfunction categoryLabel(category: Category) {\n  const ru: Record<Category, string> = { household: 'бытовая техника', bike: 'велосипеды', phone: 'гаджеты', electronics: 'электроника', collectible: 'коллекционное' };\n  const en: Record<Category, string> = { household: 'household', bike: 'bikes', phone: 'gadgets', electronics: 'electronics', collectible: 'collectibles' };\n  return (locale === 'ru' ? ru : en)[category];\n}\nfunction marketTrend() {\n  const categories = Object.keys(CATEGORIES) as Category[];\n  const random = rng(700001 + save.day * 3571);\n  const hot = categories[Math.floor(random() * categories.length)];\n  let cold = categories[Math.floor(random() * categories.length)];\n  if (cold === hot) cold = categories[(categories.indexOf(hot) + 2) % categories.length];\n  return { hot, cold, hotBonus: .16, coldPenalty: .08 };\n}\nfunction demandMultiplier(category: Category) {\n  const trend = marketTrend();\n  if (category === trend.hot) return 1 + trend.hotBonus;\n  if (category === trend.cold) return 1 - trend.coldPenalty;\n  return 1;\n}\nfunction trendText() {\n  const trend = marketTrend();\n  return locale === 'ru'\n    ? \`Сегодня: 📈 \${categoryLabel(trend.hot)} +16% · 📉 \${categoryLabel(trend.cold)} -8%\`\n    : \`Today: 📈 \${categoryLabel(trend.hot)} +16% · 📉 \${categoryLabel(trend.cold)} -8%\`;\n}`
);

main = replaceRequired(
  'normalize save',
  main,
  /function normalizeSave\(raw: Partial<Save>\): Save \{[\s\S]*?\n\}\nfunction persist\(\) \{ save\.stage = stageInfo\(\)\.stage; saveLocal\(SAVE_KEY, save\); \}/,
  `function normalizeSave(raw: Partial<Save>): Save {\n  const stage: Stage = raw.stage === 'kiosk' || raw.stage === 'shop' ? raw.stage : 'garage';\n  const inventory = Array.isArray(raw.inventory) ? raw.inventory.map((item) => ({ ...item, prepCount: clamp(Number(item.prepCount ?? 0), 0, 1) })) : [];\n  return {\n    version: 1,\n    day: Math.max(1, raw.day ?? 1), cash: Math.max(0, raw.cash ?? START_CASH), reputation: Math.max(0, raw.reputation ?? 0),\n    lifetimeProfit: raw.lifetimeProfit ?? 0, deals: Math.max(0, raw.deals ?? 0), stage, inventory,\n    marketSeed: raw.marketSeed ?? 20261014, logs: Array.isArray(raw.logs) ? raw.logs.slice(0, 14) : []\n  };\n}\nfunction persist() { saveLocal(SAVE_KEY, save); }`
);

main = replaceRequired(
  'generate market',
  main,
  /function generateMarket\(\) \{[\s\S]*?\n\}\n\nfunction estimate\(item: MarketItem\) \{/,
  `function generateMarket() {\n  const random = rng(save.marketSeed + save.day * 7919 + save.reputation * 31);\n  const categories: Category[] = save.stage === 'garage'\n    ? ['household', 'bike', 'phone']\n    : save.stage === 'kiosk'\n      ? ['household', 'bike', 'phone', 'electronics']\n      : ['household', 'bike', 'phone', 'electronics', 'collectible'];\n  const stageFactor = STAGE_CONFIG[save.stage].marketFactor;\n  const dayFactor = 1 + Math.min(8, save.day - 1) * .025;\n  market = Array.from({ length: MAX_MARKET }, (_, i) => {\n    const category = categories[Math.floor(random() * categories.length)];\n    const data = CATEGORIES[category];\n    const names = data[locale];\n    const condition = Math.round(38 + random() * 60);\n    const rarityRoll = random();\n    const rarity = save.stage === 'garage' ? (rarityRoll < .13 ? 2 : 1) : save.stage === 'kiosk' ? (rarityRoll < .05 ? 3 : rarityRoll < .24 ? 2 : 1) : (rarityRoll < .11 ? 3 : rarityRoll < .34 ? 2 : 1);\n    const defect = random() < (save.stage === 'garage' ? .27 : .21);\n    const base = (data.base[0] + random() * (data.base[1] - data.base[0])) * stageFactor * dayFactor;\n    const conditionFactor = .5 + condition / 195;\n    const rarityFactor = rarity === 3 ? 1.55 : rarity === 2 ? 1.2 : 1;\n    const defectFactor = defect ? .7 : 1;\n    const fairValue = Math.max(250, Math.round(base * conditionFactor * rarityFactor * defectFactor / 50) * 50);\n    const moodBase = save.stage === 'garage' ? .93 : save.stage === 'kiosk' ? .9 : .88;\n    const moodRange = save.stage === 'garage' ? .24 : save.stage === 'kiosk' ? .3 : .34;\n    const sellerMood = moodBase + random() * moodRange;\n    const ask = Math.max(250, Math.round(fairValue * sellerMood / 50) * 50);\n    return { id: \`d\${save.day}-\${save.marketSeed}-\${i}\`, category, title: names[Math.floor(random() * names.length)], icon: data.icon, condition, rarity, defect, fairValue, ask, sellerMood, revealed: false, negotiationRounds: 0 };\n  });\n}\n\nfunction estimate(item: MarketItem) {`
);

main = replaceRequired('estimate width', main, /  const stage = stageInfo\(\)\.stage;\n  const width = stage === 'shop' \? \.08 : stage === 'kiosk' \? \.16 : \.27;/, `  const width = STAGE_CONFIG[save.stage].estimateWidth;`);
main = replaceRequired(
  'resale value',
  main,
  /function resaleValue\(item: MarketItem \| OwnedItem\) \{[\s\S]*?\n\}/,
  `function resaleValue(item: MarketItem | OwnedItem) {\n  const prep = 'repairSpent' in item ? Math.min(.12, item.repairSpent / Math.max(1, item.fairValue) * .55) : 0;\n  return Math.round(item.fairValue * (1.04 + prep) * demandMultiplier(item.category) / 50) * 50;\n}`
);
main = replaceRequired('buy prep count', main, /save\.inventory\.push\(\{ \.\.\.item, paid: price, repairSpent: 0, state: 'owned' \}\);/, `save.inventory.push({ ...item, paid: price, repairSpent: 0, prepCount: 0, state: 'owned' });`);

main = replaceRequired(
  'seller counter',
  main,
  /function sellerCounter\(item: MarketItem, offer: number\) \{[\s\S]*?\n\}\n\nfunction repair/,
  `function sellerCounter(item: MarketItem, offer: number) {\n  const floor = Math.round(item.fairValue * (.82 + (item.sellerMood - .88) * .16) / 50) * 50;\n  item.negotiationRounds = (item.negotiationRounds ?? 0) + 1;\n  if (offer >= floor) {\n    item.ask = offer;\n    toast(locale === 'ru' ? \`Продавец согласен на \${money(offer)}. Подтверди покупку.\` : \`Seller agrees to \${money(offer)}. Confirm the purchase.\`);\n    render();\n    return;\n  }\n  const counter = Math.max(offer + 100, Math.round(((item.ask + Math.max(offer, floor)) / 2) / 50) * 50);\n  item.ask = counter;\n  const final = (item.negotiationRounds ?? 0) >= 2;\n  toast(final\n    ? (locale === 'ru' ? \`Финальная цена продавца: \${money(counter)}\` : \`Seller final price: \${money(counter)}\`)\n    : (locale === 'ru' ? \`Продавец готов на \${money(counter)}\` : \`Seller counters \${money(counter)}\`));\n  render();\n}\n\nfunction repair`
);

main = replaceRequired(
  'repair limit',
  main,
  /function repair\(item: OwnedItem\) \{[\s\S]*?\n\}\n\nfunction listItem/,
  `function repair(item: OwnedItem) {\n  if (item.state !== 'owned') return;\n  if ((item.prepCount ?? 0) >= 1) return toast(locale === 'ru' ? 'Предмет уже подготовлен: 1/1' : 'Item is already prepped: 1/1');\n  const cost = Math.max(150, Math.round(item.fairValue * (item.defect ? .08 : .035) / 50) * 50);\n  if (save.cash < cost) return toast(TEXT[locale].noMoney);\n  save.cash -= cost;\n  item.repairSpent += cost;\n  item.prepCount = 1;\n  item.condition = clamp(item.condition + (item.defect ? 15 : 7), 1, 100);\n  item.defect = false;\n  item.fairValue = Math.round(item.fairValue * 1.06 / 50) * 50;\n  log(\`\${locale === 'ru' ? 'Подготовка 1/1' : 'Prep 1/1'}: \${item.title} · -\${money(cost)}\`);\n  persist(); render();\n}\n\nfunction listItem`
);

main = replaceRequired(
  'sell reputation',
  main,
  /save\.cash \+= amount; save\.lifetimeProfit \+= profit; save\.deals \+= 1; save\.reputation = Math\.max\(0, save\.reputation \+ \(profit >= 0 \? 3 \+ Math\.min\(5, Math\.floor\(profit \/ 2500\)\) : -1\)\);/,
  `save.cash += amount; save.lifetimeProfit += profit; save.deals += 1; save.reputation = Math.max(0, save.reputation + (profit >= 0 ? 2 + Math.min(3, Math.floor(profit / 3000)) : -1));`
);

main = replaceRequired('rescue prep count', main, /return \{ \.\.\.item, paid: 0, repairSpent: 0, state: 'owned' \};/, `return { ...item, paid: 0, repairSpent: 0, prepCount: 0, state: 'owned' };`);

main = replaceRequired(
  'stage progress',
  main,
  /function stageProgress\(\) \{[\s\S]*?\n\}/,
  `function stageProgress() {\n  const s = stageInfo();\n  if (!s.next || !s.requiredRep) return 100;\n  return clamp(save.reputation / s.requiredRep * 100, 0, 100);\n}\nfunction upgradeBusiness() {\n  const s = stageInfo();\n  if (!s.next || !s.requiredRep || !s.upgradeCost) return;\n  if (save.reputation < s.requiredRep) return toast(locale === 'ru' ? \`Нужно репутации: \${s.requiredRep}\` : \`Reputation required: \${s.requiredRep}\`);\n  if (save.cash < s.upgradeCost) return toast(locale === 'ru' ? \`На развитие нужно \${money(s.upgradeCost)}\` : \`Upgrade costs \${money(s.upgradeCost)}\`);\n  save.cash -= s.upgradeCost;\n  save.stage = s.next;\n  save.marketSeed += 303;\n  const message = locale === 'ru' ? \`Бизнес улучшен: \${stageLabel(save.stage)}\` : \`Business upgraded: \${stageLabel(save.stage)}\`;\n  generateMarket();\n  log(message);\n  persist(); render();\n}\nfunction businessProgressPanel() {\n  const s = stageInfo();\n  const currentBenefit = save.stage === 'garage'\n    ? (locale === 'ru' ? '4 места · оценка ±27% · базовый рынок' : '4 slots · estimate ±27% · basic market')\n    : save.stage === 'kiosk'\n      ? (locale === 'ru' ? '7 мест · оценка ±16% · электроника' : '7 slots · estimate ±16% · electronics')\n      : (locale === 'ru' ? '10 мест · оценка ±8% · премиальный рынок' : '10 slots · estimate ±8% · premium market');\n  if (!s.next || !s.requiredRep || !s.upgradeCost) {\n    return \`<section class="business-progress"><div><small>\${TEXT[locale].business}</small><h2>\${stageLabel(save.stage)}</h2><p>\${currentBenefit}</p></div><span class="badge good">\${locale === 'ru' ? 'Максимальный уровень' : 'Max level'}</span></section>\`;\n  }\n  const nextBenefit = s.next === 'kiosk'\n    ? (locale === 'ru' ? '7 мест, оценка точнее, открывается электроника' : '7 slots, better estimates, electronics unlock')\n    : (locale === 'ru' ? '10 мест, оценка ±8%, премиальные лоты' : '10 slots, ±8% estimates, premium lots');\n  const ready = save.reputation >= s.requiredRep && save.cash >= s.upgradeCost;\n  return \`<section class="business-progress"><div class="business-copy"><small>\${TEXT[locale].business}</small><h2>\${stageLabel(save.stage)} → \${stageLabel(s.next)}</h2><p>\${currentBenefit}</p><strong>\${locale === 'ru' ? 'Следующий уровень' : 'Next level'}: \${s.requiredRep} REP + \${money(s.upgradeCost)}</strong><p class="meta">\${nextBenefit}</p></div><button class="btn primary" data-upgrade-stage \${ready ? '' : 'disabled'}>\${locale === 'ru' ? 'Улучшить бизнес' : 'Upgrade business'}</button></section>\`;\n}`
);

main = replaceRequired(
  'owned card',
  main,
  /function ownedCard\(item: OwnedItem\) \{[\s\S]*?\n\}\nfunction buyerPanel/,
  `function ownedCard(item: OwnedItem) {\n  const expected = resaleValue(item); const invested = item.paid + item.repairSpent; const delta = expected - invested;\n  const prepped = (item.prepCount ?? 0) >= 1;\n  const prepText = prepped ? (locale === 'ru' ? 'Подготовлено 1/1' : 'Prepped 1/1') : (locale === 'ru' ? 'Подготовить 0/1' : 'Prep 0/1');\n  return \`<article class="card">\n    <div class="card-title"><div class="icon">\${item.icon}</div><div><h3>\${item.title}</h3><div class="meta">\${TEXT[locale].condition}: \${item.condition}% · \${item.state === 'listed' ? TEXT[locale].listed : TEXT[locale].owned} · \${locale === 'ru' ? 'подготовка' : 'prep'} \${item.prepCount ?? 0}/1</div></div></div>\n    <div class="kpi"><div><small>\${TEXT[locale].paid}</small><strong>\${money(invested)}</strong></div><div><small>\${TEXT[locale].expected}</small><strong class="\${delta >= 0 ? 'good' : 'bad'}">\${money(expected)}</strong></div></div>\n    <div class="actions">\${item.state === 'owned' ? \`<button class="btn" data-repair="\${item.id}" \${prepped ? 'disabled' : ''}>\${prepText}</button><button class="btn good" data-list="\${item.id}">\${TEXT[locale].list}</button>\` : \`<button class="btn reward" data-instant="\${item.id}">▶ \${TEXT[locale].instant}</button>\`}</div>\n  </article>\`;\n}\nfunction buyerPanel`
);

main = replaceRequired(
  'seller modal',
  main,
  /function modal\(\) \{[\s\S]*?\n\}\n\nfunction render/,
  `function modal() {\n  if (!negotiationItem) return '';\n  const item = negotiationItem;\n  const rounds = item.negotiationRounds ?? 0;\n  const final = rounds >= 2;\n  return \`<div class="modal-backdrop"><div class="modal"><h2>\${TEXT[locale].negotiate}: \${item.title}</h2><div class="quote"><small>\${TEXT[locale].sellerSays}</small><div class="offer-amount">\${money(item.ask)}</div></div><div class="meta">\${locale === 'ru' ? \`Раунд торга \${Math.min(rounds, 2)}/2 · скидка не покупает товар автоматически\` : \`Negotiation round \${Math.min(rounds, 2)}/2 · an offer never auto-buys the item\`}</div><div class="actions"><button class="btn primary" data-seller-accept>\${locale === 'ru' ? \`Купить за \${money(item.ask)}\` : \`Buy for \${money(item.ask)}\`}</button><button class="btn" data-seller-offer=".90" \${final ? 'disabled' : ''}>\${TEXT[locale].offerLow}</button><button class="btn" data-seller-offer=".95" \${final ? 'disabled' : ''}>\${TEXT[locale].offerMed}</button><button class="btn ghost" data-seller-walk>\${TEXT[locale].walk}</button></div></div></div>\`;\n}\n\nfunction render`
);

main = replaceRequired(
  'render business stat and panel',
  main,
  /<div class="stat"><small>\$\{TEXT\[locale\]\.business\}<\/small><strong>\$\{stageLabel\(s\.stage\)\}<\/strong><div class="meta">\$\{s\.slots\} \$\{TEXT\[locale\]\.slots\}\$\{s\.next \? ` · \$\{TEXT\[locale\]\.next\}: \$\{s\.next\}` : ''\}<\/div><\/div>\n    <\/section>\n    <div class="layout">/,
  `<div class="stat"><small>\${TEXT[locale].business}</small><strong>\${stageLabel(s.stage)}</strong><div class="meta">\${s.slots} \${TEXT[locale].slots} · \${locale === 'ru' ? 'оценка' : 'estimate'} ±\${Math.round(STAGE_CONFIG[s.stage].estimateWidth * 100)}%</div></div>\n    </section>\n    \${businessProgressPanel()}\n    <div class="layout">`
);

main = replaceRequired(
  'market trend display',
  main,
  /<section class="panel"><div class="panel-head"><div><h2>\$\{TEXT\[locale\]\.feed\}<\/h2><p>\$\{TEXT\[locale\]\.marketHint\}<\/p><\/div><button class="btn reward" data-refresh>/,
  `<section class="panel"><div class="panel-head"><div><h2>\${TEXT[locale].feed}</h2><p>\${TEXT[locale].marketHint}</p><div class="trend">\${trendText()}</div></div><button class="btn reward" data-refresh>`
);
main = replaceRequired('upgrade bind', main, /document\.querySelector\('\[data-end-day\]'\)\?\.addEventListener\('click', \(\) => void endDay\(\)\);/, `document.querySelector('[data-end-day]')?.addEventListener('click', () => void endDay());\n  document.querySelector('[data-upgrade-stage]')?.addEventListener('click', upgradeBusiness);`);

// Make the game explicitly use a normal pointer; it never requests pointer-lock.
if (!css.includes('html, body, #app { cursor: default; }')) {
  css = css.replace('body { min-height: 100vh; }', 'body { min-height: 100vh; }\nhtml, body, #app { cursor: default; }');
}
css += `\n.business-progress { display:flex; align-items:center; justify-content:space-between; gap:16px; background:linear-gradient(110deg,#18283b,#151b27); border:1px solid #334b68; border-radius:16px; padding:14px 16px; }\n.business-progress h2 { margin:2px 0 6px; font-size:20px; }\n.business-progress p { margin:3px 0; color:var(--muted); }\n.business-copy { min-width:0; }\n.trend { margin-top:7px; display:inline-flex; border:1px solid #344b67; background:#101a27; border-radius:999px; padding:5px 9px; color:#c8d8ed; font-size:12px; }\n@media (max-width: 620px) { .business-progress { align-items:stretch; flex-direction:column; } .business-progress .btn { width:100%; } }\n`;

// Replace the initial smoke path with explicit seller negotiation and one-time prep assertions.
smoke = replaceRequired(
  'smoke direct buy',
  smoke,
  /const affordable = await evaluate\(`[\s\S]*?if \(!affordable\) throw new Error\('No affordable starting item found'\);\nawait sleep\(150\);\ns = await state\(\);\nif \(s\.save\.inventory\.length !== 1\) throw new Error\('Buy did not add inventory'\);\nif \(s\.save\.cash >= 5000\) throw new Error\('Buy did not reduce cash'\);/,
  `const affordable = await evaluate(\`(() => {\n  const st = globalThis.__RESELLER_TEST__.getState();\n  const item = st.market.filter(x => x.ask <= st.save.cash).sort((a,b) => a.ask-b.ask)[0];\n  if (!item) return null;\n  document.querySelector('[data-negotiate="' + item.id + '"]')?.click();\n  return item.id;\n})()\`);\nif (!affordable) throw new Error('No affordable starting item found');\nawait sleep(120);\nawait click('[data-seller-offer=".95"]');\nawait sleep(120);\ns = await state();\nif (s.save.inventory.length !== 0) throw new Error('Seller discount auto-bought the item; explicit confirmation is required');\nif (!s.negotiationItem) throw new Error('Negotiation closed before explicit purchase confirmation');\nawait click('[data-seller-accept]');\nawait sleep(150);\ns = await state();\nif (s.save.inventory.length !== 1) throw new Error('Confirmed negotiated purchase did not add inventory');\nif (s.save.cash >= 5000) throw new Error('Negotiated purchase did not reduce cash');`
);
smoke = replaceRequired(
  'smoke prep',
  smoke,
  /await click\('\[data-repair\]'\);\nawait sleep\(120\);\ns = await state\(\);\nif \(\(s\.save\.inventory\[0\]\?\.repairSpent \?\? 0\) <= 0\) throw new Error\('Prep did not spend money'\);/,
  `await click('[data-repair]');\nawait sleep(120);\ns = await state();\nconst prepSpent = s.save.inventory[0]?.repairSpent ?? 0;\nif (prepSpent <= 0 || (s.save.inventory[0]?.prepCount ?? 0) !== 1) throw new Error('Prep 1/1 did not apply');\nawait evaluate(\`document.querySelector('[data-repair]')?.click()\`);\nawait sleep(80);\ns = await state();\nif ((s.save.inventory[0]?.repairSpent ?? 0) !== prepSpent || (s.save.inventory[0]?.prepCount ?? 0) !== 1) throw new Error('Prep could be repeated beyond 1/1');`
);

fs.writeFileSync(mainPath, main);
fs.writeFileSync(cssPath, css);
fs.writeFileSync(smokePath, smoke);
console.log('Reseller v2 patch applied.');
