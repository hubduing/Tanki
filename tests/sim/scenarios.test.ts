import { describe, expect, it } from 'vitest';
import { MAX_ENEMIES_ON_FIELD } from '../../src/config/enemies';
import { BULLET_PX, playerBulletLimit } from '../../src/config/balance';
import { BONUS } from '../../src/config/bonuses';
import { BRICK_FULL } from '../../src/config/tiles';
import { FP } from '../../src/config/geometry';
import { applyBonus } from '../../src/world/bonus';
import { spawnEffects } from '../../src/world/effects';
import { stepWorld, type PlayerIntent } from '../../src/world/step';
import { Tank } from '../../src/world/tank';
import type { Dir } from '../../src/core/dir';
import { placeTank, tilePx, worldFromRows } from '../helpers/world';

/**
 * Сценарные симуляции из PLAN.md, 6.3: мир прокручивается на N фиксированных шагов
 * без графики. Все сценарии детерминированы — seed задан явно, ввод одинаковый.
 */

const IDLE: PlayerIntent = { dir: null, fire: false };
const FIRE: PlayerIntent = { dir: null, fire: true };

/** Открытое поле с базой 2×2 внизу по центру. */
function openField(): string[] {
  const rows = Array.from({ length: 13 }, () => '.............');
  rows[11] = '......EE.....';
  rows[12] = '......EE.....';
  return rows;
}

/** Поле, где база обнесена кирпичом: строка 10 — «.....#.#.....», 11–12 — «.....#EE#....». */
function brickBaseField(): string[] {
  const rows = openField();
  rows[10] = '.....#.#.....';
  rows[11] = '.....#EE#....';
  rows[12] = '.....#EE#....';
  return rows;
}

describe('Сценарные симуляции (PLAN.md, 6.3)', () => {
  it('«Игрок стоит на месте»: база не разрушается мгновенно, мир не зависает', () => {
    const w = worldFromRows(openField(), 42);
    placeTank(w, tilePx(0), tilePx(12));

    // Первые 3 секунды: врагам ещё нужно появиться, выйти из анимации и дойти до базы.
    for (let i = 0; i < 180; i++) stepWorld(w, IDLE);
    expect(w.outcome).toBe('playing');
    expect(w.baseAlive).toBe(true);
    expect(w.spawnedCount, 'враги должны были начать появляться').toBeGreaterThan(0);

    // Мир живой: враги двигаются и стреляют, а не стоят молча.
    const watched = w.enemies.map((e) => ({ tank: e, x: e.x, y: e.y }));
    let enemyFired = false;
    for (let i = 0; i < 900 && w.outcome === 'playing'; i++) {
      stepWorld(w, IDLE);
      if (w.bullets.some((b) => b.owner === 'enemy')) enemyFired = true;
    }
    const moved = watched.some((s) => s.tank.x !== s.x || s.tank.y !== s.y);
    expect(moved, 'враги обязаны двигаться').toBe(true);
    expect(enemyFired, 'враги обязаны стрелять').toBe(true);
  });

  it('«Игрок ничего не делает»: уровень корректно заканчивается поражением', () => {
    const w = worldFromRows(openField(), 43);
    placeTank(w, tilePx(0), tilePx(12));

    const maxSteps = 12_000;
    let steps = 0;
    while (steps < maxSteps && w.outcome === 'playing') {
      stepWorld(w, IDLE);
      steps++;
    }

    expect(w.outcome, `за ${maxSteps} шагов (200 с) уровень не завершился`).toBe('lost');
    // Поражение — либо разрушенная база, либо кончившиеся жизни.
    expect(w.baseAlive === false || w.lives === 0).toBe(true);
    expect(steps).toBeLessThan(maxSteps);
  });

  it('«Игрок уничтожает всех»: победа наступает ровно один раз', () => {
    // Коридор в колонке 6: враг не может уйти с линии огня игрока.
    const rows = Array.from({ length: 13 }, () => '.....@.@.....');
    rows[11] = '......EE.....';
    rows[12] = '......EE.....';
    const w = worldFromRows(rows, 45);
    w.enemyQueue.length = 0;
    w.player.invuln = 100_000; // изолируем проверку победы от смерти игрока
    placeTank(w, tilePx(6), tilePx(10));
    w.enemies.push(new Tank(tilePx(6) * FP, tilePx(2) * FP, 'up', 'B', 1));

    let steps = 0;
    while (w.outcome === 'playing' && steps < 900) {
      stepWorld(w, FIRE);
      steps++;
    }
    expect(w.outcome, `враг не уничтожен за ${steps} шагов`).toBe('won');
    expect(w.killed).toBe(1);
    expect(w.score).toBe(100);

    // Победа не повторяется и ничего не начисляет второй раз.
    for (let i = 0; i < 120; i++) stepWorld(w, FIRE);
    expect(w.outcome).toBe('won');
    expect(w.killed).toBe(1);
    expect(w.score).toBe(100);
  });

  it('«Все враги застряли»: каждый враг меняет направление и не стоит навсегда', () => {
    const w = worldFromRows(openField(), 47);
    placeTank(w, tilePx(0), tilePx(12));

    interface Watch {
      dirs: Set<Dir>;
      moved: boolean;
      firstSeen: number;
      lastSeen: number;
      stuck: number;
      maxStuck: number;
      lastX: number;
      lastY: number;
    }
    const watches = new Map<Tank, Watch>();
    const watch = (e: Tank, step: number): Watch => {
      let v = watches.get(e);
      if (!v) {
        v = {
          dirs: new Set<Dir>(),
          moved: false,
          firstSeen: step,
          lastSeen: step,
          stuck: 0,
          maxStuck: 0,
          lastX: e.x,
          lastY: e.y,
        };
        watches.set(e, v);
      }
      return v;
    };

    for (let i = 0; i < 600 && w.outcome === 'playing'; i++) {
      stepWorld(w, IDLE);
      for (const e of w.enemies) {
        const v = watch(e, i);
        v.dirs.add(e.aiDir);
        v.lastSeen = i;
        if (e.moving) {
          v.moved = true;
          v.stuck = 0;
        } else {
          v.stuck++;
          v.maxStuck = Math.max(v.maxStuck, v.stuck);
        }
        v.lastX = e.x;
        v.lastY = e.y;
      }
    }

    expect(watches.size, 'за 600 шагов должны были появиться враги').toBeGreaterThan(0);
    for (const [e, v] of watches) {
      if (v.lastSeen - v.firstSeen < 200) continue; // слишком короткая жизнь для вывода
      expect(v.dirs.size, `враг ${e.kind} не сменил направление`).toBeGreaterThan(1);
      expect(v.moved, `враг ${e.kind} ни разу не сдвинулся`).toBe(true);
      // В упор в стену враг упирается не дольше таймера смены направления (≤180 шагов).
      expect(v.maxStuck, `враг ${e.kind} стоял ${v.maxStuck} шагов подряд`).toBeLessThanOrEqual(300);
    }
  });

  it('«Стрельба в упор»: быстрая пуля не пролетает сквозь стену', () => {
    const withWall = (y: number): string[] => {
      const rows = openField();
      rows[y] = '......#......';
      return rows;
    };

    // 1. Стена вплотную: попадание обязано случиться на первом же шаге.
    const near = worldFromRows(withWall(9), 51);
    near.enemyQueue.length = 1; // пустая очередь + пустое поле = мгновенная победа и заморозка мира
    near.player.invuln = 100_000;
    near.player.upgrade = 3; // 300 px/с = 5 px за шаг
    placeTank(near, tilePx(6), tilePx(10));
    stepWorld(near, FIRE);
    const nearWall = near.tileAt(6, 9);
    expect(nearWall?.brickMask, 'кирпич вплотную обязан принять попадание').not.toBe(BRICK_FULL);
    expect(nearWall?.kind, 'один тайл кирпича не разрушается с одного попадания').toBe('brick');
    expect(near.bullets.length, 'пуля обязана погаснуть в стене').toBe(0);

    // 2. Стена в пяти тайлах: пуля не должна оказаться за целой стеной ни на одном шаге.
    const far = worldFromRows(withWall(5), 52);
    far.enemyQueue.length = 1;
    far.player.invuln = 100_000;
    far.player.upgrade = 3;
    placeTank(far, tilePx(6), tilePx(10));
    const wallTop = tilePx(5);
    let tunneled = false;
    let steps = 0;
    // Один выстрел: после попадания перезарядка не даёт второму выстрелу пролететь раньше времени.
    stepWorld(far, FIRE);
    while (steps < 60 && far.tileAt(6, 5)?.kind === 'brick') {
      stepWorld(far, { dir: null, fire: false });
      steps++;
      if (far.bullets.some((b) => b.y + BULLET_PX <= wallTop)) tunneled = true;
    }
    expect(tunneled, 'пуля не должна пролетать сквозь целую стену').toBe(false);
    expect(far.tileAt(6, 5)?.brickMask, 'стена обязана быть повреждена').not.toBe(BRICK_FULL);
  });

  it('«Наложение бонусов»: заморозка, щит и стальная база корректно завершаются', () => {
    const w = worldFromRows(brickBaseField(), 61);
    // Напарник появляется в начале уровня и мог бы убить врага раньше проверок этого теста.
    w.allySpawnsLeft = 0;
    w.lives = 99;
    w.enemyQueue.length = 0;
    placeTank(w, tilePx(0), tilePx(0));
    const enemy = new Tank(tilePx(12) * FP, tilePx(0) * FP, 'down', 'B', 1);
    w.enemies.push(enemy);
    const startX = enemy.x;
    const startY = enemy.y;

    applyBonus(w, 'C');
    applyBonus(w, 'H');
    applyBonus(w, 'L');

    expect(w.freezeTimer).toBe(BONUS.freezeSteps);
    expect(w.player.invuln).toBeGreaterThanOrEqual(BONUS.helmetSteps);
    expect(w.shovelTimer).toBe(BONUS.shovelSteps);
    // Кольцо вокруг базы стало стальным.
    expect(w.tileAt(5, 11)?.kind).toBe('steel');
    expect(w.tileAt(8, 12)?.kind).toBe('steel');

    // Заморозка держит врагов на месте.
    for (let i = 0; i < 120; i++) stepWorld(w, IDLE);
    expect(enemy.x, 'замороженный враг не двигается').toBe(startX);
    expect(enemy.y, 'замороженный враг не двигается').toBe(startY);
    expect(w.freezeTimer).toBe(BONUS.freezeSteps - 120);

    // Все три таймера истекают, мир остаётся играбельным.
    for (let i = 0; i < BONUS.shovelSteps + 10; i++) stepWorld(w, IDLE);
    expect(w.freezeTimer).toBe(0);
    expect(w.shovelTimer).toBe(0);
    expect(w.player.invuln).toBe(0);
    expect(w.tileAt(5, 11)?.kind, 'лопата обязана вернуть кирпич').toBe('brick');
    expect(w.tileAt(8, 12)?.kind, 'лопата обязана вернуть кирпич').toBe('brick');
    expect(w.outcome).toBe('playing');
  });

  it('Длинный прогон: 10 000 шагов с очередью спавна и постоянной стрельбой', () => {
    // База замурована сталью: её не берут ни враги, ни пули игрока базового уровня,
    // поэтому прогон не прерывается ни победой, ни поражением. Игрок стоит под точкой
    // появления врагов и стреляет вверх: враги гибнут, слоты освобождаются, спавн идёт
    // непрерывно, а кирпичная колонна слева даёт попадания и разрушение тайлов.
    const rows = Array.from({ length: 13 }, () => '.............');
    for (let y = 1; y <= 8; y++) rows[y] = '#............';
    rows[9] = '#...@@@@@....';
    rows[10] = '#...@@@@@....';
    rows[11] = '.....@EE@....';
    rows[12] = '.....@EE@....';
    const w = worldFromRows(rows, 71);
    w.lives = 999;
    w.enemyQueue.length = 0;
    const mix = ['B', 'F', 'P', 'A'];
    for (let i = 0; i < 200; i++) w.enemyQueue.push(mix[i % mix.length]);
    placeTank(w, tilePx(12), tilePx(12));

    const violations: string[] = [];
    const note = (ok: boolean, message: string, step: number): void => {
      if (!ok && violations.length < 10) violations.push(`шаг ${step}: ${message}`);
    };

    let maxEnemies = 0;
    let maxBullets = 0;
    let maxEffects = 0;
    let maxBonuses = 0;

    for (let i = 0; i < 10_000; i++) {
      stepWorld(w, FIRE);
      // Как в main.ts: события кадра превращаются в эффекты и живут по таймеру.
      spawnEffects(w, w.drainEvents());

      maxEnemies = Math.max(maxEnemies, w.enemies.length);
      maxBullets = Math.max(maxBullets, w.bullets.length);
      maxEffects = Math.max(maxEffects, w.effects.length);
      maxBonuses = Math.max(maxBonuses, w.bonuses.length);

      note(
        w.enemies.length <= MAX_ENEMIES_ON_FIELD,
        `врагов на поле ${w.enemies.length} > ${MAX_ENEMIES_ON_FIELD}`,
        i,
      );
      // Лимит относится к танку игрока; пули напарника считаются отдельно.
      const playerBullets = w.bullets.filter((b) => b.source === w.player).length;
      note(
        playerBullets <= playerBulletLimit(w.player.upgrade),
        `пуль игрока ${playerBullets} > лимита ${playerBulletLimit(w.player.upgrade)}`,
        i,
      );
      for (const e of w.enemies) {
        note(w.bullets.filter((b) => b.source === e).length <= 1, `у врага ${e.kind} больше одной пули`, i);
      }
    }

    expect(violations, violations.join('; ')).toEqual([]);
    // Очередь из 200 врагов не заканчивается, база замурована — уровень не должен завершиться.
    expect(w.outcome).toBe('playing');
    // Спавн идёт волнами: слотов всего 4, поэтому «больше одной волны» — уже доказательство,
    // что очередь расходуется и лимит не блокирует игру навсегда.
    expect(w.spawnedCount, 'спавн должен идти волнами').toBeGreaterThan(MAX_ENEMIES_ON_FIELD);
    expect(w.enemyQueue.length, 'очередь не должна исчерпаться').toBeGreaterThan(0);
    expect(maxEnemies).toBeLessThanOrEqual(MAX_ENEMIES_ON_FIELD);
    // Временные сущности не накапливаются: пули, эффекты и бонусы живут по таймеру.
    expect(maxBullets, 'пули накапливаются').toBeLessThanOrEqual(8);
    expect(maxEffects, 'эффекты накапливаются').toBeLessThanOrEqual(64);
    expect(maxBonuses, 'бонусы накапливаются').toBeLessThanOrEqual(32);
  });
});
