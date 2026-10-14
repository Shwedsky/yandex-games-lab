import Phaser from 'phaser';
import type { BackgroundDefinition } from './content';

const WIDTH = 540;
const HEIGHT = 960;

export function renderBackground(scene: Phaser.Scene, container: Phaser.GameObjects.Container, bg: BackgroundDefinition) {
  container.removeAll(true);
  scene.cameras.main.setBackgroundColor(bg.preview[0]);

  const add = <T extends Phaser.GameObjects.GameObject>(object: T) => {
    container.add(object);
    return object;
  };

  add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, bg.preview[0]));

  if (bg.id === 'void') {
    add(scene.add.rectangle(WIDTH / 2, HEIGHT * 0.62, WIDTH, HEIGHT * 0.76, 0x132038, 0.28));
    for (let i = 0; i < 42; i += 1) {
      const x = 10 + ((i * 83) % 520);
      const y = 18 + ((i * 149) % 920);
      add(scene.add.circle(x, y, 1 + (i % 3), i % 6 === 0 ? 0x98b7eb : 0x4d6388, 0.42));
    }
    return;
  }

  if (bg.id === 'neon') {
    add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x001820, 0.5));
    for (let y = 24; y < HEIGHT; y += 58) {
      add(scene.add.rectangle(WIDTH / 2, y, WIDTH, 2, 0x35f4ff, 0.28));
    }
    for (let x = 18; x < WIDTH; x += 58) {
      add(scene.add.rectangle(x, HEIGHT / 2, 2, HEIGHT, x % 116 === 18 ? 0xff42d0 : 0x35f4ff, 0.2));
    }
    add(scene.add.rectangle(WIDTH / 2, 260, 500, 18, 0xff42d0, 0.2));
    add(scene.add.rectangle(WIDTH / 2, 742, 500, 18, 0x35f4ff, 0.22));
    add(scene.add.circle(95, 155, 90, 0xff42d0, 0.11));
    add(scene.add.circle(455, 800, 130, 0x35f4ff, 0.13));
    return;
  }

  if (bg.id === 'biolab') {
    add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x10260b, 0.58));
    for (let i = 0; i < 15; i += 1) {
      const x = 28 + ((i * 109) % 485);
      const y = 60 + ((i * 167) % 820);
      const r = 18 + (i % 4) * 11;
      add(scene.add.circle(x, y, r, i % 2 === 0 ? 0x9cff57 : 0x45ff8d, 0.12));
      add(scene.add.circle(x - r * 0.24, y - r * 0.28, Math.max(3, r * 0.18), 0xffffff, 0.12));
    }
    for (let x = 62; x < WIDTH; x += 104) {
      add(scene.add.rectangle(x, HEIGHT / 2, 9, HEIGHT * 0.82, 0x66ff55, 0.08));
      add(scene.add.circle(x, 110 + (x % 160), 18, 0x9cff57, 0.16));
    }
    add(scene.add.rectangle(WIDTH / 2, 520, WIDTH * 0.88, 5, 0xbaff72, 0.25));
    return;
  }

  if (bg.id === 'reactor') {
    add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x2a0903, 0.62));
    const cx = WIDTH / 2;
    const cy = HEIGHT * 0.68;
    for (let i = 0; i < 8; i += 1) {
      add(scene.add.circle(cx, cy, 70 + i * 38, i % 2 === 0 ? 0xff9a20 : 0xff4d1f, 0.035 + i * 0.007));
    }
    add(scene.add.circle(cx, cy, 74, 0xffb02e, 0.18));
    add(scene.add.circle(cx, cy, 38, 0xffe6a1, 0.35));
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = cx + Math.cos(angle) * 220;
      const y = cy + Math.sin(angle) * 220;
      const beam = scene.add.rectangle((cx + x) / 2, (cy + y) / 2, 230, 4, 0xff7b20, 0.24);
      beam.setRotation(angle);
      add(beam);
    }
    return;
  }

  add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x12051f, 0.68));
  const cx = WIDTH / 2;
  const cy = HEIGHT * 0.56;
  for (let i = 0; i < 10; i += 1) {
    add(scene.add.circle(cx, cy, 46 + i * 31, i % 2 === 0 ? 0xd26cff : 0x6b21a8, 0.03 + i * 0.008));
  }
  add(scene.add.circle(cx, cy, 88, 0x09000f, 0.92));
  add(scene.add.circle(cx, cy, 104, 0xd26cff, 0.16));
  for (let i = 0; i < 11; i += 1) {
    const angle = (Math.PI * 2 * i) / 11 + 0.2;
    const x = cx + Math.cos(angle) * (150 + (i % 3) * 35);
    const y = cy + Math.sin(angle) * (150 + (i % 3) * 35);
    add(scene.add.circle(x, y, 4 + (i % 3), 0xf4c8ff, 0.5));
  }
}
