import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing patch anchor: ${label}`);
  return text.replace(from, to);
}

// --- content / economy / background copy ---
{
  const path = 'apps/mutants-merge/src/content.ts';
  let s = read(path);
  s = replaceOnce(s, "id: 'predator', unlockResearch: 1500,", "id: 'predator', unlockResearch: 1250,", 'predator threshold');
  s = replaceOnce(s, "description: { ru: 'Яркая сетка и циановые контуры', en: 'Bright grid and cyan conduits' },", "description: { ru: 'Контурная сетка', en: 'Contour grid' },", 'neon description');
  s = replaceOnce(s, "description: { ru: 'Живые мембраны и кислотное свечение', en: 'Living membranes and acid glow' },", "description: { ru: 'Живые мембраны', en: 'Living membranes' },", 'biolab description');
  s = replaceOnce(s, "description: { ru: 'Горячее ядро и силовые дуги', en: 'Hot core and power arcs' },", "description: { ru: 'Горячее ядро', en: 'Hot core' },", 'reactor description');
  s = replaceOnce(s, "description: { ru: 'Поздний фон с ярким пространственным разломом', en: 'Late-game background with a bright dimensional rift' },", "description: { ru: 'Пространственный разлом', en: 'Dimensional rift' },", 'abyss description');
  write(path, s);
}

// --- friendly faces ---
{
  const path = 'apps/mutants-merge/src/visuals.ts';
  let s = read(path);
  const eyeFnEnd = `function drawEyes(g: Phaser.GameObjects.Graphics, count: number, radius: number, pupil: number) {\n  const eyeY = -radius * 0.08;\n  for (let i = 0; i < count; i += 1) {\n    const eyeX = (i - (count - 1) / 2) * radius * 0.34;\n    g.fillStyle(0xffffff, 0.96);\n    g.fillEllipse(eyeX, eyeY, radius * 0.26, radius * 0.31);\n    g.fillStyle(pupil, 1);\n    g.fillCircle(eyeX + radius * 0.025, eyeY + radius * 0.015, Math.max(2, radius * 0.065));\n  }\n}\n`;
  const smileFn = `${eyeFnEnd}\nfunction drawSmile(g: Phaser.GameObjects.Graphics, radius: number, color: number) {\n  g.lineStyle(Math.max(2, radius * 0.055), color, 0.82);\n  g.beginPath();\n  g.arc(0, radius * 0.14, radius * 0.24, Math.PI * 0.15, Math.PI * 0.85, false);\n  g.strokePath();\n}\n`;
  s = replaceOnce(s, eyeFnEnd, smileFn, 'smile helper');
  s = replaceOnce(s, "drawEyes(g, tier >= 7 ? 3 : tier >= 3 ? 2 : 1, radius, dark);", "drawEyes(g, tier >= 7 ? 3 : tier >= 3 ? 2 : 1, radius, dark);\n    drawSmile(g, radius, dark);", 'biomass smile');
  s = replaceOnce(s, "drawEyes(g, tier >= 8 ? 3 : 2, radius, dark);", "drawEyes(g, tier >= 8 ? 3 : 2, radius, dark);\n    drawSmile(g, radius, 0xffffff);", 'predator smile');
  s = replaceOnce(s, "drawEyes(g, tier >= 6 ? 2 : 1, radius, dark);", "drawEyes(g, tier >= 6 ? 2 : 1, radius, dark);\n    drawSmile(g, radius, dark);", 'parasite smile');
  s = replaceOnce(s, "drawEyes(g, tier >= 7 ? 2 : 1, radius, 0x071018);", "drawEyes(g, tier >= 7 ? 2 : 1, radius, 0x071018);\n    drawSmile(g, radius, 0x64efff);", 'cyber smile');
  s = replaceOnce(s, "drawEyes(g, tier >= 6 ? 3 : 1, radius, 0x6f32d8);", "drawEyes(g, tier >= 6 ? 3 : 1, radius, 0x6f32d8);\n    drawSmile(g, radius, 0x6f32d8);", 'psi smile');
  s = replaceOnce(s, "drawEyes(g, tier >= 7 ? 4 : tier >= 3 ? 2 : 1, radius, 0xd26cff);", "drawEyes(g, tier >= 7 ? 4 : tier >= 3 ? 2 : 1, radius, 0xd26cff);\n    drawSmile(g, radius, 0xe9d6ff);", 'abyss smile');
  write(path, s);
}

// --- selected-removal rewarded UX ---
{
  const path = 'apps/mutants-merge/src/game.ts';
  let s = read(path);
  s = replaceOnce(s,
    "shop: 'Фоны', gameOver: 'Камера переполнена', restart: 'Ещё раз', remove: 'Убрать верхний',",
    "shop: 'Фоны', gameOver: 'Камера переполнена', restart: 'Ещё раз', remove: 'Убрать выбранный', removePrompt: 'Выбери форму для удаления',",
    'ru remove copy');
  s = replaceOnce(s,
    "shop: 'Backgrounds', gameOver: 'Chamber overflow', restart: 'Play again', remove: 'Remove top',",
    "shop: 'Backgrounds', gameOver: 'Chamber overflow', restart: 'Play again', remove: 'Remove selected', removePrompt: 'Choose a lifeform to remove',",
    'en remove copy');
  s = replaceOnce(s,
    "  private rewardBusy = false;\n  private collisionHandler?:",
    "  private rewardBusy = false;\n  private selectingRemoval = false;\n  private collisionHandler?:",
    'selection state');
  s = replaceOnce(s,
`    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {\n      if (this.ended || !this.canDrop || this.hasOverlay() || this.rewardBusy) return;\n      if (pointer.y < CHAMBER.top - 10) return;\n      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);\n      this.dropMutant(x, this.nextTier);\n      this.nextTier = this.rollNextTier();\n      this.updateNextPreview();\n      this.canDrop = false;\n      this.time.delayedCall(245, () => { this.canDrop = true; });\n    });`,
`    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {\n      if (this.ended || !this.canDrop || this.hasOverlay() || this.rewardBusy) return;\n      if (this.selectingRemoval) {\n        const target = this.findMutantAt(pointer.x, pointer.y);\n        if (!target) {\n          this.toast(copy().removePrompt);\n          return;\n        }\n        this.selectingRemoval = false;\n        void this.rewardRemoveSelected(target);\n        return;\n      }\n      if (pointer.y < CHAMBER.top - 10) return;\n      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);\n      this.dropMutant(x, this.nextTier);\n      this.nextTier = this.rollNextTier();\n      this.updateNextPreview();\n      this.canDrop = false;\n      this.time.delayedCall(245, () => { this.canDrop = true; });\n    });`,
    'pointer selection');
  s = replaceOnce(s,
`    removeButton.on('pointerdown', (_pointer, _x, _y, event) => {\n      event.stopPropagation();\n      void this.rewardRemoveTop();\n    });`,
`    removeButton.on('pointerdown', (_pointer, _x, _y, event) => {\n      event.stopPropagation();\n      this.beginRemoveSelection();\n    });`,
    'remove button');
  s = replaceOnce(s,
`  private async rewardRemoveTop() {\n    if (this.ended) return;\n    const target = this.getLiveMutants().sort((a, b) => a.y - b.y)[0];\n    if (!target) return;\n    await this.withRewardedAd(() => {\n      this.removeMutant(target);\n      this.overflowSince = null;\n      this.setDangerProgress(0);\n    }, 'reward_remove_top');\n  }`,
`  private beginRemoveSelection() {\n    if (this.ended || this.rewardBusy) return;\n    const mutants = this.getLiveMutants();\n    if (mutants.length === 0) return;\n    this.selectingRemoval = true;\n    this.toast(copy().removePrompt);\n    const skins = mutants.map((mutant) => mutant.getData('skin')).filter(Boolean) as Phaser.GameObjects.Graphics[];\n    if (skins.length) this.tweens.add({ targets: skins, alpha: 0.48, duration: 170, yoyo: true, repeat: 3 });\n  }\n\n  private findMutantAt(x: number, y: number) {\n    return this.getLiveMutants()\n      .map((mutant) => ({\n        mutant,\n        distance: Phaser.Math.Distance.Between(x, y, mutant.x, mutant.y),\n        radius: mutant.getData('radius') as number\n      }))\n      .filter((candidate) => candidate.distance <= candidate.radius * 1.18)\n      .sort((a, b) => a.distance - b.distance)[0]?.mutant;\n  }\n\n  private async rewardRemoveSelected(target: Phaser.GameObjects.Arc) {\n    if (this.ended || !target.active) return;\n    const tier = target.getData('tier') as number;\n    const mergeTier = Math.min(MAX_TIER, tier + 1);\n    const scoreGain = (mergeTier + 1) * (mergeTier + 1) * 10;\n    const dnaGain = 5 + mergeTier * 4;\n    await this.withRewardedAd(() => {\n      if (target.active) this.removeMutant(target);\n      this.score += scoreGain;\n      this.grantDna(dnaGain);\n      this.overflowSince = null;\n      this.setDangerProgress(0);\n      this.persist();\n      this.refreshHud();\n      this.toast(locale === 'ru' ? `+${scoreGain} очков · +${dnaGain} ДНК` : `+${scoreGain} score · +${dnaGain} DNA`);\n    }, 'reward_remove_selected');\n  }`,
    'selected removal flow');
  s = replaceOnce(s,
    "  private pauseForOverlay() {\n    this.canDrop = false;",
    "  private pauseForOverlay() {\n    this.selectingRemoval = false;\n    this.canDrop = false;",
    'overlay cancels selection');
  s = replaceOnce(s,
    "  private endRun() {\n    if (this.ended) return;\n    this.ended = true;",
    "  private endRun() {\n    if (this.ended) return;\n    this.selectingRemoval = false;\n    this.ended = true;",
    'end cancels selection');
  s = replaceOnce(s,
    "    this.rewardBusy = false;\n    this.canDrop = true;",
    "    this.rewardBusy = false;\n    this.selectingRemoval = false;\n    this.canDrop = true;",
    'reset selection');
  s = replaceOnce(s,
`          revivedThisRun: this.revivedThisRun,\n          score: this.score`,
`          revivedThisRun: this.revivedThisRun,\n          score: this.score,\n          selectingRemoval: this.selectingRemoval,\n          mutants: this.getLiveMutants().map((mutant) => ({ x: mutant.x, y: mutant.y, tier: mutant.getData('tier') as number }))`,
    'test hook selection state');
  write(path, s);
}

// --- browser regression for selected rewarded removal ---
{
  const path = 'scripts/browser-smoke.mjs';
  let s = read(path);
  const anchor = `if ((saveAfterPlay?.researchDna ?? 0) > 500) throw new Error('Early-run DNA progression is still much too fast');\n\nawait screenshot('mutants-smoke-play.png');`;
  const replacement = `if ((saveAfterPlay?.researchDna ?? 0) > 500) throw new Error('Early-run DNA progression is still much too fast');\n\n// Selected-removal rewarded: choose a concrete on-board mutant, then verify score + DNA reward.\nconst beforeSelectedRemoveState = await getTestState();\nconst beforeSelectedRemoveSave = await getSave();\nconst target = beforeSelectedRemoveState?.mutants?.[0];\nif (!target) throw new Error('No live mutant available for selected-removal regression');\nawait clickGame(145, 246);\nawait sleep(180);\nlet selectingState = await getTestState();\nif (!selectingState?.selectingRemoval) throw new Error('Remove selected did not enter selection mode');\nawait clickGame(target.x, target.y);\nawait sleep(300);\nawait screenshot('mutants-smoke-remove-selected-ad.png');\nawait sleep(1450);\nconst afterSelectedRemoveState = await getTestState();\nconst afterSelectedRemoveSave = await getSave();\nconst telemetryAfterSelectedRemove = await getTelemetry();\nif (afterSelectedRemoveState?.selectingRemoval || afterSelectedRemoveState?.rewardBusy) throw new Error('Selected-removal flow remained blocked');\nif ((telemetryAfterSelectedRemove?.reward_remove_selected_rewarded ?? 0) < 1) throw new Error('Selected-removal rewarded flow did not complete');\nif ((afterSelectedRemoveState?.score ?? 0) <= (beforeSelectedRemoveState?.score ?? 0)) throw new Error('Selected removal did not award merge-equivalent score');\nif ((afterSelectedRemoveSave?.dna ?? 0) <= (beforeSelectedRemoveSave?.dna ?? 0)) throw new Error('Selected removal did not award DNA');\n\nawait screenshot('mutants-smoke-play.png');`;
  s = replaceOnce(s, anchor, replacement, 'selected removal smoke');
  s = replaceOnce(s,
    "  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,",
    "  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,\n  rewardedRemoveSelected: telemetryAfterSelectedRemove.reward_remove_selected_rewarded ?? 0,",
    'smoke report selected remove');
  write(path, s);
}

console.log('Final product pass applied.');
