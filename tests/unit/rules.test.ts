import { describe, expect, it } from 'vitest';
import { RESPAWN_DELAY_STEPS, RESPAWN_INVULN_STEPS, START_LIVES } from '../../src/config/rules';
import { FP } from '../../src/config/geometry';
import { stepWorld } from '../../src/world/step';
import { spawnBullet, updateBullets } from '../../src/world/bullets';
import { Tank } from '../../src/world/tank';
import type { World } from '../../src/world/world';
import { placeTank, tilePx, worldFromRows } from '../helpers/world';

/** Прокручивает мир без ввода игрока. */
function idle(w: World, steps: number): void {
  for (let i = 0; i < steps; i++) stepWorld(w, { dir: null, fire: false });
}

/** Вражеская пуля сверху по колонке танка игрока. */
function enemyShotAtPlayer(w: World): void {
  const shooter = new Tank(w.player.x, tilePx(2) * FP, 'down', 'B', 1);
  spawnBullet(w, shooter, 'enemy', 3, false);
  for (let i = 0; i < 60; i++) updateBullets(w);
}

describe('жизни и возрождение', () => {
  it('в начале три жизни', () => {
    const w = worldFromRows([]);
    expect(w.lives).toBe(START_LIVES);
  });

  it('попадание отнимает жизнь и сбрасывает улучшение', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.player.upgrade = 3;
    enemyShotAtPlayer(w);
    expect(w.lives).toBe(START_LIVES - 1);
    expect(w.player.upgrade).toBe(0);
    expect(w.playerDown).toBe(true);
  });

  it('после задержки игрок возрождается с неуязвимостью', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    enemyShotAtPlayer(w);
    idle(w, RESPAWN_DELAY_STEPS);
    expect(w.playerDown).toBe(false);
    expect(w.player.invuln).toBeGreaterThan(0);
  });

  it('неуязвимый игрок пулю поглощает без урона', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.player.invuln = RESPAWN_INVULN_STEPS;
    enemyShotAtPlayer(w);
    expect(w.lives).toBe(START_LIVES);
    expect(w.playerDown).toBe(false);
  });

  it('неуязвимость истекает через заданное число шагов', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.player.invuln = 5;
    idle(w, 5);
    expect(w.player.invuln).toBe(0);
  });

  it('последняя жизнь — поражение без возрождения', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.lives = 1;
    enemyShotAtPlayer(w);
    expect(w.lives).toBe(0);
    expect(w.outcome).toBe('lost');
  });
});

describe('итоги уровня', () => {
  it('разрушение базы — поражение', () => {
    const rows = Array.from({ length: 13 }, (_, y) => (y >= 11 ? '......EE' : ''));
    const w = worldFromRows(rows);
    w.destroyBase();
    expect(w.outcome).toBe('lost');
  });

  it('победа только после очереди спавна и без врагов на поле', () => {
    const w = worldFromRows([]);
    w.enemyQueue.length = 0;
    w.enemyQueue.push('B');
    w.checkVictory();
    expect(w.outcome).toBe('playing');
    w.enemyQueue.length = 0;
    w.checkVictory();
    expect(w.outcome).toBe('won');
  });

  it('очки начисляются по типу врага и растут', () => {
    const w = worldFromRows([]);
    w.onEnemyKilled('B', 0, 0);
    w.onEnemyKilled('A', 0, 0);
    expect(w.score).toBe(100 + 400);
    expect(w.killed).toBe(2);
  });

  it('итог меняется один раз: после поражения победа не наступает', () => {
    const w = worldFromRows([]);
    w.finish('lost');
    w.finish('won');
    expect(w.outcome).toBe('lost');
  });

  it('после итога шаги мира не меняют состояние', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.finish('won');
    const x = w.player.x;
    stepWorld(w, { dir: 'left', fire: false });
    expect(w.player.x).toBe(x);
  });
});
