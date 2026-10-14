import { LEVEL_SIZE } from '../config/tiles';
import type { World } from '../world/world';

/** Смещение поля на логическом экране: (8, 8) px (PLAN.md, раздел 3.3). */
export const FIELD_ORIGIN = 8;
export const TILE_PX = 16;
const HALF = TILE_PX / 2;

const COLORS = {
  brick: '#b5501e',
  steel: '#b8c4d0',
  water: '#2140c4',
  ice: '#cdeeff',
  forest: '#1f7a1f',
  base: '#e8c040',
};

/**
 * Рисует нижний слой карты: всё, кроме леса. Лес рисуется отдельно поверх танков
 * (drawForestLayer), поэтому здесь его нет.
 */
export function drawMapBase(ctx: CanvasRenderingContext2D, world: World): void {
  for (let y = 0; y < LEVEL_SIZE; y++) {
    for (let x = 0; x < LEVEL_SIZE; x++) {
      const t = world.tileAt(x, y)!;
      const px = FIELD_ORIGIN + x * TILE_PX;
      const py = FIELD_ORIGIN + y * TILE_PX;
      switch (t.kind) {
        case 'empty':
        case 'forest':
          break;
        case 'brick':
          drawBrick(ctx, px, py, t.brickMask);
          break;
        case 'steel':
          ctx.fillStyle = COLORS.steel;
          ctx.fillRect(px, py, TILE_PX, TILE_PX);
          break;
        case 'water':
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(px, py, TILE_PX, TILE_PX);
          break;
        case 'ice':
          ctx.fillStyle = COLORS.ice;
          ctx.fillRect(px, py, TILE_PX, TILE_PX);
          break;
        case 'base':
          // Рисуем всю базу 2×2 одним блоком из левого верхнего угла (см. drawBase).
          break;
      }
    }
  }
  drawBase(ctx, world);
}

/** Верхний слой: лес, рисуется после танков и пуль. */
export function drawForestLayer(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.fillStyle = COLORS.forest;
  for (let y = 0; y < LEVEL_SIZE; y++) {
    for (let x = 0; x < LEVEL_SIZE; x++) {
      if (world.tileAt(x, y)!.kind === 'forest') {
        ctx.fillRect(FIELD_ORIGIN + x * TILE_PX, FIELD_ORIGIN + y * TILE_PX, TILE_PX, TILE_PX);
      }
    }
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, px: number, py: number, mask: number): void {
  ctx.fillStyle = COLORS.brick;
  // Квадранты: бит 0 — TL, 1 — TR, 2 — BL, 3 — BR. Цел — рисуем кирпичом.
  const quads: Array<[number, number]> = [
    [0, 0],
    [HALF, 0],
    [0, HALF],
    [HALF, HALF],
  ];
  quads.forEach(([dx, dy], i) => {
    if (mask & (1 << i)) ctx.fillRect(px + dx, py + dy, HALF, HALF);
  });
}

function drawBase(ctx: CanvasRenderingContext2D, world: World): void {
  const { x, y } = world.base;
  const px = FIELD_ORIGIN + x * TILE_PX;
  const py = FIELD_ORIGIN + y * TILE_PX;
  ctx.fillStyle = COLORS.base;
  ctx.fillRect(px, py, TILE_PX * 2, TILE_PX * 2);
}
