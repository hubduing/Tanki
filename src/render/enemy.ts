import { fpToPx } from '../config/geometry';
import type { Tank } from '../world/tank';

/** Цвета врагов по типу: обычный, быстрый, мощный, бронированный. */
const COLORS: Record<string, string> = {
  B: '#bbb',
  F: '#8cf',
  P: '#f9a',
  A: '#9c6',
};

/**
 * Временная отрисовка врага: квадрат 16×16 цвета типа. У появляющегося врага
 * мигание, чтобы было видно анимацию появления. Спрайты — позже (M9).
 */
export function drawEnemy(ctx: CanvasRenderingContext2D, e: Tank): void {
  const x = fpToPx(e.x);
  const y = fpToPx(e.y);
  if (e.spawning > 0 && Math.floor(e.spawning / 4) % 2 === 0) return;
  ctx.fillStyle = COLORS[e.kind as string] ?? '#fff';
  ctx.fillRect(x, y, 16, 16);
  // Бронированный враг темнеет по мере потери здоровья.
  if (e.kind === 'A' && e.health < 4) {
    ctx.fillStyle = e.health >= 2 ? '#585' : '#363';
    ctx.fillRect(x + 4, y + 4, 8, 8);
  }
}
