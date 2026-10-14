import { BRICK_FULL, LEVEL_SIZE, TILE_CHARS, isTankPassable, type TileKind } from '../config/tiles';
import type { Level, TilePoint } from '../levels/format';

export interface Tile {
  kind: TileKind;
  /** Для кирпича: 4 бита квадрантов 8×8 (1 — цел). Для остальных не используется. */
  brickMask: number;
}

/**
 * Мир уровня: сетка тайлов и служебные данные. Не рисует и не знает о вводе
 * (PLAN.md, раздел 3.2). Сущности (танки, пули) добавятся на M3–M5.
 */
export class World {
  readonly size = LEVEL_SIZE;
  readonly tiles: Tile[];
  /** Левый верхний тайл базы 2×2. */
  readonly base: TilePoint;
  readonly playerSpawn: TilePoint;
  readonly enemySpawns: TilePoint[];
  readonly enemyQueue: string[];
  readonly spawnIntervalSec: number;

  private constructor(level: Level) {
    this.tiles = [];
    let minX = Infinity;
    let minY = Infinity;
    for (let y = 0; y < LEVEL_SIZE; y++) {
      for (let x = 0; x < LEVEL_SIZE; x++) {
        const kind = TILE_CHARS[level.map[y][x]];
        this.tiles.push({ kind, brickMask: BRICK_FULL });
        if (kind === 'base') {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        }
      }
    }
    this.base = { x: minX, y: minY };
    this.playerSpawn = { ...level.player };
    this.enemySpawns = level.enemySpawns.map((p) => ({ ...p }));
    this.enemyQueue = [...level.enemies];
    this.spawnIntervalSec = level.spawnIntervalSec;
  }

  /** Создаёт мир из валидированного уровня. */
  static fromLevel(level: Level): World {
    return new World(level);
  }

  tileAt(x: number, y: number): Tile | undefined {
    if (x < 0 || y < 0 || x >= LEVEL_SIZE || y >= LEVEL_SIZE) return undefined;
    return this.tiles[y * LEVEL_SIZE + x];
  }

  /** Проходимость для танка: вне поля, база и препятствия — нет. */
  isTankPassableAt(x: number, y: number): boolean {
    const t = this.tileAt(x, y);
    return t !== undefined && isTankPassable(t.kind);
  }
}
