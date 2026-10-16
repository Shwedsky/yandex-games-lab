import Phaser from 'phaser';
import type { GenomeId } from './content';

function polygonPoints(count: number, outer: number, inner = outer, rotation = -Math.PI / 2) {
  const points: Phaser.Math.Vector2[] = [];
  const total = inner === outer ? count : count * 2;
  for (let i = 0; i < total; i += 1) {
    const radius = inner === outer || i % 2 === 0 ? outer : inner;
    const angle = rotation + (Math.PI * 2 * i) / total;
    points.push(new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return points;
}

function drawEyes(g: Phaser.GameObjects.Graphics, count: number, radius: number, pupil: number) {
  const eyeY = -radius * 0.08;
  for (let i = 0; i < count; i += 1) {
    const eyeX = (i - (count - 1) / 2) * radius * 0.34;
    g.fillStyle(0xffffff, 0.96);
    g.fillEllipse(eyeX, eyeY, radius * 0.26, radius * 0.31);
    g.fillStyle(pupil, 1);
    g.fillCircle(eyeX + radius * 0.025, eyeY + radius * 0.015, Math.max(2, radius * 0.065));
  }
}
function drawSmile(g: Phaser.GameObjects.Graphics, radius: number, color: number) {
  g.lineStyle(Math.max(2, radius * 0.055), color, 0.82);
  g.beginPath();
  g.arc(0, radius * 0.14, radius * 0.24, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
}

export function createGenomeCreature(
  scene: Phaser.Scene,
  genomeId: GenomeId,
  tier: number,
  radius: number,
  color: number
) {
  const g = scene.add.graphics();
  const outline = genomeId === 'abyss' ? 0xe9d6ff : 0xffffff;
  const dark = genomeId === 'cyber' ? 0x06131c : genomeId === 'abyss' ? 0x08030f : 0x10151f;
  const complexity = Phaser.Math.Clamp(tier, 0, 10);

  if (genomeId === 'biomass') {
    const lobes = 3 + Math.floor(complexity / 2);
    g.fillStyle(color, 1);
    for (let i = 0; i < lobes; i += 1) {
      const angle = (Math.PI * 2 * i) / lobes + 0.25;
      const d = radius * (0.34 + (i % 2) * 0.08);
      const lobe = radius * (0.58 + ((i + tier) % 3) * 0.06);
      g.fillCircle(Math.cos(angle) * d, Math.sin(angle) * d, lobe);
    }
    g.fillEllipse(0, radius * 0.03, radius * 1.55, radius * 1.42);
    g.lineStyle(Math.max(2, radius * 0.05), outline, 0.52);
    g.strokeEllipse(0, radius * 0.03, radius * 1.55, radius * 1.42);
    if (tier >= 5) {
      g.lineStyle(Math.max(2, radius * 0.045), dark, 0.34);
      for (let i = 0; i < 3 + Math.floor(tier / 3); i += 1) {
        const angle = (Math.PI * 2 * i) / (3 + Math.floor(tier / 3));
        g.strokeCircle(Math.cos(angle) * radius * 0.33, Math.sin(angle) * radius * 0.32, radius * 0.13);
      }
    }
    drawEyes(g, tier >= 7 ? 3 : tier >= 3 ? 2 : 1, radius, dark);
    drawSmile(g, radius, dark);
  } else if (genomeId === 'predator') {
    const teeth = 5 + Math.floor(complexity / 2);
    const body = polygonPoints(teeth, radius * 1.04, radius * (tier < 3 ? 0.78 : 0.62), -Math.PI / 2);
    g.fillStyle(color, 1);
    g.fillPoints(body, true);
    g.lineStyle(Math.max(2, radius * 0.055), outline, 0.58);
    g.strokePoints(body, true);
    if (tier >= 3) {
      g.fillStyle(dark, 0.7);
      const mouth = polygonPoints(3 + Math.min(3, Math.floor(tier / 3)), radius * 0.34, radius * 0.2, Math.PI / 2);
      g.fillPoints(mouth, true);
    }
    drawEyes(g, tier >= 8 ? 3 : 2, radius, dark);
    drawSmile(g, radius, 0xffffff);
  } else if (genomeId === 'parasite') {
    const segments = 2 + Math.floor(complexity / 2);
    const span = radius * 1.22;
    g.fillStyle(color, 1);
    for (let i = 0; i < segments; i += 1) {
      const t = segments === 1 ? 0.5 : i / (segments - 1);
      const x = -span * 0.45 + span * 0.9 * t;
      const y = Math.sin((t + tier * 0.08) * Math.PI * 1.6) * radius * 0.16;
      const r = radius * (0.56 - i * 0.018);
      g.fillEllipse(x, y, r * 1.35, r * 1.08);
    }
    g.lineStyle(Math.max(2, radius * 0.05), outline, 0.48);
    g.strokeEllipse(0, 0, radius * 1.72, radius * 1.15);
    if (tier >= 4) {
      g.lineStyle(Math.max(2, radius * 0.04), dark, 0.58);
      for (let i = 0; i < Math.min(6, tier - 1); i += 1) {
        const angle = (Math.PI * 2 * i) / Math.min(6, tier - 1);
        g.beginPath();
        g.moveTo(Math.cos(angle) * radius * 0.42, Math.sin(angle) * radius * 0.35);
        g.lineTo(Math.cos(angle) * radius * 0.98, Math.sin(angle) * radius * 0.8);
        g.strokePath();
      }
    }
    drawEyes(g, tier >= 6 ? 2 : 1, radius, dark);
    drawSmile(g, radius, dark);
  } else if (genomeId === 'cyber') {
    const teeth = 6 + Math.min(4, Math.floor(complexity / 2));
    const gear = polygonPoints(teeth, radius * 1.05, radius * 0.78, Math.PI / teeth);
    g.fillStyle(color, 1);
    g.fillPoints(gear, true);
    g.lineStyle(Math.max(2, radius * 0.055), outline, 0.62);
    g.strokePoints(gear, true);
    const core = polygonPoints(6, radius * 0.55, radius * 0.55, Math.PI / 6);
    g.fillStyle(0x0a2430, 0.6);
    g.fillPoints(core, true);
    g.lineStyle(Math.max(2, radius * 0.04), 0x64efff, 0.9);
    g.strokePoints(core, true);
    if (tier >= 4) {
      g.lineStyle(Math.max(2, radius * 0.035), 0x64efff, 0.72);
      g.beginPath();
      g.moveTo(-radius * 0.78, 0);
      g.lineTo(radius * 0.78, 0);
      g.moveTo(0, -radius * 0.78);
      g.lineTo(0, radius * 0.78);
      g.strokePath();
    }
    drawEyes(g, tier >= 7 ? 2 : 1, radius, 0x071018);
    drawSmile(g, radius, 0x64efff);
  } else if (genomeId === 'psi') {
    const sides = tier < 3 ? 4 : tier < 7 ? 6 : 8;
    const crystal = polygonPoints(sides, radius * 0.98, radius * 0.98, Math.PI / 4);
    g.fillStyle(color, 0.95);
    g.fillPoints(crystal, true);
    g.lineStyle(Math.max(2, radius * 0.05), outline, 0.72);
    g.strokePoints(crystal, true);
    g.lineStyle(Math.max(2, radius * 0.035), color, 0.46);
    g.strokeCircle(0, 0, radius * 1.17);
    if (tier >= 4) g.strokeCircle(0, 0, radius * 1.35);
    if (tier >= 7) {
      g.fillStyle(0xffffff, 0.76);
      for (let i = 0; i < 3; i += 1) {
        const angle = (Math.PI * 2 * i) / 3 + 0.3;
        g.fillCircle(Math.cos(angle) * radius * 1.18, Math.sin(angle) * radius * 1.18, Math.max(2, radius * 0.07));
      }
    }
    drawEyes(g, tier >= 6 ? 3 : 1, radius, 0x6f32d8);
    drawSmile(g, radius, 0x6f32d8);
  } else {
    const arms = 5 + Math.min(5, Math.floor(complexity / 2));
    const voidShape = polygonPoints(arms, radius * 1.1, radius * (tier < 4 ? 0.54 : 0.42), -Math.PI / 2);
    g.fillStyle(color, 0.96);
    g.fillPoints(voidShape, true);
    g.lineStyle(Math.max(2, radius * 0.055), outline, 0.55);
    g.strokePoints(voidShape, true);
    g.fillStyle(0x08030f, 0.88);
    g.fillCircle(0, 0, radius * (0.26 + tier * 0.012));
    g.lineStyle(Math.max(2, radius * 0.03), 0xd26cff, 0.78);
    g.strokeCircle(0, 0, radius * 0.5);
    if (tier >= 5) {
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI * 2 * i) / 4 + tier * 0.05;
        g.beginPath();
        g.moveTo(Math.cos(angle) * radius * 0.42, Math.sin(angle) * radius * 0.42);
        g.lineTo(Math.cos(angle + 0.18) * radius * 1.15, Math.sin(angle + 0.18) * radius * 1.15);
        g.strokePath();
      }
    }
    drawEyes(g, tier >= 7 ? 4 : tier >= 3 ? 2 : 1, radius, 0xd26cff);
    drawSmile(g, radius, 0xe9d6ff);
  }

  if (tier === 10) {
    g.lineStyle(Math.max(3, radius * 0.045), 0xffffff, 0.72);
    g.strokeCircle(0, 0, radius * 1.16);
  }
  return g;
}
