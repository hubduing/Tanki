import type { World } from '../world/world';

/** Ширина правой панели HUD в логических пикселях. Поле карты остаётся 240 px. */
export const HUD_WIDTH = 16;

/**
 * Панель справа: номер уровня, жизни, врагов осталось. Счёт выводится в
 * углу экрана итогов, а не здесь. Значения читаются из мира, ничего не кешируется.
 */
export function drawHud(ctx: CanvasRenderingContext2D, world: World, x0: number): void {
  ctx.fillStyle = '#333';
  ctx.fillRect(x0, 0, HUD_WIDTH, 224);
  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';

  // Врагов осталось: в очереди плюс живые на поле. Маленькие квадраты по два в ряд.
  const left = world.enemyQueue.length + world.enemies.length;
  for (let i = 0; i < left && i < 20; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    ctx.fillRect(x0 + 2 + col * 6, 8 + row * 6, 4, 4);
  }

  // Жизни внизу панели, значок — маленький танк.
  ctx.fillText(String(world.lives), x0 + HUD_WIDTH / 2, 200);
  ctx.fillText(String(world.levelNumber), x0 + HUD_WIDTH / 2, 216);
  ctx.textAlign = 'start';
}
