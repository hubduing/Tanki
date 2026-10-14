import { fpToPx } from '../config/geometry';
import type { Tank } from '../world/tank';
import { ENEMY_PALETTES, drawTankSprite } from './sprites';

/**
 * Враг: пиксельный спрайт своего типа. У появляющегося врага мигание, у бронированного
 * палитра темнеет по мере потери здоровья (PLAN.md, приложение Б).
 */
export function drawEnemy(ctx: CanvasRenderingContext2D, e: Tank): void {
  const x = fpToPx(e.x);
  const y = fpToPx(e.y);
  if (e.spawning > 0 && Math.floor(e.spawning / 4) % 2 === 0) return;
  const base = ENEMY_PALETTES[e.kind as string] ?? ENEMY_PALETTES.B;
  const palette =
    e.kind === 'A' && e.health < 4
      ? { ...base, hull: e.health >= 2 ? '#6a6a3a' : '#4a4a2a' }
      : base;
  drawTankSprite(ctx, x, y, e.dir, palette);
}
