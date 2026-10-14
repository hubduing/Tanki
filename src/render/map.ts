import { LEVEL_SIZE } from '../config/tiles';
import type { World } from '../world/world';
import { drawBaseSprite, drawBrickQuadrant, drawTile } from './sprites';

/** Смещение поля на логическом экране: (8, 8) px (PLAN.md, раздел 3.3). */
export const FIELD_ORIGIN = 8;
export const TILE_PX = 16;

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
        case 'base':
          // База рисуется отдельно блоком 2×2 (drawBaseSprite).
          break;
        case 'brick':
          for (let q = 0; q < 4; q++) {
            if (t.brickMask & (1 << q)) drawBrickQuadrant(ctx, px, py, q);
          }
          break;
        case 'steel':
          drawTile(ctx, 'steel', px, py);
          break;
        case 'water':
          drawTile(ctx, 'water', px, py);
          break;
        case 'ice':
          drawTile(ctx, 'ice', px, py);
          break;
      }
    }
  }
  drawBaseSprite(ctx, FIELD_ORIGIN + world.base.x * TILE_PX, FIELD_ORIGIN + world.base.y * TILE_PX, world.baseAlive);
}

/** Верхний слой: лес, рисуется после танков и пуль. */
export function drawForestLayer(ctx: CanvasRenderingContext2D, world: World): void {
  for (let y = 0; y < LEVEL_SIZE; y++) {
    for (let x = 0; x < LEVEL_SIZE; x++) {
      if (world.tileAt(x, y)!.kind === 'forest') {
        drawTile(ctx, 'forest', FIELD_ORIGIN + x * TILE_PX, FIELD_ORIGIN + y * TILE_PX);
      }
    }
  }
}
