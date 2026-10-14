import type { Level } from '../../src/levels/format';
import { FIELD_ORIGIN, FP, TILE_PX } from '../../src/config/geometry';
import { World } from '../../src/world/world';

/** Собирает мир из строк сетки (недостающие строки и символы — пустые клетки). */
export function worldFromRows(rows: string[], seed = 1): World {
  const map = Array.from({ length: 13 }, (_, y) => (rows[y] ?? '').padEnd(13, '.'));
  const level: Level = {
    number: 1,
    palette: 0,
    spawnIntervalSec: 2,
    enemies: Array<string>(20).fill('B'),
    player: { x: 0, y: 0 },
    enemySpawns: [{ x: 12, y: 0 }],
    map,
  };
  return World.fromLevel(level, seed);
}

/** Координата левого края тайла в пикселях экрана. */
export function tilePx(tile: number): number {
  return FIELD_ORIGIN + tile * TILE_PX;
}

/** Ставит танк игрока в пиксели экрана (целые). */
export function placeTank(world: World, xPx: number, yPx: number): void {
  world.player.x = xPx * FP;
  world.player.y = yPx * FP;
}

/** Текущая позиция танка в пикселях (целое, без дробной части fp). */
export function tankPx(world: World): { x: number; y: number } {
  return { x: world.player.x / FP, y: world.player.y / FP };
}
