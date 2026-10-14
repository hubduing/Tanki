import { describe, expect, it } from 'vitest';
import { SPAWN_ANIM_STEPS, MAX_ENEMIES_ON_FIELD } from '../../src/config/enemies';
import { FP } from '../../src/config/geometry';
import { Rng } from '../../src/core/rng';
import { stepEnemyAI } from '../../src/world/ai';
import { spawnBullet, updateBullets } from '../../src/world/bullets';
import { stepSpawn } from '../../src/world/spawn';
import { stepWorld } from '../../src/world/step';
import { Tank } from '../../src/world/tank';
import { placeTank, tilePx, worldFromRows } from '../helpers/world';

describe('ГСЧ', () => {
  it('одинаковый seed даёт одинаковую последовательность', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('разные seed дают разные последовательности', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('значения в [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v >= 0 && v < 1).toBe(true);
    }
  });
});

describe('спавн', () => {
  it('враги появляются из очереди по порядку и заканчиваются', () => {
    const w = worldFromRows([]);
    w.enemyQueue.length = 0;
    w.enemyQueue.push('B', 'F', 'P');
    w.spawnTimer = 0;
    const kinds: string[] = [];
    for (let i = 0; i < 3; i++) {
      w.spawnTimer = 0;
      stepSpawn(w);
      // Один слот спавна: убираем предыдущего врага с поля, чтобы точка освободилась.
      kinds.push(w.enemies[0].kind);
      w.enemies.length = 0;
    }
    expect(kinds).toEqual(['B', 'F', 'P']);
    expect(w.enemyQueue.length).toBe(0);
  });

  it('не более MAX_ENEMIES_ON_FIELD врагов на поле', () => {
    const w = worldFromRows([]);
    w.enemyQueue.length = 0;
    for (let i = 0; i < 10; i++) w.enemyQueue.push('B');
    for (let i = 0; i < 50; i++) {
      w.spawnTimer = 0;
      stepSpawn(w);
      for (const e of w.enemies) e.spawning = 0;
    }
    expect(w.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES_ON_FIELD);
  });

  it('спавн ждёт, если точка занята танком', () => {
    const w = worldFromRows([]);
    w.enemyQueue.length = 0;
    w.enemyQueue.push('B');
    // Игрок стоит на единственной точке появления (12, 0).
    placeTank(w, tilePx(12), tilePx(0));
    w.spawnTimer = 0;
    stepSpawn(w);
    expect(w.enemies.length).toBe(0);
    expect(w.enemyQueue.length).toBe(1);
  });

  it('новый враг появляется с анимацией и неуязвим', () => {
    const w = worldFromRows([]);
    w.enemyQueue.length = 0;
    w.enemyQueue.push('B');
    w.spawnTimer = 0;
    stepSpawn(w);
    expect(w.enemies[0].spawning).toBe(SPAWN_ANIM_STEPS);
  });
});

describe('здоровье', () => {
  it('бронированный враг переживает три попадания и гибнет на четвёртом', () => {
    const w = worldFromRows([]);
    const armored = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down', 'A', 4);
    armored.spawning = 0;
    w.enemies.push(armored);
    for (let hit = 1; hit <= 4; hit++) {
      const shooter = new Tank(tilePx(6) * FP, tilePx(10) * FP, 'up');
      spawnBullet(w, shooter, 'player', 3, false);
      for (let i = 0; i < 60; i++) updateBullets(w);
      expect(w.enemies.length).toBe(hit < 4 ? 1 : 0);
    }
  });

  it('пуля не бьёт появляющегося врага', () => {
    const w = worldFromRows([]);
    const e = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down', 'B', 1);
    e.spawning = 30;
    w.enemies.push(e);
    const shooter = new Tank(tilePx(6) * FP, tilePx(10) * FP, 'up');
    spawnBullet(w, shooter, 'player', 3, false);
    for (let i = 0; i < 60; i++) updateBullets(w);
    expect(w.enemies.length).toBe(1);
  });
});

describe('ИИ врага', () => {
  it('выбирает направление на игрока, когда тот на одной линии', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    const e = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down', 'B', 1);
    e.spawning = 0;
    e.turnTimer = 999;
    w.enemies.push(e);
    stepEnemyAI(w, e);
    expect(e.aiDir).toBe('down');
  });

  it('не стреляет больше одной пули одновременно', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(0), tilePx(12));
    const e = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down', 'P', 1);
    e.spawning = 0;
    w.enemies.push(e);
    for (let i = 0; i < 400; i++) {
      stepEnemyAI(w, e);
      expect(w.bullets.filter((b) => b.alive && b.source === e).length).toBeLessThanOrEqual(1);
    }
  });
});

describe('детерминизм', () => {
  it('одинаковый seed и одинаковый ввод дают одинаковое состояние мира', () => {
    const snapshot = (seed: number) => {
      const w = worldFromRows(['', '', '', '', '......#'], seed);
      w.enemyQueue.length = 0;
      for (let i = 0; i < 6; i++) w.enemyQueue.push(['B', 'F', 'P', 'A'][i % 4]);
      w.spawnTimer = 0;
      for (let t = 0; t < 1500; t++) {
        stepWorld(w, { dir: t % 90 < 45 ? 'right' : 'left', fire: t % 30 === 0 });
      }
      return JSON.stringify({
        enemies: w.enemies.map((e) => [e.x, e.y, e.dir, e.health]),
        bullets: w.bullets.map((b) => [b.x, b.y]),
        player: [w.player.x, w.player.y],
        base: w.baseAlive,
      });
    };
    expect(snapshot(123)).toBe(snapshot(123));
  });
});
