import { FIELD_ORIGIN, TILE_PX, fpToPx } from '../config/geometry';
import { LEVEL_SIZE } from '../config/tiles';
import type { World } from '../world/world';

const FIELD_PX = LEVEL_SIZE * TILE_PX;

/**
 * Отладочный оверлей (F4): границы тайлов, линии выравнивания 8 px и хитбокс танка.
 * Не меняет состояние мира.
 */
export function drawDebug(ctx: CanvasRenderingContext2D, world: World): void {
  // Границы тайлов.
  ctx.fillStyle = 'rgba(0, 255, 255, 0.35)';
  for (let t = 0; t <= LEVEL_SIZE; t++) {
    ctx.fillRect(FIELD_ORIGIN + t * TILE_PX, FIELD_ORIGIN, 1, FIELD_PX);
    ctx.fillRect(FIELD_ORIGIN, FIELD_ORIGIN + t * TILE_PX, FIELD_PX, 1);
  }

  // Промежуточные линии выравнивания (8 px), которых нет на границах тайлов.
  ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
  for (let k = 1; k < LEVEL_SIZE * 2; k += 2) {
    ctx.fillRect(FIELD_ORIGIN + k * 8, FIELD_ORIGIN, 1, FIELD_PX);
    ctx.fillRect(FIELD_ORIGIN, FIELD_ORIGIN + k * 8, FIELD_PX, 1);
  }

  // Хитбокс танка игрока.
  const x = fpToPx(world.player.x);
  const y = fpToPx(world.player.y);
  ctx.strokeStyle = '#f0f';
  ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
}
