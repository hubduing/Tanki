import { fpToPx } from '../config/geometry';
import type { Tank } from '../world/tank';
import { PLAYER_PALETTE, drawTankSprite } from './sprites';

/** Танк игрока: пиксельный спрайт 16×16 с гусеницами и башней. Мигает при неуязвимости. */
export function drawTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
  const x = fpToPx(tank.x);
  const y = fpToPx(tank.y);
  // Неуязвимость (каска, возрождение) — мигание, как в оригинале.
  if (tank.invuln > 0 && Math.floor(tank.invuln / 4) % 2 === 0) return;
  drawTankSprite(ctx, x, y, tank.dir, PLAYER_PALETTE);
}
