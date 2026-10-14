import { describe, expect, it } from 'vitest';
import { validateLevel } from '../../src/levels/validate';
import { World } from '../../src/world/world';

const EMPTY_ROW = '.............';
function base(): Record<string, unknown> {
  return {
    number: 1,
    palette: 0,
    spawnIntervalSec: 2,
    enemies: Array(20).fill('B'),
    player: { x: 4, y: 12 },
    enemySpawns: [{ x: 0, y: 0 }],
    map: [
      ...Array.from({ length: 11 }, () => EMPTY_ROW),
      '.....#EE#....',
      '.....#EE#....',
    ],
  };
}

function problemsOf(raw: unknown): string[] {
  const res = validateLevel(raw);
  return res.ok ? [] : res.problems;
}

describe('validateLevel', () => {
  it('принимает корректный уровень', () => {
    const res = validateLevel(base());
    expect(res.ok).toBe(true);
  });

  it('ловит строку неверной длины', () => {
    const raw = base() as { map: string[] };
    raw.map = [...raw.map];
    raw.map[0] = '....';
    expect(problemsOf(raw).some((p) => p.includes('строка 1') && p.includes('13'))).toBe(true);
  });

  it('ловит неизвестный символ', () => {
    const raw = base() as { map: string[] };
    raw.map = [...raw.map];
    raw.map[2] = '..X..........';
    expect(problemsOf(raw).some((p) => p.includes('неизвестный символ «X»'))).toBe(true);
  });

  it('ловит базу не 2×2', () => {
    const raw = base() as { map: string[] };
    raw.map = [...raw.map];
    raw.map[12] = '.....#E.#....';
    expect(problemsOf(raw).some((p) => p.includes('база'))).toBe(true);
  });

  it('ловит отсутствие точки игрока', () => {
    const raw = base();
    delete raw.player;
    expect(problemsOf(raw).some((p) => p.includes('player'))).toBe(true);
  });

  it('ловит точку появления в препятствии', () => {
    const raw = base();
    raw.player = { x: 5, y: 11 }; // клетка с кирпичом
    expect(problemsOf(raw).some((p) => p.includes('непроходима'))).toBe(true);
  });

  it('ловит точку появления врага вне поля', () => {
    const raw = base();
    raw.enemySpawns = [{ x: 13, y: 0 }];
    expect(problemsOf(raw).some((p) => p.includes('за пределами поля'))).toBe(true);
  });

  it('ловит состав врагов не из 20 записей и неизвестный тип', () => {
    const raw = base();
    raw.enemies = ['B', 'Z'];
    const p = problemsOf(raw);
    expect(p.some((x) => x.includes('ровно 20'))).toBe(true);
    expect(p.some((x) => x.includes('неизвестный тип «Z»'))).toBe(true);
  });

  it('ловит отсутствие точек появления врагов', () => {
    const raw = base();
    raw.enemySpawns = [];
    expect(problemsOf(raw).some((p) => p.includes('enemySpawns'))).toBe(true);
  });
});

describe('World из уровня', () => {
  it('находит базу и точку игрока из данных', () => {
    const res = validateLevel(base());
    if (!res.ok) throw new Error(res.problems.join('; '));
    const w = World.fromLevel(res.level);
    expect(w.base).toEqual({ x: 6, y: 11 });
    expect(w.playerSpawn).toEqual({ x: 4, y: 12 });
    expect(w.isTankPassableAt(5, 11)).toBe(false);
    expect(w.isTankPassableAt(0, 0)).toBe(true);
  });
});
