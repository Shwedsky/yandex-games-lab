import Phaser from 'phaser';
import { detectLocale, loadLocalSave, saveLocal } from '@yg-lab/shared-core';
import { yandexBridge } from '@yg-lab/yandex-bridge';
import {
  BACKGROUNDS,
  GENOMES,
  backgroundById,
  genomeById,
  type BackgroundId,
  type GenomeId,
  type Locale
} from './content';
import { renderBackground } from './backgrounds';
import { createGenomeCreature } from './visuals';

const WIDTH = 540;
const HEIGHT = 960;
const CHAMBER = { left: 38, right: 502, top: 274, bottom: 914 };
const OVERFLOW_Y = 390;
const OVERFLOW_GRACE_MS = 1700;
const MAX_TIER = 10;
const TOTAL_FORMS = GENOMES.length * (MAX_TIER + 1);
const LEGACY_SAVE_KEY = 'yg-lab:mutants:v1';
const SAVE_KEY = 'yg-lab:mutants:v2';
const TELEMETRY_KEY = 'yg-lab:mutants:telemetry:v1';
const RADII = [24, 29, 35, 41, 48, 56, 65, 75, 86, 99, 114];

let locale: Locale = 'en';

const copy = () => locale === 'ru'
  ? {
      title: 'Мутанты: Геномный синтез', hint: 'Нажми в камере, чтобы сбросить форму', score: 'Счёт', best: 'Рекорд',
      dna: 'ДНК', research: 'Исследование', allGenomes: 'Все геномы открыты', genomes: 'Геномы',
      shop: 'Фоны', gameOver: 'Камера переполнена', restart: 'Ещё раз', remove: 'Убрать выбранный', removePrompt: 'Выбери форму для удаления',
      upgrade: 'Улучшить след.', adUnavailable: 'Реклама недоступна', final: 'Финальная форма открыта!',
      newForm: 'Новая форма', close: 'Закрыть', revive: 'Спасти забег', doubled: 'ДНК x2',
      runReward: 'Награда', revived: 'Камера стабилизирована!', danger: 'КРИТИЧЕСКИЙ УРОВЕНЬ',
      next: 'Следующий', genomeLab: 'Геномная лаборатория', selected: 'Выбран', active: 'Активен',
      locked: 'Откроется при', nextRun: 'Будет активен со следующего забега', insufficient: 'Недостаточно ДНК',
      buy: 'Купить', equip: 'Выбрать', equipped: 'Установлен', owned: 'Куплен', backgroundShop: 'Магазин фонов',
      backgroundBought: 'Фон куплен', genomeUnlocked: 'Открыт геном', collection: 'Коллекция'
    }
  : {
      title: 'Mutants: Genome Merge', hint: 'Tap inside the chamber to drop a lifeform', score: 'Score', best: 'Best',
      dna: 'DNA', research: 'Research', allGenomes: 'All genomes unlocked', genomes: 'Genomes',
      shop: 'Backgrounds', gameOver: 'Chamber overflow', restart: 'Play again', remove: 'Remove selected', removePrompt: 'Choose a lifeform to remove',
      upgrade: 'Upgrade next', adUnavailable: 'Ad unavailable', final: 'Final form unlocked!',
      newForm: 'New form', close: 'Close', revive: 'Save run', doubled: 'DNA x2', runReward: 'Reward',
      revived: 'Chamber stabilized!', danger: 'CRITICAL LEVEL', next: 'Next', genomeLab: 'Genome Lab',
      selected: 'Selected', active: 'Active', locked: 'Unlocks at', nextRun: 'Active from the next run',
      insufficient: 'Not enough DNA', buy: 'Buy', equip: 'Equip', equipped: 'Equipped', owned: 'Owned',
      backgroundShop: 'Background shop', backgroundBought: 'Background purchased', genomeUnlocked: 'Genome unlocked',
      collection: 'Collection'
    };

type SaveState = {
  bestScore: number;
  dna: number;
  researchDna: number;
  genomeDiscoveries: Partial<Record<GenomeId, number[]>>;
  unlockedGenomes: GenomeId[];
  selectedGenome: GenomeId;
  ownedBackgrounds: BackgroundId[];
  selectedBackground: BackgroundId;
};

type LegacySave = Partial<SaveState> & { coins?: number; discovered?: number[] };
type Telemetry = Record<string, number>;

const defaultSave = (): SaveState => ({
  bestScore: 0,
  dna: 0,
  researchDna: 0,
  genomeDiscoveries: { biomass: [0] },
  unlockedGenomes: ['biomass'],
  selectedGenome: 'biomass',
  ownedBackgrounds: ['void'],
  selectedBackground: 'void'
});

function normalizeSave(raw: LegacySave | undefined): SaveState {
  const base = defaultSave();
  if (!raw) return base;
  const legacyDna = Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins ?? 0)) : 0;
  const dna = Number.isFinite(raw.dna) ? Math.max(0, Math.floor(raw.dna ?? 0)) : legacyDna;
  const researchDna = Number.isFinite(raw.researchDna)
    ? Math.max(0, Math.floor(raw.researchDna ?? 0))
    : dna;
  const discoveries = { ...(raw.genomeDiscoveries ?? {}) } as Partial<Record<GenomeId, number[]>>;
  if (!discoveries.biomass) discoveries.biomass = Array.isArray(raw.discovered) ? raw.discovered : [0];
  for (const genome of GENOMES) {
    const list = discoveries[genome.id];
    discoveries[genome.id] = Array.from(new Set(Array.isArray(list) ? list.filter((tier) => tier >= 0 && tier <= MAX_TIER) : [0])).sort((a, b) => a - b);
    if ((discoveries[genome.id]?.length ?? 0) === 0) discoveries[genome.id] = [0];
  }
  const validGenomeIds = new Set(GENOMES.map((item) => item.id));
  const unlocked = Array.from(new Set((raw.unlockedGenomes ?? ['biomass']).filter((id) => validGenomeIds.has(id))));
  if (!unlocked.includes('biomass')) unlocked.unshift('biomass');
  for (const genome of GENOMES) if (researchDna >= genome.unlockResearch && !unlocked.includes(genome.id)) unlocked.push(genome.id);
  for (const genome of GENOMES) {
    if (!unlocked.includes(genome.id)) discoveries[genome.id] = [];
    else if ((discoveries[genome.id]?.length ?? 0) === 0) discoveries[genome.id] = [0];
  }
  const selectedGenome = validGenomeIds.has(raw.selectedGenome as GenomeId) && unlocked.includes(raw.selectedGenome as GenomeId)
    ? (raw.selectedGenome as GenomeId)
    : 'biomass';
  const validBackgroundIds = new Set(BACKGROUNDS.map((item) => item.id));
  const ownedBackgrounds = Array.from(new Set((raw.ownedBackgrounds ?? ['void']).filter((id) => validBackgroundIds.has(id))));
  if (!ownedBackgrounds.includes('void')) ownedBackgrounds.unshift('void');
  const selectedBackground = validBackgroundIds.has(raw.selectedBackground as BackgroundId) && ownedBackgrounds.includes(raw.selectedBackground as BackgroundId)
    ? (raw.selectedBackground as BackgroundId)
    : 'void';
  return {
    bestScore: Math.max(0, Math.floor(raw.bestScore ?? 0)),
    dna,
    researchDna,
    genomeDiscoveries: discoveries,
    unlockedGenomes: unlocked,
    selectedGenome,
    ownedBackgrounds,
    selectedBackground
  };
}

function track(event: string, value = 1) {
  try {
    const current = loadLocalSave<Telemetry>(TELEMETRY_KEY, {});
    current[event] = (current[event] ?? 0) + value;
    saveLocal(TELEMETRY_KEY, current);
  } catch {
    // Telemetry must never block gameplay.
  }
  console.info(`[mutants] ${event}`, value);
}

class MergeScene extends Phaser.Scene {
  private score = 0;
  private save!: SaveState;
  private activeGenome = GENOMES[0];
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private dnaText!: Phaser.GameObjects.Text;
  private genomeText!: Phaser.GameObjects.Text;
  private researchText!: Phaser.GameObjects.Text;
  private collectionText!: Phaser.GameObjects.Text;
  private shopText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Arc;
  private dangerFill!: Phaser.GameObjects.Rectangle;
  private dangerText!: Phaser.GameObjects.Text;
  private backgroundLayer!: Phaser.GameObjects.Container;
  private nextTier = 0;
  private canDrop = true;
  private ended = false;
  private overflowSince: number | null = null;
  private mergingBodies = new Set<number>();
  private rewardBusy = false;
  private selectingRemoval = false;
  private collisionHandler?: (event: any) => void;
  private visibilityHandler?: () => void;
  private revivedThisRun = false;
  private endRewardSettled = false;
  private endOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private labOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private shopOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private runStartedAt = performance.now();
  private mergeCount = 0;
  private dropCount = 0;

  async create() {
    const currentRaw = loadLocalSave<LegacySave>(SAVE_KEY, {});
    if (Object.keys(currentRaw).length === 0) {
      const legacy = loadLocalSave<LegacySave>(LEGACY_SAVE_KEY, {});
      if (Number.isFinite(legacy.bestScore)) currentRaw.bestScore = legacy.bestScore;
    }
    this.save = normalizeSave(currentRaw);
    this.refreshUnlocks(false);
    this.activeGenome = genomeById(this.save.selectedGenome);
    this.persist();
    this.runStartedAt = performance.now();
    track('session_start');
    this.installLocalTestHooks();

    this.backgroundLayer = this.add.container(0, 0).setDepth(-20);
    this.applyBackground(this.save.selectedBackground);
    this.drawShell();
    this.createHud();
    this.nextTier = this.rollNextTier();
    this.updateNextPreview();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.ended || !this.canDrop || this.hasOverlay() || this.rewardBusy) return;
      if (this.selectingRemoval) {
        const target = this.findMutantAt(pointer.x, pointer.y);
        if (!target) { this.toast(copy().removePrompt); return; }
        this.selectingRemoval = false;
        void this.rewardRemoveSelected(target);
        return;
      }
      if (pointer.y < CHAMBER.top - 10) return;
      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);
      this.dropMutant(x, this.nextTier);
      this.nextTier = this.rollNextTier();
      this.updateNextPreview();
      this.canDrop = false;
      this.time.delayedCall(245, () => { this.canDrop = true; });
    });

    this.collisionHandler = (event: any) => {
      for (const pair of event.pairs ?? []) this.tryMergePair(pair.bodyA, pair.bodyB);
    };
    this.matter.world.on('collisionstart', this.collisionHandler);

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.matter.world.pause();
        yandexBridge.gameplayStop();
      } else if (!this.ended && !this.rewardBusy && !this.hasOverlay()) {
        this.matter.world.resume();
        yandexBridge.gameplayStart();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.collisionHandler) this.matter.world.off('collisionstart', this.collisionHandler);
      if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
      if ((globalThis as any).__MUTANTS_TEST__) delete (globalThis as any).__MUTANTS_TEST__;
      yandexBridge.gameplayStop();
    });

    await yandexBridge.gameplayReady();
    yandexBridge.gameplayStart();
  }

  update(time: number) {
    this.syncVisuals();
    if (this.ended || this.hasOverlay() || this.rewardBusy) {
      this.setDangerProgress(0);
      return;
    }

    const highBody = this.getLiveMutants().some((go) => {
      const body = go.body as any;
      if (!body || body.isStatic) return false;
      return go.y - (go.getData('radius') as number) < OVERFLOW_Y && Math.abs(body.velocity?.y ?? 0) < 0.55;
    });

    if (highBody) {
      this.overflowSince ??= time;
      const progress = Phaser.Math.Clamp((time - this.overflowSince) / OVERFLOW_GRACE_MS, 0, 1);
      this.setDangerProgress(progress);
      if (progress >= 1) this.endRun();
    } else {
      this.overflowSince = null;
      this.setDangerProgress(0);
    }
  }

  private hasOverlay() {
    return this.labOverlayObjects.length > 0 || this.shopOverlayObjects.length > 0;
  }

  private applyBackground(id: BackgroundId) {
    if (!this.backgroundLayer) return;
    renderBackground(this, this.backgroundLayer, backgroundById(id));
  }

  private drawShell() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 86, 484, 700, 0x101824, 0.28).setStrokeStyle(4, 0x42536c);
    this.add.rectangle(WIDTH / 2, CHAMBER.bottom + 18, 470, 24, 0x29384d, 0.92);
    this.add.rectangle(CHAMBER.left - 10, 580, 20, 690, 0x29384d, 0.92);
    this.add.rectangle(CHAMBER.right + 10, 580, 20, 690, 0x29384d, 0.92);

    this.add.rectangle(WIDTH / 2, OVERFLOW_Y, 440, 2, 0xff647c, 0.5).setDepth(3);
    this.add.rectangle(50, OVERFLOW_Y - 15, 440, 7, 0x351a24, 0.85).setOrigin(0, 0.5).setDepth(4);
    this.dangerFill = this.add.rectangle(50, OVERFLOW_Y - 15, 1, 7, 0xff5472, 1).setOrigin(0, 0.5).setDepth(5).setVisible(false);
    this.dangerText = this.add.text(WIDTH / 2, OVERFLOW_Y + 9, copy().danger, {
      fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ff718a'
    }).setOrigin(0.5, 0).setDepth(5).setVisible(false);

    this.matter.add.rectangle(WIDTH / 2, CHAMBER.bottom + 2, CHAMBER.right - CHAMBER.left, 20, { isStatic: true });
    this.matter.add.rectangle(CHAMBER.left - 3, 580, 18, CHAMBER.bottom - CHAMBER.top + 20, { isStatic: true });
    this.matter.add.rectangle(CHAMBER.right + 3, 580, 18, CHAMBER.bottom - CHAMBER.top + 20, { isStatic: true });
  }

  private createHud() {
    const t = copy();
    this.add.text(WIDTH / 2, 38, t.title, {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffffff'
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, 82, t.hint, {
      fontFamily: 'Arial', fontSize: '17px', color: '#9db0c9'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(26, 116, '', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff' });
    this.bestText = this.add.text(26, 145, '', { fontFamily: 'Arial', fontSize: '17px', color: '#9db0c9' });
    this.dnaText = this.add.text(26, 172, '', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#8fffa0' });

    this.genomeText = this.add.text(270, 120, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5, 0);
    this.researchText = this.add.text(270, 148, '', {
      fontFamily: 'Arial', fontSize: '14px', color: '#a8bad1'
    }).setOrigin(0.5, 0);

    this.add.text(WIDTH - 58, 112, t.next, {
      fontFamily: 'Arial', fontSize: '14px', color: '#9db0c9'
    }).setOrigin(0.5, 0);
    this.nextPreview = this.add.circle(WIDTH - 58, 159, 18, this.activeGenome.colors[0]).setStrokeStyle(2, 0xffffff, 0.65);

    this.collectionText = this.add.text(365, 203, '', {
      fontFamily: 'Arial', fontSize: '15px', color: '#d9e6f5', backgroundColor: '#1e2b3f', padding: { x: 9, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.collectionText.on('pointerdown', (_p, _x, _y, event) => {
      event.stopPropagation();
      this.openGenomeLab(this.activeGenome.id);
    });

    this.shopText = this.add.text(477, 203, `✦ ${t.shop}`, {
      fontFamily: 'Arial', fontSize: '15px', color: '#f4e04d', backgroundColor: '#2e2839', padding: { x: 9, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.shopText.on('pointerdown', (_p, _x, _y, event) => {
      event.stopPropagation();
      this.openShop();
    });

    const removeButton = this.createActionButton(145, 246, t.remove);
    removeButton.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
      this.beginRemoveSelection();
    });
    const upgradeButton = this.createActionButton(395, 246, t.upgrade);
    upgradeButton.on('pointerdown', (_pointer, _x, _y, event) => {
      event.stopPropagation();
      void this.rewardUpgradeNext();
    });

    this.refreshHud();
  }

  private createActionButton(x: number, y: number, label: string) {
    return this.add.text(x, y, `▶ ${label}`, {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', backgroundColor: '#25344b', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
  }

  private setDangerProgress(progress: number) {
    if (progress <= 0) {
      this.dangerFill?.setVisible(false);
      this.dangerText?.setVisible(false);
      return;
    }
    this.dangerFill?.setVisible(true).setSize(Math.max(2, 440 * progress), 7);
    this.dangerText?.setVisible(true).setAlpha(0.55 + progress * 0.45);
  }

  private showMockAdOverlay() {
    if (!yandexBridge.isMockMode()) return () => {};
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x03050a, 0.82).setDepth(115).setInteractive();
    const label = this.add.text(WIDTH / 2, HEIGHT / 2 - 24, locale === 'ru' ? 'ТЕСТОВАЯ РЕКЛАМА' : 'TEST AD', {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(116);
    const note = this.add.text(WIDTH / 2, HEIGHT / 2 + 24, locale === 'ru' ? 'Имитация rewarded · 1,4 сек' : 'Rewarded simulation · 1.4 sec', {
      fontFamily: 'Arial', fontSize: '18px', color: '#9fdcff'
    }).setOrigin(0.5).setDepth(116);
    return () => { shade.destroy(); label.destroy(); note.destroy(); };
  }

  private async withRewardedAd(reward: () => void, eventName: string) {
    if (this.rewardBusy) return false;
    this.rewardBusy = true;
    this.canDrop = false;
    this.matter.world.pause();
    yandexBridge.gameplayStop();
    track(`${eventName}_offer`);
    const closeMockOverlay = this.showMockAdOverlay();
    let granted = false;
    try {
      granted = await yandexBridge.showRewardedAndWait(12000);
      if (granted) {
        reward();
        track(`${eventName}_rewarded`);
      } else {
        this.toast(copy().adUnavailable);
        track(`${eventName}_failed`);
      }
      return granted;
    } catch (error) {
      console.warn('[mutants] rewarded flow failed', error);
      this.toast(copy().adUnavailable);
      track(`${eventName}_failed`);
      return false;
    } finally {
      closeMockOverlay();
      this.rewardBusy = false;
      this.canDrop = !this.ended;
      if (!this.ended && !this.hasOverlay() && !document.hidden) {
        this.matter.world.resume();
        yandexBridge.gameplayStart();
      }
    }
  }

  private beginRemoveSelection() {
    if (this.ended || this.rewardBusy) return;
    const mutants = this.getLiveMutants();
    if (mutants.length === 0) return;
    this.selectingRemoval = true;
    this.toast(copy().removePrompt);
    const skins = mutants.map((mutant) => mutant.getData('skin')).filter(Boolean) as Phaser.GameObjects.Graphics[];
    if (skins.length) this.tweens.add({ targets: skins, alpha: 0.48, duration: 170, yoyo: true, repeat: 3 });
  }

  private findMutantAt(x: number, y: number) {
    return this.getLiveMutants()
      .map((mutant) => ({ mutant, distance: Phaser.Math.Distance.Between(x, y, mutant.x, mutant.y), radius: mutant.getData('radius') as number }))
      .filter((candidate) => candidate.distance <= candidate.radius * 1.18)
      .sort((a, b) => a.distance - b.distance)[0]?.mutant;
  }

  private async rewardRemoveSelected(target: Phaser.GameObjects.Arc) {
    if (this.ended || !target.active) return;
    const tier = target.getData('tier') as number;
    const mergeTier = Math.min(MAX_TIER, tier + 1);
    const scoreGain = (mergeTier + 1) * (mergeTier + 1) * 10;
    const dnaGain = 5 + mergeTier * 4;
    await this.withRewardedAd(() => {
      if (target.active) this.removeMutant(target);
      this.score += scoreGain;
      this.grantDna(dnaGain);
      this.overflowSince = null;
      this.setDangerProgress(0);
      this.persist();
      this.refreshHud();
      this.toast(locale === 'ru' ? '+' + scoreGain + ' очков · +' + dnaGain + ' ДНК' : '+' + scoreGain + ' score · +' + dnaGain + ' DNA');
    }, 'reward_remove_selected');
  }

  private async rewardUpgradeNext() {
    if (this.ended || this.nextTier >= 2) return;
    await this.withRewardedAd(() => {
      this.nextTier = Math.min(2, this.nextTier + 1);
      this.updateNextPreview();
    }, 'reward_upgrade_next');
  }

  private dropMutant(x: number, tier: number) {
    this.spawnMutant(x, CHAMBER.top + 18, tier, true);
    this.dropCount += 1;
    track('drop');
  }

  private spawnMutant(x: number, y: number, tier: number, withDropImpulse = false) {
    const radius = RADII[tier];
    const color = this.activeGenome.colors[tier];
    const circle = this.add.circle(x, y, radius, color, 0.02).setStrokeStyle(0);
    circle.setData('mutant', true);
    circle.setData('tier', tier);
    circle.setData('radius', radius);
    this.matter.add.gameObject(circle, {
      shape: { type: 'circle', radius }, restitution: 0.14, friction: 0.09, frictionAir: 0.014, density: 0.0028
    });
    const body = circle.body as any;
    body.label = `mutant-${this.activeGenome.id}-${tier}`;
    if (withDropImpulse) circle.setRotation(Phaser.Math.FloatBetween(-0.18, 0.18));
    const skin = this.createCreatureGraphic(tier, radius);
    skin.setPosition(x, y).setDepth(2);
    circle.setData('skin', skin);
    return circle;
  }

  private createCreatureGraphic(tier: number, radius: number) {
    return createGenomeCreature(this, this.activeGenome.id, tier, radius, this.activeGenome.colors[tier]);
  }

  private syncVisuals() {
    for (const mutant of this.getLiveMutants()) {
      const skin = mutant.getData('skin') as Phaser.GameObjects.Graphics | undefined;
      if (!skin?.active) continue;
      skin.setPosition(mutant.x, mutant.y);
      skin.setRotation(mutant.rotation);
    }
  }

  private tryMergePair(bodyA: any, bodyB: any) {
    const a = bodyA?.gameObject as Phaser.GameObjects.Arc | undefined;
    const b = bodyB?.gameObject as Phaser.GameObjects.Arc | undefined;
    if (!a?.active || !b?.active || !a.getData('mutant') || !b.getData('mutant')) return;
    const tierA = a.getData('tier') as number;
    const tierB = b.getData('tier') as number;
    if (tierA !== tierB || tierA >= MAX_TIER) return;
    if (this.mergingBodies.has(bodyA.id) || this.mergingBodies.has(bodyB.id)) return;
    this.mergingBodies.add(bodyA.id);
    this.mergingBodies.add(bodyB.id);
    const nextTier = tierA + 1;
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    this.removeMutant(a);
    this.removeMutant(b);

    this.time.delayedCall(0, () => {
      const merged = this.spawnMutant(x, y, nextTier);
      const mergedBody = merged.body as any;
      if (mergedBody) {
        mergedBody.velocity.x = Phaser.Math.FloatBetween(-0.32, 0.32);
        mergedBody.velocity.y = -1.65;
      }
      const gained = (nextTier + 1) * (nextTier + 1) * 10;
      this.score += gained;
      this.mergeCount += 1;
      track(`merge_tier_${nextTier}`);
      track('score_from_merges', gained);

      const discovered = this.discoveryList(this.activeGenome.id);
      if (!discovered.includes(nextTier)) {
        discovered.push(nextTier);
        discovered.sort((u, v) => u - v);
        this.grantDna(5 + nextTier * 4);
        track(`discover_${this.activeGenome.id}_tier_${nextTier}`);
        const name = this.activeGenome.forms[locale][nextTier];
        this.toast(nextTier === MAX_TIER ? copy().final : `${copy().newForm}: ${name}`);
      }
      this.persist();
      this.refreshHud();
      this.mergeBurst(x, y, nextTier);
      const skin = merged.getData('skin') as Phaser.GameObjects.Graphics | undefined;
      if (skin) this.tweens.add({ targets: skin, scaleX: 1.2, scaleY: 1.2, duration: 105, yoyo: true, ease: 'Quad.easeOut' });
      if (nextTier >= 5) this.cameras.main.shake(65, 0.0022 + nextTier * 0.00015);
      if (nextTier >= 3 && navigator.vibrate) navigator.vibrate(12);
      this.mergingBodies.delete(bodyA.id);
      this.mergingBodies.delete(bodyB.id);
    });
  }

  private mergeBurst(x: number, y: number, tier: number) {
    const count = Math.min(10, 4 + tier);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.15, 0.15);
      const dot = this.add.circle(x, y, Math.max(2, 3 + tier * 0.2), this.activeGenome.colors[tier], 0.8).setDepth(8);
      const distance = 24 + tier * 4 + Phaser.Math.Between(0, 18);
      this.tweens.add({
        targets: dot, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance,
        alpha: 0, scale: 0.3, duration: 230 + tier * 12, ease: 'Quad.easeOut', onComplete: () => dot.destroy()
      });
    }
  }

  private removeMutant(go: Phaser.GameObjects.Arc) {
    const skin = go.getData('skin') as Phaser.GameObjects.Graphics | undefined;
    skin?.destroy();
    go.destroy();
  }

  private getLiveMutants(): Phaser.GameObjects.Arc[] {
    return this.children.list.filter((child): child is Phaser.GameObjects.Arc =>
      child instanceof Phaser.GameObjects.Arc && child.active && child.getData('mutant') === true
    );
  }

  private rollNextTier() {
    const r = Math.random();
    if (this.score > 2400 && r < 0.1) return 2;
    if (this.score > 600 && r < 0.27) return 1;
    return 0;
  }

  private updateNextPreview() {
    if (!this.nextPreview) return;
    this.nextPreview.setFillStyle(this.activeGenome.colors[this.nextTier]);
    const scale = Phaser.Math.Clamp(RADII[this.nextTier] / 26, 0.8, 1.35);
    this.nextPreview.setScale(scale);
  }

  private discoveryList(id: GenomeId) {
    this.save.genomeDiscoveries[id] ??= this.save.unlockedGenomes.includes(id) ? [0] : [];
    return this.save.genomeDiscoveries[id]!;
  }

  private totalDiscoveries() {
    return GENOMES.reduce((sum, genome) => sum + (this.save.genomeDiscoveries[genome.id]?.length ?? 0), 0);
  }

  private grantDna(amount: number) {
    const safe = Math.max(0, Math.floor(amount));
    if (safe <= 0) return;
    this.save.dna += safe;
    this.save.researchDna += safe;
    this.refreshUnlocks(true);
  }

  private refreshUnlocks(announce: boolean) {
    for (const genome of GENOMES) {
      if (this.save.researchDna >= genome.unlockResearch && !this.save.unlockedGenomes.includes(genome.id)) {
        this.save.unlockedGenomes.push(genome.id);
        if ((this.save.genomeDiscoveries[genome.id]?.length ?? 0) === 0) this.save.genomeDiscoveries[genome.id] = [0];
        track(`genome_unlocked_${genome.id}`);
        if (announce && this.scene.isActive()) this.toast(`${copy().genomeUnlocked}: ${genome.name[locale]}`);
      }
    }
  }

  private researchLabel() {
    const t = copy();
    const next = GENOMES.find((genome) => !this.save.unlockedGenomes.includes(genome.id));
    if (!next) return t.allGenomes;
    return `${t.research}: ${this.save.researchDna}/${next.unlockResearch} ${t.dna}`;
  }

  private refreshHud() {
    const t = copy();
    this.scoreText?.setText(`${t.score}: ${this.score}`);
    this.bestText?.setText(`${t.best}: ${Math.max(this.score, this.save.bestScore)}`);
    this.dnaText?.setText(`${t.dna}: ${this.save.dna}`);
    this.genomeText?.setText(this.activeGenome.name[locale]);
    this.researchText?.setText(this.researchLabel());
    this.collectionText?.setText(`${t.genomes} ${this.totalDiscoveries()}/${TOTAL_FORMS}`);
  }

  private toast(message: string) {
    const text = this.add.text(WIDTH / 2, 420, message, {
      fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', backgroundColor: '#26344d', padding: { x: 16, y: 9 },
      align: 'center', wordWrap: { width: 430 }
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: text, alpha: 1, y: 395, duration: 160, hold: 850, yoyo: true, onComplete: () => text.destroy() });
  }

  private pauseForOverlay() {
    this.selectingRemoval = false;
    this.canDrop = false;
    this.matter.world.pause();
    yandexBridge.gameplayStop();
  }

  private closeLab() {
    for (const object of this.labOverlayObjects) object.destroy();
    this.labOverlayObjects = [];
    this.resumeFromOverlay();
  }

  private closeShop() {
    for (const object of this.shopOverlayObjects) object.destroy();
    this.shopOverlayObjects = [];
    this.resumeFromOverlay();
  }

  private resumeFromOverlay() {
    if (!this.ended && !this.rewardBusy && !this.hasOverlay() && !document.hidden) {
      this.matter.world.resume();
      yandexBridge.gameplayStart();
      this.canDrop = true;
    }
  }

  private openGenomeLab(focus: GenomeId) {
    for (const object of this.labOverlayObjects) object.destroy();
    this.labOverlayObjects = [];
    this.pauseForOverlay();
    track('genome_lab_open');
    const t = copy();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07101a, 0.97).setDepth(40).setInteractive();
    this.labOverlayObjects.push(overlay);
    const title = this.add.text(WIDTH / 2, 38, `${t.genomeLab} · ${this.totalDiscoveries()}/${TOTAL_FORMS}`, {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(41);
    this.labOverlayObjects.push(title);

    GENOMES.forEach((genome, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 95 + col * 175;
      const y = 112 + row * 82;
      const unlocked = this.save.unlockedGenomes.includes(genome.id);
      const selected = this.save.selectedGenome === genome.id;
      const focused = focus === genome.id;
      const card = this.add.rectangle(x, y, 158, 66, focused ? 0x263b54 : 0x142131, 1)
        .setStrokeStyle(2, focused ? genome.colors[4] : 0x40536c, focused ? 0.9 : 0.45).setDepth(41).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y - 13, unlocked ? genome.name[locale] : '???', {
        fontFamily: 'Arial Black, Arial', fontSize: '14px', color: unlocked ? '#ffffff' : '#6c7c90', align: 'center', wordWrap: { width: 145 }
      }).setOrigin(0.5).setDepth(42);
      const sub = this.add.text(x, y + 14, unlocked
        ? `${this.discoveryList(genome.id).length}/11${selected ? ` · ${t.selected}` : ''}`
        : `${t.locked} ${genome.unlockResearch} ${t.dna}`, {
        fontFamily: 'Arial', fontSize: '11px', color: unlocked ? '#9fc0dd' : '#6c7c90', align: 'center'
      }).setOrigin(0.5).setDepth(42);
      this.labOverlayObjects.push(card, label, sub);
      card.on('pointerdown', (_p, _x, _y, event) => {
        event.stopPropagation();
        if (!unlocked) {
          this.toast(`${t.locked} ${genome.unlockResearch} ${t.dna}`);
          this.openGenomeLab(genome.id);
          return;
        }
        this.save.selectedGenome = genome.id;
        this.persist();
        if (this.getLiveMutants().length === 0 && this.score === 0) {
          this.activeGenome = genome;
          this.updateNextPreview();
          this.refreshHud();
        } else if (genome.id !== this.activeGenome.id) {
          this.toast(t.nextRun);
        }
        this.openGenomeLab(genome.id);
      });
    });

    const viewed = genomeById(focus);
    const viewedUnlocked = this.save.unlockedGenomes.includes(viewed.id);
    const viewedDiscoveries = this.discoveryList(viewed.id);
    const heading = this.add.text(WIDTH / 2, 242, viewedUnlocked ? `${viewed.name[locale]} · ${viewedDiscoveries.length}/11` : `${viewed.name[locale]} · 🔒`, {
      fontFamily: 'Arial Black, Arial', fontSize: '22px', color: viewedUnlocked ? '#ffffff' : '#7c8999'
    }).setOrigin(0.5).setDepth(42);
    this.labOverlayObjects.push(heading);

    for (let tier = 0; tier <= MAX_TIER; tier += 1) {
      const col = tier % 3;
      const row = Math.floor(tier / 3);
      const x = 105 + col * 165;
      const y = 335 + row * 132;
      const unlocked = viewedUnlocked && viewedDiscoveries.includes(tier);
      const card = this.add.rectangle(x, y, 140, 108, unlocked ? 0x162437 : 0x0e1621, 1)
        .setStrokeStyle(2, unlocked ? viewed.colors[tier] : 0x344153, unlocked ? 0.65 : 0.35).setDepth(41);
      this.labOverlayObjects.push(card);
      if (unlocked) {
        const oldGenome = this.activeGenome;
        this.activeGenome = viewed;
        const preview = this.createCreatureGraphic(tier, Math.min(34, RADII[tier] * 0.46));
        this.activeGenome = oldGenome;
        preview.setPosition(x, y - 18).setDepth(42);
        this.labOverlayObjects.push(preview);
      } else {
        const unknown = this.add.text(x, y - 18, '?', { fontFamily: 'Arial Black, Arial', fontSize: '37px', color: '#435267' }).setOrigin(0.5).setDepth(42);
        this.labOverlayObjects.push(unknown);
      }
      const name = this.add.text(x, y + 30, unlocked ? viewed.forms[locale][tier] : '???', {
        fontFamily: 'Arial', fontSize: '13px', color: unlocked ? '#ffffff' : '#596a80', align: 'center', wordWrap: { width: 125 }
      }).setOrigin(0.5).setDepth(42);
      this.labOverlayObjects.push(name);
    }

    const close = this.add.text(WIDTH / 2, 912, t.close, {
      fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#081018', backgroundColor: '#72e06a', padding: { x: 26, y: 11 }
    }).setOrigin(0.5).setDepth(43).setInteractive({ useHandCursor: true });
    this.labOverlayObjects.push(close);
    close.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); this.closeLab(); });
  }

  private openShop() {
    for (const object of this.shopOverlayObjects) object.destroy();
    this.shopOverlayObjects = [];
    this.pauseForOverlay();
    track('background_shop_open');
    const t = copy();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x080b12, 0.97).setDepth(45).setInteractive();
    this.shopOverlayObjects.push(overlay);
    const title = this.add.text(WIDTH / 2, 48, `${t.backgroundShop} · ${t.dna}: ${this.save.dna}`, {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(46);
    this.shopOverlayObjects.push(title);

    BACKGROUNDS.forEach((bg, index) => {
      const y = 145 + index * 137;
      const owned = this.save.ownedBackgrounds.includes(bg.id);
      const selected = this.save.selectedBackground === bg.id;
      const card = this.add.rectangle(WIDTH / 2, y, 470, 112, selected ? 0x26354b : 0x141d2a, 1)
        .setStrokeStyle(2, selected ? bg.preview[2] : 0x384b64, selected ? 0.9 : 0.42).setDepth(46).setInteractive({ useHandCursor: true });
      const preview = this.add.rectangle(88, y, 80, 70, bg.preview[0]).setStrokeStyle(4, bg.preview[2], 0.85).setDepth(47);
      const core = this.add.circle(88, y, 18, bg.preview[1], 1).setStrokeStyle(3, bg.preview[2], 0.8).setDepth(48);
      const name = this.add.text(145, y - 31, bg.name[locale], { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setDepth(47);
      const desc = this.add.text(145, y - 4, bg.description[locale], { fontFamily: 'Arial', fontSize: '13px', color: '#9db0c9' }).setDepth(47);
      const state = selected ? t.equipped : owned ? t.equip : `${t.buy}: ${bg.cost} ${t.dna}`;
      const stateText = this.add.text(145, y + 27, state, {
        fontFamily: 'Arial Black, Arial', fontSize: '14px', color: selected ? '#8fffa0' : owned ? '#bcd7ff' : '#f4e04d'
      }).setDepth(47);
      this.shopOverlayObjects.push(card, preview, core, name, desc, stateText);
      card.on('pointerdown', (_p, _x, _y, event) => {
        event.stopPropagation();
        if (!owned) {
          if (this.save.dna < bg.cost) {
            this.toast(t.insufficient);
            return;
          }
          this.save.dna -= bg.cost;
          this.save.ownedBackgrounds.push(bg.id);
          this.save.selectedBackground = bg.id;
          track(`background_bought_${bg.id}`);
          this.toast(t.backgroundBought);
        } else {
          this.save.selectedBackground = bg.id;
          track(`background_equipped_${bg.id}`);
        }
        this.persist();
        this.applyBackground(bg.id);
        this.refreshHud();
        this.openShop();
      });
    });

    const close = this.add.text(WIDTH / 2, 880, t.close, {
      fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#081018', backgroundColor: '#72e06a', padding: { x: 26, y: 11 }
    }).setOrigin(0.5).setDepth(47).setInteractive({ useHandCursor: true });
    this.shopOverlayObjects.push(close);
    close.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); this.closeShop(); });
  }

  private endRun() {
    if (this.ended) return;
    this.selectingRemoval = false;
    this.ended = true;
    this.canDrop = false;
    this.matter.world.pause();
    yandexBridge.gameplayStop();
    this.setDangerProgress(0);
    this.save.bestScore = Math.max(this.save.bestScore, this.score);
    this.persist();
    this.refreshHud();
    track('run_end');
    track('run_score_total', this.score);
    track('run_merges_total', this.mergeCount);
    track('run_drops_total', this.dropCount);
    track('run_duration_ms_total', Math.round(performance.now() - this.runStartedAt));
    this.showEndOverlay();
  }

  private runReward() {
    return Math.max(20, Math.min(220, 20 + Math.floor(Math.sqrt(this.score) * 0.45)));
  }

  private showEndOverlay() {
    this.clearEndOverlay();
    const t = copy();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05080d, 0.88).setDepth(50).setInteractive();
    const title = this.add.text(WIDTH / 2, 315, t.gameOver, { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffffff' }).setOrigin(0.5).setDepth(51);
    const result = this.add.text(WIDTH / 2, 372, `${t.score}: ${this.score}\n${t.best}: ${this.save.bestScore}`, {
      fontFamily: 'Arial', fontSize: '24px', color: '#c7d7eb', align: 'center'
    }).setOrigin(0.5).setDepth(51);
    const baseReward = this.runReward();
    const rewardLabel = this.add.text(WIDTH / 2, 450, `${t.runReward}: +${baseReward} ${t.dna}`, {
      fontFamily: 'Arial', fontSize: '21px', color: '#8fffa0'
    }).setOrigin(0.5).setDepth(51);
    this.endOverlayObjects.push(overlay, title, result, rewardLabel);

    let y = 515;
    if (!this.revivedThisRun) {
      const revive = this.add.text(WIDTH / 2, y, `▶ ${t.revive}`, {
        fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', backgroundColor: '#5743a5', padding: { x: 25, y: 13 }
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
      this.endOverlayObjects.push(revive);
      revive.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); void this.rewardRevive(); });
      y += 67;
    }
    const double = this.add.text(WIDTH / 2, y, `▶ ${t.doubled} (+${baseReward * 2})`, {
      fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', backgroundColor: '#87445f', padding: { x: 25, y: 13 }
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
    this.endOverlayObjects.push(double);
    double.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); void this.rewardDoubleAndRestart(); });
    y += 73;
    const restart = this.add.text(WIDTH / 2, y, t.restart, {
      fontFamily: 'Arial Black, Arial', fontSize: '25px', color: '#081018', backgroundColor: '#72e06a', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
    this.endOverlayObjects.push(restart);
    restart.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); void this.restartRun(); });
  }

  private async rewardRevive() {
    if (this.revivedThisRun || this.rewardBusy) return;
    const granted = await this.withRewardedAd(() => {
      const targets = this.getLiveMutants().sort((a, b) => a.y - b.y).slice(0, 2);
      for (const target of targets) this.removeMutant(target);
      this.revivedThisRun = true;
      this.ended = false;
      this.overflowSince = null;
      this.clearEndOverlay();
      this.toast(copy().revived);
    }, 'reward_revive');
    if (granted && !document.hidden) {
      this.matter.world.resume();
      yandexBridge.gameplayStart();
      this.canDrop = true;
    }
  }

  private resetRunState() {
    this.clearEndOverlay();
    for (const mutant of [...this.getLiveMutants()]) this.removeMutant(mutant);
    this.mergingBodies.clear();
    this.activeGenome = genomeById(this.save.selectedGenome);
    this.score = 0;
    this.mergeCount = 0;
    this.dropCount = 0;
    this.nextTier = 0;
    this.ended = false;
    this.rewardBusy = false;
    this.selectingRemoval = false;
    this.canDrop = true;
    this.overflowSince = null;
    this.revivedThisRun = false;
    this.endRewardSettled = false;
    this.runStartedAt = performance.now();
    this.setDangerProgress(0);
    this.updateNextPreview();
    this.refreshHud();
    if (!document.hidden) {
      this.matter.world.resume();
      yandexBridge.gameplayStart();
    }
    track('run_restart');
  }

  private async rewardDoubleAndRestart() {
    if (this.endRewardSettled || this.rewardBusy) return;
    const granted = await this.withRewardedAd(() => this.settleEndReward(2), 'reward_double_dna');
    if (granted) this.resetRunState();
  }

  private async restartRun() {
    if (this.rewardBusy) return;
    this.settleEndReward(1);
    this.canDrop = false;
    await yandexBridge.showInterstitial();
    this.resetRunState();
  }

  private settleEndReward(multiplier: number) {
    if (this.endRewardSettled) return;
    this.grantDna(this.runReward() * multiplier);
    this.endRewardSettled = true;
    this.persist();
    this.refreshHud();
    track(multiplier > 1 ? 'run_reward_double' : 'run_reward_base');
  }

  private clearEndOverlay() {
    for (const object of this.endOverlayObjects) object.destroy();
    this.endOverlayObjects = [];
  }

  private installLocalTestHooks() {
    try {
      const params = new URLSearchParams(globalThis.location?.search ?? '');
      const isLocal = globalThis.location?.hostname === '127.0.0.1' || globalThis.location?.hostname === 'localhost';
      if (!isLocal || params.get('ciTest') !== '1') return;
      (globalThis as any).__MUTANTS_TEST__ = {
        forceGameOver: () => this.endRun(),
        state: () => ({
          ended: this.ended,
          rewardBusy: this.rewardBusy,
          dna: this.save.dna,
          researchDna: this.save.researchDna,
          revivedThisRun: this.revivedThisRun,
          score: this.score,
          selectingRemoval: this.selectingRemoval,
          mutants: this.getLiveMutants().map((mutant) => ({ x: mutant.x, y: mutant.y, tier: mutant.getData('tier') as number }))
        })
      };
    } catch {
      // Local-only diagnostics must never affect gameplay.
    }
  }

  private persist() {
    saveLocal(SAVE_KEY, this.save);
  }
}

async function bootstrap() {
  await yandexBridge.init();
  const platformLanguage = yandexBridge.getLanguage(detectLocale());
  locale = platformLanguage.startsWith('ru') ? 'ru' : 'en';
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#0b1019',
    physics: { default: 'matter', matter: { gravity: { x: 0, y: 1.13 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    scene: [MergeScene]
  });
}

void bootstrap();
