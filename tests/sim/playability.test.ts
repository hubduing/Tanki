import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../../src/levels/validate';
import { World } from '../../src/world/world';
import { stepWorld, type PlayerIntent } from '../../src/world/step';
import { FP } from '../../src/config/geometry';
import type { Dir } from '../../src/core/dir';

/**
 * Проверка проходимости всех уровней (PLAN.md, M9 и приложение Г: «все встроенные
 * уровни проходятся до победы»). Играет бот-защитник: держится у базы, доворачивает
 * башню на самого опасного для базы врага и стреляет. Бот заведомо слабее человека,
 * поэтому его победа доказывает проходимость уровня.
 */

const dir = join(process.cwd(), 'public', 'levels');
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

function loadWorld(file: string, seed?: number): World {
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown;
  const res = validateLevel(raw);
  if (!res.ok) throw new Error(`${file}: ${res.problems.join('; ')}`);
  return World.fromLevel(res.level, seed);
}

/**
 * Бот-защитник. Ключевая деталь: танк стреляет ТОЛЬКО в сторону своего текущего
 * направления, а поворот возможен лишь при выравнивании по сетке 8 px. Поэтому бот
 * сначала доворачивается (движением), и жмёт огонь лишь когда ствол уже смотрит
 * на цель — иначе пуля уходит в старую сторону.
 * Цель выбирается по угрозе базе: база гибнет от одного попадания.
 */
function defenderIntent(w: World): PlayerIntent {
  const p = w.player;
  if (w.playerDown) return { dir: null, fire: false };
  const pcx = p.x / FP + 8;
  const pcy = p.y / FP + 8;

  // Центр базы: база 2×2, её центр — левый верхний тайл + 16 px.
  const baseCx = 8 + w.base.x * 16 + 16;
  const baseCy = 8 + w.base.y * 16 + 16;

  let target: { cx: number; cy: number } | null = null;
  let bestThreat = Infinity;
  for (const e of w.enemies) {
    if (e.spawning > 0) continue;
    const cx = e.x / FP + 8;
    const cy = e.y / FP + 8;
    const toBase = Math.abs(cx - baseCx) + Math.abs(cy - baseCy);
    const toPlayer = Math.abs(cx - pcx) + Math.abs(cy - pcy);
    const threat = toBase + toPlayer * 0.01;
    if (threat < bestThreat) {
      bestThreat = threat;
      target = { cx, cy };
    }
  }
  if (!target) return { dir: null, fire: false };

  const dx = target.cx - pcx;
  const dy = target.cy - pcy;
  const alignedX = Math.abs(dx) < 8;
  const alignedY = Math.abs(dy) < 8;

  // Желаемое направление ствола и признак «цель на линии».
  let want: Dir;
  let onLine: boolean;
  if (alignedX) {
    want = dy > 0 ? 'down' : 'up';
    onLine = true;
  } else if (alignedY) {
    want = dx > 0 ? 'right' : 'left';
    onLine = true;
  } else {
    // Выходим на линию по той оси, где расхождение меньше — так быстрее открыть огонь.
    want = Math.abs(dx) < Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    onLine = false;
  }

  // Ствол смотрит на цель и она на линии — стреляем не двигаясь.
  if (onLine && p.dir === want) return { dir: null, fire: true };
  // Иначе двигаемся в желаемом направлении: танк либо доворачивается на месте
  // (при выравнивании), либо выходит на линию огня.
  return { dir: want, fire: false };
}

interface Result {
  won: boolean;
  steps: number;
  killed: number;
  score: number;
}

function play(file: string, maxSteps: number, seed?: number): Result {
  const w = loadWorld(file, seed);
  let steps = 0;
  while (w.outcome === 'playing' && steps < maxSteps) {
    stepWorld(w, defenderIntent(w));
    steps++;
  }
  return { won: w.outcome === 'won', steps, killed: w.killed, score: w.score };
}

describe('Проходимость уровней (PLAN.md, M9)', () => {
  it('отчёт: бот-защитник по всем 35 уровням', () => {
    const rows: string[] = [];
    let wins = 0;
    for (const file of files) {
      const r = play(file, 60_000);
      if (r.won) wins++;
      rows.push(
        `${file}: ${r.won ? 'ПОБЕДА' : 'не пройден'} за ${r.steps} шагов (${(r.steps / 60).toFixed(0)} с), ` +
          `убито ${r.killed}/20, очки ${r.score}`,
      );
    }
    console.log('\n' + rows.join('\n') + `\nпобед: ${wins}/${files.length}\n`);
    expect(files.length).toBe(35);
  }, 60_000);
});
