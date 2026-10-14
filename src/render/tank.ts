import { fpToPx } from '../config/geometry';
import type { Tank } from '../world/tank';

const BODY = '#c8a000';
const TRACK = '#5a4a00';
const HIGHLIGHT = '#ffe060';
const BARREL = '#222';

/** Временная отрисовка танка: квадрат 16×16 со стволом. Спрайты — позже (M9). */
export function drawTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
  const x = fpToPx(tank.x);
  const y = fpToPx(tank.y);

  ctx.fillStyle = BODY;
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = TRACK;
  if (tank.dir === 'left' || tank.dir === 'right') {
    ctx.fillRect(x, y, 16, 2);
    ctx.fillRect(x, y + 14, 16, 2);
  } else {
    ctx.fillRect(x, y, 2, 16);
    ctx.fillRect(x + 14, y, 2, 16);
  }
  ctx.fillStyle = HIGHLIGHT;
  ctx.fillRect(x + 4, y + 4, 8, 8);

  ctx.fillStyle = BARREL;
  switch (tank.dir) {
    case 'up':
      ctx.fillRect(x + 7, y - 2, 2, 4);
      break;
    case 'down':
      ctx.fillRect(x + 7, y + 14, 2, 4);
      break;
    case 'left':
      ctx.fillRect(x - 2, y + 7, 4, 2);
      break;
    case 'right':
      ctx.fillRect(x + 14, y + 7, 4, 2);
      break;
  }
}
