import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
function rep(s, from, to, label) {
  if (!s.includes(from)) throw new Error(`Missing patch anchor: ${label}`);
  return s.replace(from, to);
}

{
  const p = 'apps/mutants-merge/src/content.ts';
  let s = read(p);
  s = rep(s, "id: 'predator', unlockResearch: 1500,", "id: 'predator', unlockResearch: 1250,", 'predator threshold');
  s = rep(s, "description: { ru: 'Яркая сетка и циановые контуры', en: 'Bright grid and cyan conduits' },", "description: { ru: 'Контурная сетка', en: 'Contour grid' },", 'neon desc');
  s = rep(s, "description: { ru: 'Живые мембраны и кислотное свечение', en: 'Living membranes and acid glow' },", "description: { ru: 'Живые мембраны', en: 'Living membranes' },", 'bio desc');
  s = rep(s, "description: { ru: 'Горячее ядро и силовые дуги', en: 'Hot core and power arcs' },", "description: { ru: 'Горячее ядро', en: 'Hot core' },", 'reactor desc');
  s = rep(s, "description: { ru: 'Поздний фон с ярким пространственным разломом', en: 'Late-game background with a bright dimensional rift' },", "description: { ru: 'Пространственный разлом', en: 'Dimensional rift' },", 'abyss desc');
  write(p, s);
}

{
  const p = 'apps/mutants-merge/src/visuals.ts';
  let s = read(p);
  const eye = [
    "function drawEyes(g: Phaser.GameObjects.Graphics, count: number, radius: number, pupil: number) {",
    "  const eyeY = -radius * 0.08;",
    "  for (let i = 0; i < count; i += 1) {",
    "    const eyeX = (i - (count - 1) / 2) * radius * 0.34;",
    "    g.fillStyle(0xffffff, 0.96);",
    "    g.fillEllipse(eyeX, eyeY, radius * 0.26, radius * 0.31);",
    "    g.fillStyle(pupil, 1);",
    "    g.fillCircle(eyeX + radius * 0.025, eyeY + radius * 0.015, Math.max(2, radius * 0.065));",
    "  }",
    "}",
    ""
  ].join('\n');
  const smile = eye + [
    "function drawSmile(g: Phaser.GameObjects.Graphics, radius: number, color: number) {",
    "  g.lineStyle(Math.max(2, radius * 0.055), color, 0.82);",
    "  g.beginPath();",
    "  g.arc(0, radius * 0.14, radius * 0.24, Math.PI * 0.15, Math.PI * 0.85, false);",
    "  g.strokePath();",
    "}",
    ""
  ].join('\n');
  s = rep(s, eye, smile, 'smile helper');
  s = rep(s, "drawEyes(g, tier >= 7 ? 3 : tier >= 3 ? 2 : 1, radius, dark);", "drawEyes(g, tier >= 7 ? 3 : tier >= 3 ? 2 : 1, radius, dark);\n    drawSmile(g, radius, dark);", 'biomass smile');
  s = rep(s, "drawEyes(g, tier >= 8 ? 3 : 2, radius, dark);", "drawEyes(g, tier >= 8 ? 3 : 2, radius, dark);\n    drawSmile(g, radius, 0xffffff);", 'predator smile');
  s = rep(s, "drawEyes(g, tier >= 6 ? 2 : 1, radius, dark);", "drawEyes(g, tier >= 6 ? 2 : 1, radius, dark);\n    drawSmile(g, radius, dark);", 'parasite smile');
  s = rep(s, "drawEyes(g, tier >= 7 ? 2 : 1, radius, 0x071018);", "drawEyes(g, tier >= 7 ? 2 : 1, radius, 0x071018);\n    drawSmile(g, radius, 0x64efff);", 'cyber smile');
  s = rep(s, "drawEyes(g, tier >= 6 ? 3 : 1, radius, 0x6f32d8);", "drawEyes(g, tier >= 6 ? 3 : 1, radius, 0x6f32d8);\n    drawSmile(g, radius, 0x6f32d8);", 'psi smile');
  s = rep(s, "drawEyes(g, tier >= 7 ? 4 : tier >= 3 ? 2 : 1, radius, 0xd26cff);", "drawEyes(g, tier >= 7 ? 4 : tier >= 3 ? 2 : 1, radius, 0xd26cff);\n    drawSmile(g, radius, 0xe9d6ff);", 'abyss smile');
  write(p, s);
}

{
  const p = 'apps/mutants-merge/src/game.ts';
  let s = read(p);
  s = rep(s, "shop: 'Фоны', gameOver: 'Камера переполнена', restart: 'Ещё раз', remove: 'Убрать верхний',", "shop: 'Фоны', gameOver: 'Камера переполнена', restart: 'Ещё раз', remove: 'Убрать выбранный', removePrompt: 'Выбери форму для удаления',", 'ru remove');
  s = rep(s, "shop: 'Backgrounds', gameOver: 'Chamber overflow', restart: 'Play again', remove: 'Remove top',", "shop: 'Backgrounds', gameOver: 'Chamber overflow', restart: 'Play again', remove: 'Remove selected', removePrompt: 'Choose a lifeform to remove',", 'en remove');
  s = rep(s, "  private rewardBusy = false;\n  private collisionHandler?:", "  private rewardBusy = false;\n  private selectingRemoval = false;\n  private collisionHandler?:", 'selection state');

  const oldPointer = [
    "    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {",
    "      if (this.ended || !this.canDrop || this.hasOverlay() || this.rewardBusy) return;",
    "      if (pointer.y < CHAMBER.top - 10) return;",
    "      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);",
    "      this.dropMutant(x, this.nextTier);",
    "      this.nextTier = this.rollNextTier();",
    "      this.updateNextPreview();",
    "      this.canDrop = false;",
    "      this.time.delayedCall(245, () => { this.canDrop = true; });",
    "    });"
  ].join('\n');
  const newPointer = [
    "    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {",
    "      if (this.ended || !this.canDrop || this.hasOverlay() || this.rewardBusy) return;",
    "      if (this.selectingRemoval) {",
    "        const target = this.findMutantAt(pointer.x, pointer.y);",
    "        if (!target) { this.toast(copy().removePrompt); return; }",
    "        this.selectingRemoval = false;",
    "        void this.rewardRemoveSelected(target);",
    "        return;",
    "      }",
    "      if (pointer.y < CHAMBER.top - 10) return;",
    "      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);",
    "      this.dropMutant(x, this.nextTier);",
    "      this.nextTier = this.rollNextTier();",
    "      this.updateNextPreview();",
    "      this.canDrop = false;",
    "      this.time.delayedCall(245, () => { this.canDrop = true; });",
    "    });"
  ].join('\n');
  s = rep(s, oldPointer, newPointer, 'pointer select');

  s = rep(s,
    "    removeButton.on('pointerdown', (_pointer, _x, _y, event) => {\n      event.stopPropagation();\n      void this.rewardRemoveTop();\n    });",
    "    removeButton.on('pointerdown', (_pointer, _x, _y, event) => {\n      event.stopPropagation();\n      this.beginRemoveSelection();\n    });",
    'remove button');

  const oldRemove = [
    "  private async rewardRemoveTop() {",
    "    if (this.ended) return;",
    "    const target = this.getLiveMutants().sort((a, b) => a.y - b.y)[0];",
    "    if (!target) return;",
    "    await this.withRewardedAd(() => {",
    "      this.removeMutant(target);",
    "      this.overflowSince = null;",
    "      this.setDangerProgress(0);",
    "    }, 'reward_remove_top');",
    "  }"
  ].join('\n');
  const newRemove = [
    "  private beginRemoveSelection() {",
    "    if (this.ended || this.rewardBusy) return;",
    "    const mutants = this.getLiveMutants();",
    "    if (mutants.length === 0) return;",
    "    this.selectingRemoval = true;",
    "    this.toast(copy().removePrompt);",
    "    const skins = mutants.map((mutant) => mutant.getData('skin')).filter(Boolean) as Phaser.GameObjects.Graphics[];",
    "    if (skins.length) this.tweens.add({ targets: skins, alpha: 0.48, duration: 170, yoyo: true, repeat: 3 });",
    "  }",
    "",
    "  private findMutantAt(x: number, y: number) {",
    "    return this.getLiveMutants()",
    "      .map((mutant) => ({ mutant, distance: Phaser.Math.Distance.Between(x, y, mutant.x, mutant.y), radius: mutant.getData('radius') as number }))",
    "      .filter((candidate) => candidate.distance <= candidate.radius * 1.18)",
    "      .sort((a, b) => a.distance - b.distance)[0]?.mutant;",
    "  }",
    "",
    "  private async rewardRemoveSelected(target: Phaser.GameObjects.Arc) {",
    "    if (this.ended || !target.active) return;",
    "    const tier = target.getData('tier') as number;",
    "    const mergeTier = Math.min(MAX_TIER, tier + 1);",
    "    const scoreGain = (mergeTier + 1) * (mergeTier + 1) * 10;",
    "    const dnaGain = 5 + mergeTier * 4;",
    "    await this.withRewardedAd(() => {",
    "      if (target.active) this.removeMutant(target);",
    "      this.score += scoreGain;",
    "      this.grantDna(dnaGain);",
    "      this.overflowSince = null;",
    "      this.setDangerProgress(0);",
    "      this.persist();",
    "      this.refreshHud();",
    "      this.toast(locale === 'ru' ? '+' + scoreGain + ' очков · +' + dnaGain + ' ДНК' : '+' + scoreGain + ' score · +' + dnaGain + ' DNA');",
    "    }, 'reward_remove_selected');",
    "  }"
  ].join('\n');
  s = rep(s, oldRemove, newRemove, 'selected remove flow');
  s = rep(s, "  private pauseForOverlay() {\n    this.canDrop = false;", "  private pauseForOverlay() {\n    this.selectingRemoval = false;\n    this.canDrop = false;", 'overlay cancel');
  s = rep(s, "  private endRun() {\n    if (this.ended) return;\n    this.ended = true;", "  private endRun() {\n    if (this.ended) return;\n    this.selectingRemoval = false;\n    this.ended = true;", 'end cancel');
  s = rep(s, "    this.rewardBusy = false;\n    this.canDrop = true;", "    this.rewardBusy = false;\n    this.selectingRemoval = false;\n    this.canDrop = true;", 'reset selection');
  s = rep(s,
    "          revivedThisRun: this.revivedThisRun,\n          score: this.score",
    "          revivedThisRun: this.revivedThisRun,\n          score: this.score,\n          selectingRemoval: this.selectingRemoval,\n          mutants: this.getLiveMutants().map((mutant) => ({ x: mutant.x, y: mutant.y, tier: mutant.getData('tier') as number }))",
    'test state');
  write(p, s);
}

{
  const p = 'scripts/browser-smoke.mjs';
  let s = read(p);
  const a = "if ((saveAfterPlay?.researchDna ?? 0) > 500) throw new Error('Early-run DNA progression is still much too fast');\n\nawait screenshot('mutants-smoke-play.png');";
  const b = [
    "if ((saveAfterPlay?.researchDna ?? 0) > 500) throw new Error('Early-run DNA progression is still much too fast');",
    "",
    "// Selected-removal rewarded: select a concrete on-board mutant and verify merge-equivalent rewards.",
    "const beforeSelectedRemoveState = await getTestState();",
    "const beforeSelectedRemoveSave = await getSave();",
    "const target = beforeSelectedRemoveState?.mutants?.[0];",
    "if (!target) throw new Error('No live mutant available for selected-removal regression');",
    "await clickGame(145, 246);",
    "await sleep(180);",
    "const selectingState = await getTestState();",
    "if (!selectingState?.selectingRemoval) throw new Error('Remove selected did not enter selection mode');",
    "await clickGame(target.x, target.y);",
    "await sleep(300);",
    "await screenshot('mutants-smoke-remove-selected-ad.png');",
    "await sleep(1450);",
    "const afterSelectedRemoveState = await getTestState();",
    "const afterSelectedRemoveSave = await getSave();",
    "const telemetryAfterSelectedRemove = await getTelemetry();",
    "if (afterSelectedRemoveState?.selectingRemoval || afterSelectedRemoveState?.rewardBusy) throw new Error('Selected-removal flow remained blocked');",
    "if ((telemetryAfterSelectedRemove?.reward_remove_selected_rewarded ?? 0) < 1) throw new Error('Selected-removal rewarded flow did not complete');",
    "if ((afterSelectedRemoveState?.score ?? 0) <= (beforeSelectedRemoveState?.score ?? 0)) throw new Error('Selected removal did not award merge-equivalent score');",
    "if ((afterSelectedRemoveSave?.dna ?? 0) <= (beforeSelectedRemoveSave?.dna ?? 0)) throw new Error('Selected removal did not award DNA');",
    "",
    "await screenshot('mutants-smoke-play.png');"
  ].join('\n');
  s = rep(s, a, b, 'remove selected smoke');
  s = rep(s, "  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,", "  rewardedUpgrade: telemetry.reward_upgrade_next_rewarded ?? 0,\n  rewardedRemoveSelected: telemetryAfterSelectedRemove.reward_remove_selected_rewarded ?? 0,", 'report');
  write(p, s);
}

console.log('Final product pass v2 applied');
