import { BONUS } from '../config/bonuses';
import { fpToPx } from '../config/geometry';
import type { World } from '../world/world';

/** Цвет значка по коду бонуса. Спрайты — позже (M9). */
const COLORS: Record<string, string> = {
  S: '#ff6',
  G: '#8f8',
  H: '#8cf',
  L: '#ca8',
  T: '#f88',
  C: '#c8f',
};

/**
 * Бонусы на карте: квадрат 16×16 цвета типа. За последние ~3 с мигает,
 * чтобы игрок успел подобрать (PLAN.md, 3.7).
 */
export function drawBonuses(ctx: CanvasRenderingContext2D, world: World): void {
  for (const b of world.bonuses) {
    if (b.life <= BONUS.blinkSteps && Math.floor(b.life / 6) % 2 === 0) continue;
    ctx.fillStyle = COLORS[b.code] ?? '#fff';
    ctx.fillRect(fpToPx(b.x), fpToPx(b.y), 16, 16);
  }
}
