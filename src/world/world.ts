import { BRICK_FULL, LEVEL_SIZE, TILE_CHARS, isTankPassable, type TileKind } from '../config/tiles';
import { FIELD_ORIGIN_FP, TILE_FP } from '../config/geometry';
import { STEP_HZ } from '../config/balance';
import { Rng } from '../core/rng';
import type { Level, TilePoint } from '../levels/format';
import { Tank } from './tank';
import type { Bullet } from './bullets';
import type { WorldEvent } from './events';

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
  /** Танк игрока; позиция в fixed-point, см. config/geometry. */
  readonly player: Tank;
  /** Танки врагов. Спавн появится на M5; пока список заполняют тесты. */
  enemies: Tank[] = [];
  /** Пули всех владельцев. */
  bullets: Bullet[] = [];
  /** База цела; после разрушения пули пролетают сквозь руины. */
  baseAlive = true;
  /** Шагов до следующего спавна врага. */
  spawnTimer: number;
  /** Индекс следующей точки появления врагов (по кругу). */
  nextSpawn = 0;
  /** Детерминированный генератор, общий для ИИ и спавна (PLAN.md, D5). */
  readonly rng: Rng;
  private pendingEvents: WorldEvent[] = [];

  private constructor(level: Level, seed: number) {
    this.rng = new Rng(seed);
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
    this.spawnTimer = Math.round(level.spawnIntervalSec * STEP_HZ);
    this.player = new Tank(
      FIELD_ORIGIN_FP + level.player.x * TILE_FP,
      FIELD_ORIGIN_FP + level.player.y * TILE_FP,
      'up',
    );
  }

  /** Создаёт мир из валидированного уровня. Seed задаёт весь случайный ход игры. */
  static fromLevel(level: Level, seed = level.number * 7919): World {
    return new World(level, seed);
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

  /** Записывает событие для звука и эффектов. */
  emit(e: WorldEvent): void {
    this.pendingEvents.push(e);
  }

  /** Забирает накопленные события и очищает очередь. */
  drainEvents(): WorldEvent[] {
    const out = this.pendingEvents;
    this.pendingEvents = [];
    return out;
  }

  /** Разрушает базу: состояние меняется один раз, событие — тоже. */
  destroyBase(): void {
    if (!this.baseAlive) return;
    this.baseAlive = false;
    this.emit({ type: 'baseDestroyed', x: this.base.x * 16 + 16, y: this.base.y * 16 + 16 });
  }
}
