import { BULLET_PX } from '../config/balance';
import type { World } from '../world/world';

/** Пули: игрока — белые, врага — красные. Спрайты и эффекты взрывов — M9. */
export function drawBullets(ctx: CanvasRenderingContext2D, world: World): void {
  for (const b of world.bullets) {
    ctx.fillStyle = b.owner === 'player' ? '#fff' : '#f66';
    ctx.fillRect(b.x, b.y, BULLET_PX, BULLET_PX);
  }
}
