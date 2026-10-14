import type { Effect } from '../world/effects';
import type { World } from '../world/world';
import { drawExplosionSprite, drawSparkSprite, drawFloatTextSprite } from './sprites';

const EFFECT_LIFETIME: Record<Effect['kind'], number> = {
  spark: 10,
  explosion: 24,
  score: 48,
};

/** Рисует активные визуальные эффекты мира (взрывы, искры, всплывающие очки). */
export function drawEffects(ctx: CanvasRenderingContext2D, world: World): void {
  for (const e of world.effects) {
    const maxLife = EFFECT_LIFETIME[e.kind] ?? 1;
    if (e.kind === 'explosion') {
      drawExplosionSprite(ctx, e.cx, e.cy, e.life, maxLife);
    } else if (e.kind === 'score') {
      // Для всплывающих очков смещаем вверх по мере жизни.
      const offsetY = Math.round(-(1 - e.life / maxLife) * 10);
      drawFloatTextSprite(ctx, e.cx, e.cy + offsetY, e.text ?? '', e.life, maxLife, e.color ?? '#fff4d6');
    } else {
      drawSparkSprite(ctx, e.cx, e.cy, e.life, maxLife);
    }
  }
}
