import type { World } from '../world/world';
import { drawBulletSprite } from './sprites';

/** Пули: белые — игрока, оранжевые — врага. */
export function drawBullets(ctx: CanvasRenderingContext2D, world: World): void {
  for (const b of world.bullets) {
    drawBulletSprite(ctx, b.x, b.y, b.owner);
  }
}
