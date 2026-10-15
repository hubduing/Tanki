import { TANK_PX, fpToPx } from '../config/geometry';
import type { Tank } from '../world/tank';
import { PLAYER_PALETTE, drawTankSpriteScaled } from './sprites';

/** Танк игрока и напарника: спрайт физического размера TANK_PX. Мигает при неуязвимости. */
export function drawTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
  // Неуязвимость (каска, возрождение) — мигание, как в оригинале.
  if (tank.invuln > 0 && Math.floor(tank.invuln / 4) % 2 === 0) return;
  drawTankSpriteScaled(ctx, fpToPx(tank.x), fpToPx(tank.y), TANK_PX, tank.dir, PLAYER_PALETTE);
}
