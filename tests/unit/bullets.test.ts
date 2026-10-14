import { describe, expect, it } from 'vitest';
import { PLAYER_FIRE_COOLDOWN_STEPS, playerBulletLimit, playerBulletSpeedPx } from '../../src/config/balance';
import { FP } from '../../src/config/geometry';
import { spawnBullet, updateBullets } from '../../src/world/bullets';
import { stepWorld, tryFire } from '../../src/world/step';
import { Tank } from '../../src/world/tank';
import type { World } from '../../src/world/world';
import { placeTank, tilePx, worldFromRows } from '../helpers/world';

/** Вражеский танк в пикселях поля. */
function placeEnemy(world: World, xPx: number, yPx: number, dir: 'up' | 'down' = 'down'): Tank {
  const t = new Tank(xPx * FP, yPx * FP, dir);
  world.enemies.push(t);
  return t;
}

/** Танк в пикселях, стреляет в направлении dir; пули двигаются `steps` шагов. */
function shootFrom(world: World, xPx: number, yPx: number, dir: 'up' | 'down', owner: 'player' | 'enemy', speed: number, steps: number, pierce = false): void {
  const shooter = new Tank(xPx * FP, yPx * FP, dir);
  spawnBullet(world, shooter, owner, speed, pierce);
  for (let i = 0; i < steps; i++) updateBullets(world);
}

describe('баланс пуль', () => {
  it('скорость по уровням улучшения 180/240/300 px/с (3/4/5 px за шаг)', () => {
    expect(playerBulletSpeedPx(0)).toBe(3);
    expect(playerBulletSpeedPx(1)).toBe(4);
    expect(playerBulletSpeedPx(2)).toBe(5);
    expect(playerBulletSpeedPx(3)).toBe(5);
  });

  it('лимит пуль игрока: 1 на уровнях 0–1, 2 на уровнях 2–3', () => {
    expect(playerBulletLimit(0)).toBe(1);
    expect(playerBulletLimit(1)).toBe(1);
    expect(playerBulletLimit(2)).toBe(2);
    expect(playerBulletLimit(3)).toBe(2);
  });
});

describe('выстрел и лимиты', () => {
  it('перезарядка блокирует повторный выстрел и проходит за заданное число шагов', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    expect(tryFire(w, w.player, 'player', 3, false, 2)).toBe(true);
    expect(tryFire(w, w.player, 'player', 3, false, 2)).toBe(false);
    for (let i = 0; i < PLAYER_FIRE_COOLDOWN_STEPS; i++) stepWorld(w, { dir: null, fire: false });
    expect(w.player.cooldown).toBe(0);
  });

  it('лимит одновременных пуль игрока соблюдается', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    expect(tryFire(w, w.player, 'player', 1, false, 1)).toBe(true);
    w.player.cooldown = 0;
    expect(tryFire(w, w.player, 'player', 1, false, 1)).toBe(false);
  });

  it('пуля не бьёт своего владельца', () => {
    const w = worldFromRows([]);
    shootFrom(w, tilePx(6), tilePx(10), 'up', 'player', 3, 3);
    expect(w.drainEvents().some((e) => e.type === 'playerHit')).toBe(false);
  });
});

describe('кирпич', () => {
  it('выбивает только квадрант попадания', () => {
    // Кирпич в тайле (6,4). Пуля снизу, x внутри левой половины тайла.
    const w = worldFromRows(['', '', '', '', '......#']);
    const tile = w.tileAt(6, 4)!;
    shootFrom(w, tilePx(6) - 4, tilePx(5), 'up', 'player', 3, 20);
    expect(tile.brickMask & 0b0100).toBe(0); // нижний левый выбит
    expect(tile.brickMask & 0b1011).toBe(0b1011); // остальные целы
  });

  it('тайл исчезает, когда выбиты все квадранты', () => {
    const w = worldFromRows(['', '', '', '', '......#']);
    const tile = w.tileAt(6, 4)!;
    // Выбиваем по очереди нижний левый, затем нижний правый, верхние — двумя попаданиями.
    tile.brickMask = 0;
    shootFrom(w, tilePx(6) - 4, tilePx(5), 'up', 'player', 3, 20);
    expect(tile.kind).toBe('empty');
  });

  it('сталь останавливает обычную пулю', () => {
    const w = worldFromRows(['', '', '', '', '......@']);
    shootFrom(w, tilePx(6) - 4, tilePx(5), 'up', 'player', 3, 40);
    expect(w.tileAt(6, 4)!.kind).toBe('steel');
    expect(w.bullets.length).toBe(0);
  });

  it('пробитие стали пулей уровня 3: тайл разрушен', () => {
    const w = worldFromRows(['', '', '', '', '......@']);
    shootFrom(w, tilePx(6) - 4, tilePx(5), 'up', 'player', 5, 40, true);
    expect(w.tileAt(6, 4)!.kind).toBe('empty');
  });

  it('тонкая стена не пропускает пулю на максимальной скорости', () => {
    // Один тайл кирпича на пути; скорость 5 px за шаг не должна его перескочить.
    const w = worldFromRows(['', '', '', '', '......#']);
    shootFrom(w, tilePx(6) - 4, tilePx(5), 'up', 'player', 5, 3);
    expect(w.tileAt(6, 4)!.brickMask).toBeLessThan(0b1111);
  });
});

describe('база', () => {
  it('попадание в базу разрушает её один раз и гасит пулю', () => {
    const rows = Array.from({ length: 13 }, (_, y) => (y >= 11 ? '......EE' : ''));
    const w = worldFromRows(rows);
    shootFrom(w, tilePx(6), tilePx(13) - 4, 'up', 'enemy', 3, 40);
    expect(w.baseAlive).toBe(false);
    expect(w.drainEvents().filter((e) => e.type === 'baseDestroyed').length).toBe(1);
  });
});

describe('танки', () => {
  it('пуля игрока уничтожает вражеский танк', () => {
    const w = worldFromRows([]);
    placeEnemy(w, tilePx(6), tilePx(2));
    shootFrom(w, tilePx(6), tilePx(10), 'up', 'player', 3, 40);
    expect(w.enemies.length).toBe(0);
    expect(w.drainEvents().some((e) => e.type === 'enemyDestroyed')).toBe(true);
  });

  it('пуля врага попадает в танк игрока', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    shootFrom(w, tilePx(6), tilePx(2), 'down', 'enemy', 3, 60);
    expect(w.drainEvents().some((e) => e.type === 'playerHit')).toBe(true);
  });
});

describe('встречные пули', () => {
  it('пули разных владельцев уничтожают друг друга', () => {
    const w = worldFromRows([]);
    const player = new Tank(tilePx(6) * FP, tilePx(10) * FP, 'up');
    const enemy = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down');
    spawnBullet(w, player, 'player', 3, false);
    spawnBullet(w, enemy, 'enemy', 3, false);
    for (let i = 0; i < 60; i++) updateBullets(w);
    expect(w.bullets.length).toBe(0);
  });
});
