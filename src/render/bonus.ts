import { BONUS } from '../config/bonuses';
import { fpToPx } from '../config/geometry';
import type { World } from '../world/world';
import { drawBonusSprite } from './sprites';

/** Цвет рамки значка по коду бонуса. */
const COLORS: Record<string, string> = {
  S: '#ffe040',
  G: '#60e060',
  H: '#60c0ff',
  L: '#d0a060',
  T: '#ff7070',
  C: '#c080ff',
};

/**
 * Бонусы на карте: значок 16×16 с буквой. За последние ~3 с мигает,
 * чтобы игрок успел подобрать (PLAN.md, 3.7).
 */
export function drawBonuses(ctx: CanvasRenderingContext2D, world: World): void {
  for (const b of world.bonuses) {
    if (b.life <= BONUS.blinkSteps && Math.floor(b.life / 6) % 2 === 0) continue;
    drawBonusSprite(ctx, fpToPx(b.x), fpToPx(b.y), b.code, COLORS[b.code] ?? '#ffffff');
  }
}
