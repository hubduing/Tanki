import { describe, expect, it } from 'vitest';
import { BONUS, MAX_UPGRADE } from '../../src/config/bonuses';
import { FP } from '../../src/config/geometry';
import { applyBonus, spawnBonus, stepBonuses } from '../../src/world/bonus';
import { spawnBullet, updateBullets } from '../../src/world/bullets';
import { stepWorld } from '../../src/world/step';
import { Tank } from '../../src/world/tank';
import { placeTank, tilePx, worldFromRows } from '../helpers/world';

describe('звезда', () => {
  it('поднимает улучшение на 1 за подбор и не выходит за максимум', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    for (let i = 0; i < 10; i++) applyBonus(w, 'S');
    expect(w.player.upgrade).toBe(MAX_UPGRADE);
  });

  it('на максимуме даёт очки, а не уровень', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.player.upgrade = MAX_UPGRADE;
    applyBonus(w, 'S');
    expect(w.player.upgrade).toBe(MAX_UPGRADE);
    expect(w.score).toBe(BONUS.starMaxPoints);
  });
});

describe('граната', () => {
  it('уничтожает всех врагов на поле и начисляет очки за каждого', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.enemies.push(new Tank(tilePx(2) * FP, tilePx(2) * FP, 'down', 'B', 1));
    w.enemies.push(new Tank(tilePx(8) * FP, tilePx(2) * FP, 'down', 'F', 1));
    applyBonus(w, 'G');
    expect(w.enemies.length).toBe(0);
    expect(w.score).toBe(100 + 200);
  });
});

describe('каска и таймер', () => {
  it('каска даёт неуязвимость на заданное время', () => {
    const w = worldFromRows([]);
    applyBonus(w, 'H');
    expect(w.player.invuln).toBe(BONUS.helmetSteps);
  });

  it('заморозка останавливает врагов и истекает', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    const e = new Tank(tilePx(2) * FP, tilePx(2) * FP, 'down', 'B', 1);
    w.enemies.push(e);
    applyBonus(w, 'C');
    const x0 = e.x;
    for (let i = 0; i < 30; i++) stepWorld(w, { dir: null, fire: false });
    expect(e.x).toBe(x0);
    for (let i = 0; i < BONUS.freezeSteps; i++) stepWorld(w, { dir: null, fire: false });
    expect(w.freezeTimer).toBe(0);
  });
});

describe('танк и лопата', () => {
  it('танк добавляет одну жизнь', () => {
    const w = worldFromRows([]);
    const before = w.lives;
    applyBonus(w, 'T');
    expect(w.lives).toBe(before + 1);
  });

  it('лопата делает кирпич вокруг базы стальным и возвращает обратно', () => {
    const rows: string[] = Array.from({ length: 13 }, (_, y) => (y >= 11 ? '......EE' : ''));
    // Кирпич в (5,10) — над левым верхним углом базы (база в (6,11)); он в кольце лопаты.
    rows[10] = '.....#.';
    const w = worldFromRows(rows);
    const ring = w.tileAt(5, 10)!;
    expect(ring.kind).toBe('brick');
    applyBonus(w, 'L');
    expect(ring.kind).toBe('steel');
    // Тестируем только таймер лопаты: снимаем шаги мира, а не весь цикл с врагами и победой.
    w.shovelTimer = 1;
    w.enemyQueue.length = 0;
    w.enemies.length = 0;
    stepWorld(w, { dir: null, fire: false });
    expect(w.shovelTimer).toBe(0);
    expect(ring.kind).toBe('brick');
  });
});

describe('подбор и жизнь бонуса', () => {
  it('бонус исчезает по истечении времени жизни на карте', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(0), tilePx(0));
    spawnBonus(w, 'T', tilePx(12) * FP, tilePx(12) * FP);
    for (let i = 0; i < BONUS.lifeSteps; i++) stepBonuses(w);
    expect(w.bonuses.length).toBe(0);
  });

  it('подбор применяет эффект один раз и удаляет бонус', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    const before = w.lives;
    spawnBonus(w, 'T', w.player.x, w.player.y);
    stepBonuses(w);
    stepBonuses(w);
    expect(w.lives).toBe(before + 1);
    expect(w.bonuses.length).toBe(0);
  });
});

describe('выпадение бонуса', () => {
  it('помеченный враг при уничтожении роняет бонус', () => {
    const w = worldFromRows([]);
    const e = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down', 'B', 1);
    e.spawning = 0;
    e.carriesBonus = true;
    w.enemies.push(e);
    // Пуля игрока снизу бьёт врага.
    const shooter = new Tank(tilePx(6) * FP, tilePx(10) * FP, 'up');
    spawnBullet(w, shooter, 'player', 3, false);
    for (let i = 0; i < 60; i++) updateBullets(w);
    expect(w.enemies.length).toBe(0);
    expect(w.bonuses.length).toBe(1);
  });

  it('обычный враг бонус не роняет', () => {
    const w = worldFromRows([]);
    const e = new Tank(tilePx(6) * FP, tilePx(2) * FP, 'down', 'B', 1);
    e.spawning = 0;
    w.enemies.push(e);
    const shooter = new Tank(tilePx(6) * FP, tilePx(10) * FP, 'up');
    spawnBullet(w, shooter, 'player', 3, false);
    for (let i = 0; i < 60; i++) updateBullets(w);
    expect(w.bonuses.length).toBe(0);
  });
});

describe('звезда на максимуме не меняет уровень', () => {
  it('подбор звезды на максимуме не сбрасывает и не повышает улучшение дальше максимума', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(6), tilePx(10));
    w.player.upgrade = MAX_UPGRADE;
    spawnBonus(w, 'S', w.player.x, w.player.y);
    stepBonuses(w);
    expect(w.player.upgrade).toBe(MAX_UPGRADE);
  });
});
