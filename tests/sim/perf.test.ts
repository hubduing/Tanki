import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../../src/levels/validate';
import { World } from '../../src/world/world';
import { stepWorld } from '../../src/world/step';
import { spawnEffects } from '../../src/world/effects';

/**
 * Замер производительности логики (PLAN.md, M9 и приложение Г).
 * 10 минут игры — это 36 000 логических шагов. Здесь меряется реальное время
 * этих шагов на самом тяжёлом уровне: полная очередь спавна, четыре врага,
 * пули, эффекты и бонусы. Бюджет одного шага при 60 Гц — 16,67 мс.
 */

const dir = join(process.cwd(), 'public', 'levels');

/** Собирает мир уровня с бесконечной очередью, чтобы прогон шёл на полной нагрузке. */
function loadedWorld(file: string): World {
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown;
  const res = validateLevel(raw);
  if (!res.ok) throw new Error(`${file}: ${res.problems.join('; ')}`);
  const w = World.fromLevel(res.level);
  w.lives = 999;
  // Очередь не заканчивается: победа не прервёт замер.
  w.enemyQueue.length = 0;
  const mix = ['B', 'F', 'P', 'A'];
  for (let i = 0; i < 5000; i++) w.enemyQueue.push(mix[i % mix.length]);
  return w;
}

describe('Производительность логики (PLAN.md, M9)', () => {
  it('10 минут логики укладываются в бюджет 60 Гц', () => {
    const STEPS = 36_000; // 10 минут при 60 Гц
    const BUDGET_MS_PER_STEP = 1000 / 60;
    const rows: string[] = [];

    for (const file of ['01.json', '07.json', '12.json']) {
      const w = loadedWorld(file);
      const t0 = performance.now();
      for (let i = 0; i < STEPS; i++) {
        stepWorld(w, { dir: 'up', fire: true });
        spawnEffects(w, w.drainEvents());
      }
      const elapsed = performance.now() - t0;
      const perStep = elapsed / STEPS;
      const load = (perStep / BUDGET_MS_PER_STEP) * 100;
      rows.push(
        `${file}: ${STEPS} шагов за ${elapsed.toFixed(0)} мс = ${perStep.toFixed(4)} мс/шаг ` +
          `(${load.toFixed(1)}% бюджета кадра 16.67 мс), запас ${(BUDGET_MS_PER_STEP / perStep).toFixed(0)}x`,
      );

      // Логика обязана укладываться в бюджет кадра с большим запасом.
      expect(perStep, `${file}: шаг логики дольше бюджета кадра`).toBeLessThan(BUDGET_MS_PER_STEP);
    }
    console.log('\n' + rows.join('\n') + '\n');
  });
});
