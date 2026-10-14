import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../../src/levels/validate';
import { World } from '../../src/world/world';
import { stepWorld, type PlayerIntent } from '../../src/world/step';
import { FP } from '../../src/config/geometry';
import { MAX_ENEMIES_ON_FIELD } from '../../src/config/enemies';

/**
 * Прогон симуляций по всем встроенным уровням (PLAN.md, 6.3 и задача M9 «прогон
 * симуляций для подбора баланса»). Мир крутится без графики, поэтому тысячи шагов
 * стоят миллисекунды.
 */

const dir = join(process.cwd(), 'public', 'levels');
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

/** Загружает уровень из public/levels через тот же валидатор, что и игра. */
function loadLevel(file: string): World {
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown;
  const res = validateLevel(raw);
  if (!res.ok) throw new Error(`${file}: ${res.problems.join('; ')}`);
  return World.fromLevel(res.level);
}

/** Простой бот: идёт к ближайшему врагу и стреляет, когда тот на линии. */
function botIntent(w: World): PlayerIntent {
  const p = w.player;
  if (w.playerDown) return { dir: null, fire: false };
  const pcx = p.x / FP + 8;
  const pcy = p.y / FP + 8;
  let best: { cx: number; cy: number } | null = null;
  let bestD = Infinity;
  for (const e of w.enemies) {
    if (e.spawning > 0) continue;
    const cx = e.x / FP + 8;
    const cy = e.y / FP + 8;
    const d = Math.abs(cx - pcx) + Math.abs(cy - pcy);
    if (d < bestD) {
      bestD = d;
      best = { cx, cy };
    }
  }
  if (!best) return { dir: null, fire: false };
  const dx = best.cx - pcx;
  const dy = best.cy - pcy;
  if (Math.abs(dx) < 10) return { dir: dy > 0 ? 'down' : 'up', fire: true };
  if (Math.abs(dy) < 10) return { dir: dx > 0 ? 'right' : 'left', fire: true };
  if (Math.abs(dx) > Math.abs(dy)) return { dir: dx > 0 ? 'right' : 'left', fire: true };
  return { dir: dy > 0 ? 'down' : 'up', fire: true };
}

interface Run {
  outcome: string;
  steps: number;
  killed: number;
  score: number;
  lives: number;
  baseAlive: boolean;
  maxEnemies: number;
}

/** Прокручивает уровень до итога или до лимита шагов. */
function simulate(w: World, mode: 'idle' | 'bot', maxSteps: number): Run {
  let maxEnemies = 0;
  let steps = 0;
  while (steps < maxSteps && w.outcome === 'playing') {
    stepWorld(w, mode === 'idle' ? { dir: null, fire: false } : botIntent(w));
    maxEnemies = Math.max(maxEnemies, w.enemies.length);
    steps++;
  }
  return {
    outcome: w.outcome,
    steps,
    killed: w.killed,
    score: w.score,
    lives: w.lives,
    baseAlive: w.baseAlive,
    maxEnemies,
  };
}

describe('Баланс: прогон всех уровней (PLAN.md, M9)', () => {
  it('таблица прогонов: 12 уровней, бот и «игрок стоит»', () => {
    const rows: string[] = [];
    for (const file of files) {
      const idle = simulate(loadLevel(file), 'idle', 20_000);
      const bot = simulate(loadLevel(file), 'bot', 20_000);
      rows.push(
        `${file} | idle: ${idle.outcome} за ${idle.steps} шагов (${(idle.steps / 60).toFixed(0)} с) | ` +
          `bot: ${bot.outcome} за ${bot.steps} шагов, убито ${bot.killed}/20, очки ${bot.score}, ` +
          `жизни ${bot.lives}, база ${bot.baseAlive ? 'цела' : 'разрушена'}, макс врагов ${bot.maxEnemies}`,
      );
    }
    console.log('\n' + rows.join('\n') + '\n');
    expect(files.length).toBe(12);
  });

  it('в каждом уровне лимит врагов на поле соблюдается', () => {
    for (const file of files) {
      const bot = simulate(loadLevel(file), 'bot', 20_000);
      expect(bot.maxEnemies, `${file}: врагов на поле больше лимита`).toBeLessThanOrEqual(
        MAX_ENEMIES_ON_FIELD,
      );
    }
  });
});
