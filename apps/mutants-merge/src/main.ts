import Phaser from 'phaser';
import { detectLocale, loadLocalSave, saveLocal } from '@yg-lab/shared-core';
import { yandexBridge } from '@yg-lab/yandex-bridge';

const WIDTH = 540;
const HEIGHT = 960;
const CHAMBER = { left: 38, right: 502, top: 274, bottom: 914 };
const OVERFLOW_Y = 322;
const MAX_TIER = 10;
const SAVE_KEY = 'yg-lab:mutants:v1';
const TELEMETRY_KEY = 'yg-lab:mutants:telemetry:v1';

const RADII = [24, 29, 35, 41, 48, 56, 65, 75, 86, 99, 114];
const COLORS = [
  0x72e06a, 0x30d5c8, 0x58a6ff, 0x8d72e1, 0xd267e3,
  0xff6b9a, 0xff7a59, 0xffb347, 0xf4e04d, 0xb8ef5a, 0xffffff
];

const locale = detectLocale();
const FORM_NAMES = locale === 'ru'
  ? ['Спора', 'Клетка', 'Слизень', 'Глазастик', 'Хвататель', 'Пульсар', 'Шиповик', 'Хищник', 'Пси-форма', 'Титан', 'Омега']
  : ['Spore', 'Cell', 'Slime', 'Watcher', 'Grasper', 'Pulsar', 'Spiker', 'Predator', 'Psi Form', 'Titan', 'Omega'];

const t = locale === 'ru'
  ? {
      title: 'МУТАНТЫ', hint: 'Нажми, чтобы сбросить форму', score: 'Счёт', best: 'Рекорд',
      collection: 'Коллекция', gameOver: 'Камера переполнена', restart: 'Ещё раз',
      remove: 'Убрать верхний', upgrade: 'Улучшить след.', adUnavailable: 'Реклама пока недоступна',
      final: 'Финальная форма открыта!', newForm: 'Новая форма', close: 'Закрыть',
      revive: 'Возродиться', doubled: 'Награда x2', coins: 'Монеты', runReward: 'Награда',
      revived: 'Камера стабилизирована!'
    }
  : {
      title: 'MUTANTS', hint: 'Tap to drop a lifeform', score: 'Score', best: 'Best',
      collection: 'Collection', gameOver: 'Chamber overflow', restart: 'Play again',
      remove: 'Remove top', upgrade: 'Upgrade next', adUnavailable: 'Ad unavailable',
      final: 'Final form unlocked!', newForm: 'New form', close: 'Close',
      revive: 'Revive', doubled: 'Double reward', coins: 'Coins', runReward: 'Reward',
      revived: 'Chamber stabilized!'
    };

type SaveState = {
  bestScore: number;
  coins: number;
  discovered: number[];
};

type Telemetry = Record<string, number>;

const defaultSave: SaveState = { bestScore: 0, coins: 0, discovered: [0] };

function track(event: string) {
  try {
    const current = loadLocalSave<Telemetry>(TELEMETRY_KEY, {});
    current[event] = (current[event] ?? 0) + 1;
    saveLocal(TELEMETRY_KEY, current);
  } catch {
    // Telemetry must never block gameplay.
  }
  console.info(`[mutants] ${event}`);
}

class MergeScene extends Phaser.Scene {
  private score = 0;
  private save: SaveState = loadLocalSave(SAVE_KEY, defaultSave);
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private collectionText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Arc;
  private nextTier = 0;
  private canDrop = true;
  private ended = false;
  private overflowSince: number | null = null;
  private mergingBodies = new Set<number>();
  private rewardBusy = false;
  private collisionHandler?: (event: any) => void;
  private revivedThisRun = false;
  private endRewardSettled = false;
  private endOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private collectionOverlayObjects: Phaser.GameObjects.GameObject[] = [];

  async create() {
    track('session_start');
    this.cameras.main.setBackgroundColor('#0b1019');
    this.drawShell();
    this.createHud();
    this.nextTier = this.rollNextTier();
    this.updateNextPreview();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.ended || !this.canDrop || this.collectionOverlayObjects.length > 0) return;
      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);
      this.dropMutant(x, this.nextTier);
      this.nextTier = this.rollNextTier();
      this.updateNextPreview();
      this.canDrop = false;
      this.time.delayedCall(260, () => { this.canDrop = true; });
    });

    this.collisionHandler = (event: any) => {
      for (const pair of event.pairs ?? []) this.tryMergePair(pair.bodyA, pair.bodyB);
    };
    this.matter.world.on('collisionstart', this.collisionHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.collisionHandler) this.matter.world.off('collisionstart', this.collisionHandler);
    });

    await yandexBridge.init();
    await yandexBridge.gameplayReady();
  }

  update(time: number) {
    this.syncVisuals();
    if (this.ended || this.collectionOverlayObjects.length > 0) return;

    const highBody = this.getLiveMutants().some((go) => {
      const body = go.body as any;
      if (!body || body.isStatic) return false;
      return go.y - (go.getData('radius') as number) < OVERFLOW_Y && Math.abs(body.velocity?.y ?? 0) < 0.28;
    });

    if (highBody) {
      this.overflowSince ??= time;
      if (time - this.overflowSince > 1300) this.endRun();
    } else {
      this.overflowSince = null;
    }
  }

  private drawShell() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 86, 484, 700, 0x151d2b)
      .setStrokeStyle(4, 0x42536c);
    this.add.rectangle(WIDTH / 2, CHAMBER.bottom + 18, 470, 24, 0x29384d);
    this.add.rectangle(CHAMBER.left - 10, 580, 20, 690, 0x29384d);
    this.add.rectangle(CHAMBER.right + 10, 580, 20, 690, 0x29384d);

    const danger = this.add.rectangle(WIDTH / 2, OVERFLOW_Y, 440, 2, 0xff647c, 0.7);
    danger.setDepth(3);

    this.matter.add.rectangle(WIDTH / 2, CHAMBER.bottom + 2, CHAMBER.right - CHAMBER.left, 20, { isStatic: true });
    this.matter.add.rectangle(CHAMBER.left - 3, 580, 18, CHAMBER.bottom - CHAMBER.top + 20, { isStatic: true });
    this.matter.add.rectangle(CHAMBER.right + 3, 580, 18, CHAMBER.bottom - CHAMBER.top + 20, { isStatic: true });
  }

  private createHud() {
    this.add.text(WIDTH / 2, 42, t.title, {
      fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 91, t.hint, {
      fontFamily: 'Arial', fontSize: '19px', color: '#9db0c9'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(28, 132, '', { fontFamily: 'Arial', fontSize: '22px', color: '#ffffff' });
    this.bestText = this.add.text(28, 163, '', { fontFamily: 'Arial', fontSize: '18px', color: '#9db0c9' });
    this.coinsText = this.add.text(28, 191, '', { fontFamily: 'Arial', fontSize: '18px', color: '#f4e04d' });

    this.collectionText = this.add.text(WIDTH - 28, 191, '', {
      fontFamily: 'Arial', fontSize: '18px', color: '#9db0c9', backgroundColor: '#1e2b3f', padding: { x: 8, y: 5 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.collectionText.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.openCollection();
    });

    this.add.text(WIDTH - 100, 133, locale === 'ru' ? 'След.' : 'Next', { fontFamily: 'Arial', fontSize: '16px', color: '#9db0c9' });
    this.nextPreview = this.add.circle(WIDTH - 54, 150, 18, COLORS[0]).setStrokeStyle(2, 0xffffff, 0.65);

    const removeButton = this.createActionButton(145, 236, t.remove);
    removeButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      void this.rewardRemoveTop();
    });

    const upgradeButton = this.createActionButton(395, 236, t.upgrade);
    upgradeButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      void this.rewardUpgradeNext();
    });

    this.refreshHud();
  }

  private createActionButton(x: number, y: number, label: string) {
    return this.add.text(x, y, `▶ ${label}`, {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff',
      backgroundColor: '#25344b', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
  }

  private async withRewardedAd(reward: () => void, eventName: string) {
    if (this.rewardBusy) return false;
    this.rewardBusy = true;
    this.canDrop = false;
    this.matter.world.pause();
    track(`${eventName}_offer`);

    const granted = await yandexBridge.showRewardedAndWait();
    if (granted) {
      reward();
      track(`${eventName}_rewarded`);
    } else {
      this.toast(t.adUnavailable);
      track(`${eventName}_failed`);
    }

    if (!this.ended && this.collectionOverlayObjects.length === 0) this.matter.world.resume();
    this.canDrop = true;
    this.rewardBusy = false;
    return granted;
  }

  private async rewardRemoveTop() {
    if (this.ended) return;
    const target = this.getLiveMutants().sort((a, b) => a.y - b.y)[0];
    if (!target) return;
    await this.withRewardedAd(() => {
      this.removeMutant(target);
      this.overflowSince = null;
    }, 'reward_remove_top');
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
    track('drop');
  }

  private spawnMutant(x: number, y: number, tier: number, withDropImpulse = false) {
    const radius = RADII[tier];
    const circle = this.add.circle(x, y, radius, COLORS[tier], 0.02).setStrokeStyle(0);
    circle.setData('mutant', true);
    circle.setData('tier', tier);
    circle.setData('radius', radius);

    this.matter.add.gameObject(circle, {
      shape: { type: 'circle', radius },
      restitution: 0.12,
      friction: 0.08,
      frictionAir: 0.012,
      density: 0.0028
    });

    const body = circle.body as any;
    body.label = `mutant-${tier}`;
    if (withDropImpulse) circle.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2));

    const skin = this.createCreatureGraphic(tier, radius);
    skin.setPosition(x, y).setDepth(2);
    circle.setData('skin', skin);
    return circle;
  }

  private createCreatureGraphic(tier: number, radius: number) {
    const g = this.add.graphics();
    const color = COLORS[tier];
    const accent = tier >= 8 ? 0x1b1528 : 0x172335;

    g.fillStyle(color, 1);
    g.fillCircle(0, 0, radius);
    g.lineStyle(Math.max(2, radius * 0.055), 0xffffff, tier === MAX_TIER ? 0.9 : 0.5);
    g.strokeCircle(0, 0, radius - 1);

    if (tier >= 2) {
      g.fillStyle(accent, 0.24);
      const spotCount = Math.min(7, tier + 1);
      for (let i = 0; i < spotCount; i += 1) {
        const angle = (Math.PI * 2 * i) / spotCount + 0.35;
        const d = radius * (0.38 + (i % 2) * 0.14);
        g.fillCircle(Math.cos(angle) * d, Math.sin(angle) * d, Math.max(3, radius * 0.095));
      }
    }

    if (tier >= 5) {
      const spikeCount = Math.min(9, tier - 2);
      g.fillStyle(color, 1);
      for (let i = 0; i < spikeCount; i += 1) {
        const angle = (Math.PI * 2 * i) / spikeCount;
        const bx = Math.cos(angle) * radius * 0.82;
        const by = Math.sin(angle) * radius * 0.82;
        const tx = Math.cos(angle) * radius * 1.23;
        const ty = Math.sin(angle) * radius * 1.23;
        const side = radius * 0.12;
        g.fillTriangle(
          bx + Math.cos(angle + Math.PI / 2) * side, by + Math.sin(angle + Math.PI / 2) * side,
          bx + Math.cos(angle - Math.PI / 2) * side, by + Math.sin(angle - Math.PI / 2) * side,
          tx, ty
        );
      }
    }

    const eyeCount = tier >= 7 ? 3 : tier >= 3 ? 2 : 1;
    const eyeY = -radius * 0.12;
    for (let i = 0; i < eyeCount; i += 1) {
      const eyeX = (i - (eyeCount - 1) / 2) * radius * 0.42;
      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX, eyeY, Math.max(4, radius * 0.16));
      g.fillStyle(tier >= 8 ? 0xff416c : 0x10151f, 1);
      g.fillCircle(eyeX + radius * 0.035, eyeY, Math.max(2, radius * 0.075));
    }

    if (tier >= 4) {
      g.lineStyle(Math.max(2, radius * 0.045), accent, 0.78);
      const mouthY = radius * 0.32;
      g.beginPath();
      g.moveTo(-radius * 0.24, mouthY);
      g.lineTo(0, mouthY + radius * 0.12);
      g.lineTo(radius * 0.24, mouthY);
      g.strokePath();
    }

    if (tier === MAX_TIER) {
      g.lineStyle(4, 0xffffff, 0.55);
      g.strokeCircle(0, 0, radius * 0.63);
      g.strokeCircle(0, 0, radius * 0.45);
    }

    return g;
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
        mergedBody.velocity.x = Phaser.Math.FloatBetween(-0.35, 0.35);
        mergedBody.velocity.y = -1.7;
      }

      this.score += (nextTier + 1) * (nextTier + 1) * 10;
      this.save.coins += nextTier + 1;
      track(`merge_tier_${nextTier}`);
      const firstDiscovery = !this.save.discovered.includes(nextTier);
      if (firstDiscovery) {
        this.save.discovered.push(nextTier);
        track(`discover_tier_${nextTier}`);
        this.toast(nextTier === MAX_TIER ? t.final : `${t.newForm}: ${FORM_NAMES[nextTier]}`);
      }
      this.persist();
      this.refreshHud();

      const skin = merged.getData('skin') as Phaser.GameObjects.Graphics | undefined;
      if (skin) {
        this.tweens.add({
          targets: skin,
          scaleX: 1.18,
          scaleY: 1.18,
          duration: 100,
          yoyo: true,
          ease: 'Quad.easeOut'
        });
      }

      this.mergingBodies.delete(bodyA.id);
      this.mergingBodies.delete(bodyB.id);
    });
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
    if (this.score > 2500 && r < 0.08) return 2;
    if (this.score > 700 && r < 0.26) return 1;
    return 0;
  }

  private updateNextPreview() {
    if (!this.nextPreview) return;
    this.nextPreview.setFillStyle(COLORS[this.nextTier]);
    const scale = Phaser.Math.Clamp(RADII[this.nextTier] / 26, 0.8, 1.35);
    this.nextPreview.setScale(scale);
  }

  private refreshHud() {
    this.scoreText?.setText(`${t.score}: ${this.score}`);
    this.bestText?.setText(`${t.best}: ${Math.max(this.score, this.save.bestScore)}`);
    this.coinsText?.setText(`${t.coins}: ${this.save.coins}`);
    this.collectionText?.setText(`${t.collection} ${this.save.discovered.length}/${MAX_TIER + 1}`);
  }

  private toast(message: string) {
    const text = this.add.text(WIDTH / 2, 350, message, {
      fontFamily: 'Arial Black, Arial', fontSize: '25px', color: '#ffffff',
      backgroundColor: '#26344d', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.tweens.add({ targets: text, alpha: 1, y: 325, duration: 180, hold: 700, yoyo: true, onComplete: () => text.destroy() });
  }

  private openCollection() {
    if (this.collectionOverlayObjects.length > 0 || this.ended || this.rewardBusy) return;
    track('collection_open');
    this.canDrop = false;
    this.matter.world.pause();

    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07101a, 0.96)
      .setDepth(40).setInteractive();
    this.collectionOverlayObjects.push(overlay);

    const title = this.add.text(WIDTH / 2, 65, `${t.collection} ${this.save.discovered.length}/${MAX_TIER + 1}`, {
      fontFamily: 'Arial Black, Arial', fontSize: '31px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(41);
    this.collectionOverlayObjects.push(title);

    for (let tier = 0; tier <= MAX_TIER; tier += 1) {
      const col = tier % 3;
      const row = Math.floor(tier / 3);
      const x = 105 + col * 165;
      const y = 165 + row * 175;
      const unlocked = this.save.discovered.includes(tier);

      const card = this.add.rectangle(x, y, 142, 145, unlocked ? 0x162437 : 0x0e1621, 1)
        .setStrokeStyle(2, unlocked ? COLORS[tier] : 0x344153, unlocked ? 0.65 : 0.35)
        .setDepth(41);
      this.collectionOverlayObjects.push(card);

      if (unlocked) {
        const preview = this.createCreatureGraphic(tier, Math.min(44, RADII[tier] * 0.55));
        preview.setPosition(x, y - 23).setDepth(42);
        this.collectionOverlayObjects.push(preview);
      } else {
        const unknown = this.add.text(x, y - 25, '?', {
          fontFamily: 'Arial Black, Arial', fontSize: '48px', color: '#435267'
        }).setOrigin(0.5).setDepth(42);
        this.collectionOverlayObjects.push(unknown);
      }

      const name = this.add.text(x, y + 46, unlocked ? FORM_NAMES[tier] : '???', {
        fontFamily: 'Arial', fontSize: '16px', color: unlocked ? '#ffffff' : '#596a80',
        align: 'center', wordWrap: { width: 128 }
      }).setOrigin(0.5).setDepth(42);
      this.collectionOverlayObjects.push(name);
    }

    const close = this.add.text(WIDTH / 2, 893, t.close, {
      fontFamily: 'Arial Black, Arial', fontSize: '21px', color: '#081018',
      backgroundColor: '#72e06a', padding: { x: 28, y: 12 }
    }).setOrigin(0.5).setDepth(43).setInteractive({ useHandCursor: true });
    this.collectionOverlayObjects.push(close);

    close.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.closeCollection();
    });
  }

  private closeCollection() {
    for (const object of this.collectionOverlayObjects) object.destroy();
    this.collectionOverlayObjects = [];
    if (!this.ended) this.matter.world.resume();
    this.canDrop = true;
  }

  private endRun() {
    if (this.ended) return;
    this.ended = true;
    this.canDrop = false;
    this.matter.world.pause();
    this.save.bestScore = Math.max(this.save.bestScore, this.score);
    this.persist();
    this.refreshHud();
    track('run_end');
    this.showEndOverlay();
  }

  private showEndOverlay() {
    this.clearEndOverlay();
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05080d, 0.84).setDepth(50).setInteractive();
    this.endOverlayObjects.push(overlay);

    const title = this.add.text(WIDTH / 2, 340, t.gameOver, {
      fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(51);
    const result = this.add.text(WIDTH / 2, 398, `${t.score}: ${this.score}\n${t.best}: ${this.save.bestScore}`, {
      fontFamily: 'Arial', fontSize: '24px', color: '#c7d7eb', align: 'center'
    }).setOrigin(0.5).setDepth(51);
    const baseReward = Math.max(1, Math.floor(this.score / 250));
    const rewardLabel = this.add.text(WIDTH / 2, 474, `${t.runReward}: +${baseReward} ${t.coins.toLowerCase()}`, {
      fontFamily: 'Arial', fontSize: '20px', color: '#f4e04d'
    }).setOrigin(0.5).setDepth(51);
    this.endOverlayObjects.push(title, result, rewardLabel);

    if (!this.revivedThisRun) {
      const revive = this.add.text(WIDTH / 2, 540, `▶ ${t.revive}`, {
        fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', backgroundColor: '#5743a5', padding: { x: 25, y: 13 }
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
      this.endOverlayObjects.push(revive);
      revive.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        void this.rewardRevive();
      });
    } else {
      const double = this.add.text(WIDTH / 2, 540, `▶ ${t.doubled}`, {
        fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', backgroundColor: '#87445f', padding: { x: 25, y: 13 }
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
      this.endOverlayObjects.push(double);
      double.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        void this.rewardDoubleAndRestart();
      });
    }

    const restart = this.add.text(WIDTH / 2, 620, t.restart, {
      fontFamily: 'Arial Black, Arial', fontSize: '25px', color: '#081018', backgroundColor: '#72e06a', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
    this.endOverlayObjects.push(restart);

    restart.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      void this.restartRun(false);
    });
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
      this.toast(t.revived);
    }, 'reward_revive');

    if (granted) {
      this.matter.world.resume();
      this.canDrop = true;
    }
  }

  private async rewardDoubleAndRestart() {
    if (this.endRewardSettled || this.rewardBusy) return;
    const granted = await this.withRewardedAd(() => {
      this.settleEndReward(2);
    }, 'reward_double_coins');
    if (granted) {
      this.matter.world.resume();
      this.scene.restart();
    }
  }

  private async restartRun(skipInterstitial: boolean) {
    if (this.rewardBusy) return;
    this.settleEndReward(1);
    this.canDrop = false;
    if (!skipInterstitial) await yandexBridge.showInterstitial();
    this.matter.world.resume();
    this.scene.restart();
  }

  private settleEndReward(multiplier: number) {
    if (this.endRewardSettled) return;
    const baseReward = Math.max(1, Math.floor(this.score / 250));
    this.save.coins += baseReward * multiplier;
    this.endRewardSettled = true;
    this.persist();
    this.refreshHud();
    track(multiplier > 1 ? 'run_reward_double' : 'run_reward_base');
  }

  private clearEndOverlay() {
    for (const object of this.endOverlayObjects) object.destroy();
    this.endOverlayObjects = [];
  }

  private persist() {
    saveLocal(SAVE_KEY, this.save);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0b1019',
  physics: {
    default: 'matter',
    matter: { gravity: { x: 0, y: 1.15 }, debug: false }
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MergeScene]
});
