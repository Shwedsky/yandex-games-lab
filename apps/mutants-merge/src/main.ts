import Phaser from 'phaser';
import { detectLocale, loadLocalSave, saveLocal } from '@yg-lab/shared-core';
import { yandexBridge } from '@yg-lab/yandex-bridge';

const WIDTH = 540;
const HEIGHT = 960;
const CHAMBER = { left: 38, right: 502, top: 236, bottom: 914 };
const OVERFLOW_Y = 286;
const MAX_TIER = 10;
const SAVE_KEY = 'yg-lab:mutants:v1';

const RADII = [24, 29, 35, 41, 48, 56, 65, 75, 86, 99, 114];
const COLORS = [
  0x72e06a, 0x30d5c8, 0x58a6ff, 0x8d72e1, 0xd267e3,
  0xff6b9a, 0xff7a59, 0xffb347, 0xf4e04d, 0xb8ef5a, 0xffffff
];

const locale = detectLocale();
const t = locale === 'ru'
  ? {
      title: 'МУТАНТЫ', hint: 'Нажми, чтобы сбросить форму', score: 'Счёт', best: 'Рекорд',
      collection: 'Открыто', gameOver: 'Камера переполнена', restart: 'Ещё раз',
      final: 'Финальная форма открыта!', newForm: 'Новая форма!'
    }
  : {
      title: 'MUTANTS', hint: 'Tap to drop a lifeform', score: 'Score', best: 'Best',
      collection: 'Found', gameOver: 'Chamber overflow', restart: 'Play again',
      final: 'Final form unlocked!', newForm: 'New form!'
    };

type SaveState = {
  bestScore: number;
  coins: number;
  discovered: number[];
};

const defaultSave: SaveState = { bestScore: 0, coins: 0, discovered: [0] };

class MergeScene extends Phaser.Scene {
  private score = 0;
  private save: SaveState = loadLocalSave(SAVE_KEY, defaultSave);
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private collectionText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Arc;
  private nextTier = 0;
  private canDrop = true;
  private ended = false;
  private overflowSince: number | null = null;
  private mergingBodies = new Set<number>();

  async create() {
    this.cameras.main.setBackgroundColor('#0b1019');
    this.drawShell();
    this.createHud();
    this.nextTier = this.rollNextTier();
    this.updateNextPreview();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.ended || !this.canDrop) return;
      const x = Phaser.Math.Clamp(pointer.x, CHAMBER.left + 34, CHAMBER.right - 34);
      this.dropMutant(x, this.nextTier);
      this.nextTier = this.rollNextTier();
      this.updateNextPreview();
      this.canDrop = false;
      this.time.delayedCall(260, () => { this.canDrop = true; });
    });

    this.matter.world.on('collisionstart', (event: any) => {
      for (const pair of event.pairs ?? []) this.tryMergePair(pair.bodyA, pair.bodyB);
    });

    await yandexBridge.init();
    await yandexBridge.gameplayReady();
  }

  update(time: number) {
    this.syncLabels();
    if (this.ended) return;

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
    this.add.text(WIDTH / 2, 48, t.title, {
      fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 101, t.hint, {
      fontFamily: 'Arial', fontSize: '21px', color: '#9db0c9'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(28, 151, '', { fontFamily: 'Arial', fontSize: '23px', color: '#ffffff' });
    this.bestText = this.add.text(28, 183, '', { fontFamily: 'Arial', fontSize: '19px', color: '#9db0c9' });
    this.collectionText = this.add.text(WIDTH - 28, 183, '', { fontFamily: 'Arial', fontSize: '19px', color: '#9db0c9' }).setOrigin(1, 0);
    this.add.text(WIDTH - 100, 145, locale === 'ru' ? 'След.' : 'Next', { fontFamily: 'Arial', fontSize: '17px', color: '#9db0c9' });
    this.nextPreview = this.add.circle(WIDTH - 54, 158, 19, COLORS[0]).setStrokeStyle(2, 0xffffff, 0.65);
    this.refreshHud();
  }

  private dropMutant(x: number, tier: number) {
    this.spawnMutant(x, CHAMBER.top + 18, tier, true);
  }

  private spawnMutant(x: number, y: number, tier: number, withDropImpulse = false) {
    const radius = RADII[tier];
    const circle = this.add.circle(x, y, radius, COLORS[tier]).setStrokeStyle(3, 0xffffff, 0.62);
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

    const label = this.add.text(x, y, `${tier + 1}`, {
      fontFamily: 'Arial Black, Arial', fontSize: `${Math.max(16, radius * 0.58)}px`, color: tier === MAX_TIER ? '#111111' : '#ffffff'
    }).setOrigin(0.5).setDepth(2);
    label.setData('owner', circle);

    circle.setData('label', label);
    return circle;
  }

  private syncLabels() {
    for (const mutant of this.getLiveMutants()) {
      const label = mutant.getData('label') as Phaser.GameObjects.Text | undefined;
      if (!label?.active) continue;
      label.setPosition(mutant.x, mutant.y);
      label.setRotation(mutant.rotation);
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
      const firstDiscovery = !this.save.discovered.includes(nextTier);
      if (firstDiscovery) {
        this.save.discovered.push(nextTier);
        this.toast(nextTier === MAX_TIER ? t.final : t.newForm);
      }
      this.persist();
      this.refreshHud();

      this.tweens.add({
        targets: merged,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut'
      });

      this.mergingBodies.delete(bodyA.id);
      this.mergingBodies.delete(bodyB.id);
    });
  }

  private removeMutant(go: Phaser.GameObjects.Arc) {
    const label = go.getData('label') as Phaser.GameObjects.Text | undefined;
    label?.destroy();
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
    this.collectionText?.setText(`${t.collection}: ${this.save.discovered.length}/${MAX_TIER + 1}`);
  }

  private toast(message: string) {
    const text = this.add.text(WIDTH / 2, 330, message, {
      fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff',
      backgroundColor: '#26344d', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.tweens.add({ targets: text, alpha: 1, y: 305, duration: 180, hold: 700, yoyo: true, onComplete: () => text.destroy() });
  }

  private endRun() {
    if (this.ended) return;
    this.ended = true;
    this.matter.world.pause();
    this.save.bestScore = Math.max(this.save.bestScore, this.score);
    this.save.coins += Math.floor(this.score / 250);
    this.persist();
    this.refreshHud();

    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x05080d, 0.78).setDepth(30).setInteractive();
    const title = this.add.text(WIDTH / 2, 410, t.gameOver, {
      fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(31);
    const result = this.add.text(WIDTH / 2, 468, `${t.score}: ${this.score}`, {
      fontFamily: 'Arial', fontSize: '26px', color: '#c7d7eb'
    }).setOrigin(0.5).setDepth(31);
    const button = this.add.text(WIDTH / 2, 545, t.restart, {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#081018', backgroundColor: '#72e06a', padding: { x: 30, y: 16 }
    }).setOrigin(0.5).setDepth(31).setInteractive({ useHandCursor: true });

    const restart = async () => {
      button.disableInteractive();
      await yandexBridge.showInterstitial();
      this.scene.restart();
    };

    button.on('pointerdown', restart);
    overlay.on('pointerdown', () => undefined);
    void title; void result;
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
