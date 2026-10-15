import { BRICK_FULL, LEVEL_SIZE, TILE_CHARS, isTankPassable, type TileKind } from '../config/tiles';
import { FIELD_ORIGIN_FP, TILE_FP } from '../config/geometry';
import { STEP_HZ } from '../config/balance';
import { ALLY_SPAWNS_PER_LEVEL, RESPAWN_DELAY_STEPS, START_LIVES } from '../config/rules';
import { ENEMY_TYPES, type EnemyCode } from '../config/enemies';
import type { Bonus } from './bonus';
import { Rng } from '../core/rng';
import type { Level, TilePoint } from '../levels/format';
import { Tank } from './tank';
import type { Bullet } from './bullets';
import type { Effect } from './effects';
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
  /** Таблица базы (один тайл). */
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
  /** Номер уровня (для HUD). */
  readonly levelNumber: number;
  /** Жизни игрока, включая текущую. */
  lives: number = START_LIVES;
  /** Очки за уничтоженных врагов. */
  score = 0;
  /** Уничтожено врагов. */
  killed = 0;
  /** Итог уровня; меняется один раз. */
  outcome: LevelOutcome = 'playing';
  /** Бонусы на карте. */
  bonuses: Bonus[] = [];
  /** Визуальные эффекты (взрывы, искры) — создаются из событий, живут по таймеру. */
  effects: Effect[] = [];
  /** Сколько врагов уже появилось; нужно для выбора «помеченных» врагов с бонусом. */
  spawnedCount = 0;
  /** Шагов заморозки врагов (бонус «таймер»); 0 — не заморожены. */
  freezeTimer = 0;
  /** Шагов стальной базы (бонус «лопата»); 0 — обычная кирпичная. */
  shovelTimer = 0;
  /** Игрок погиб и ждёт возрождения. */
  playerDown = false;
  /** Шагов до возрождения, пока playerDown. */
  respawnTimer = 0;
  /** Напарник-ИИ; null, пока не появился или когда погиб без оставшихся появлений. */
  ally: Tank | null = null;
  /** Сколько раз ещё можно выпустить напарника на этом уровне (до ALLY_SPAWNS_PER_LEVEL). */
  allySpawnsLeft = ALLY_SPAWNS_PER_LEVEL;
  /** Шагов до появления напарника после гибели; 0 — не ждёт. */
  allyRespawnTimer = 0;
  /** События текущего кадра для звука; наполняются из pendingEvents при создании эффектов. */
  private pendingEvents: WorldEvent[] = [];

  private constructor(level: Level, seed: number) {
    this.rng = new Rng(seed);
    this.levelNumber = level.number;
    this.tiles = [];
    let baseX = -1;
    let baseY = -1;
    for (let y = 0; y < LEVEL_SIZE; y++) {
      for (let x = 0; x < LEVEL_SIZE; x++) {
        const kind = TILE_CHARS[level.map[y][x]];
        this.tiles.push({ kind, brickMask: BRICK_FULL });
        if (kind === 'base') {
          if (baseX === -1 && baseY === -1) {
            baseX = x;
            baseY = y;
          } else {
            // More than one base tile should be caught by validation.
            // We'll just keep the first one.
          }
        }
      }
    }
    this.base = { x: baseX, y: baseY };
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

  /**
   * Забирает накопленные события кадра для звука и визуальных эффектов
   * (PLAN.md, 3.4 шаг 9) и очищает буфер.
   */
  drainEvents(): WorldEvent[] {
    const out = this.pendingEvents;
    this.pendingEvents = [];
    return out;
  }

  /**
   * Лопата: вокруг базы на время стальные тайлы, после истечения — кирпич.
   * Тайлы 2×2 вокруг базы меняются на сталь и обратно; состояние проверяется в шаге.
   */
  setBaseSteel(steps: number): void {
    this.shovelTimer = steps;
    this.applyShovel(true);
  }

  /** Заменяет тайлы вокруг базы на сталь или кирпич. Вызывается при старте и окончании лопаты. */
  applyShovel(steel: boolean): void {
    const ring: Array<[number, number]> = [];
    for (let x = this.base.x - 1; x <= this.base.x + 1; x++) {
      for (let y = this.base.y - 1; y <= this.base.y + 1; y++) {
        const inside = x === this.base.x && y === this.base.y;
        if (!inside) ring.push([x, y]);
      }
    }
    if (steel) {
      for (const [x, y] of ring) {
        const t = this.tileAt(x, y);
        if (!t || t.kind !== 'brick') continue;
        t.kind = 'steel';
        t.brickMask = 0;
        this.shovelRing.add(`${x},${y}`);
      }
    } else {
      // Возвращаем кирпич только тем тайлам, которые лопата сама сделала стальными.
      for (const key of this.shovelRing) {
        const [x, y] = key.split(',').map(Number);
        const t = this.tileAt(x, y);
        if (t && t.kind === 'steel') {
          t.kind = 'brick';
          t.brickMask = 0b1111;
        }
      }
      this.shovelRing.clear();
    }
  }

  /** Тайлы, которые лопата превратила в сталь; при окончании возвращаем кирпич только им. */
  private shovelRing = new Set<string>();

   /** Разрушает базу: состояние меняется один раз, событие — тоже. Итог — поражение. */
   destroyBase(): void {
     if (!this.baseAlive) return;
     this.baseAlive = false;
     this.emit({ type: 'baseDestroyed', x: this.base.x * 16 + 8, y: this.base.y * 16 + 8 });
     this.finish('lost');
   }

  /**
   * Попадание во взрослого игрока (не неуязвимого): теряется жизнь и улучшение.
   * Если жизни кончились — поражение, иначе игрок возрождается через задержку.
   */
  onPlayerHit(cx: number, cy: number): void {
    if (this.playerDown || this.outcome !== 'playing') return;
    this.emit({ type: 'playerHit', x: cx, y: cy });
    this.lives--;
    this.player.upgrade = 0;
    this.playerDown = true;
    if (this.lives <= 0) {
      this.finish('lost');
      return;
    }
    this.respawnTimer = RESPAWN_DELAY_STEPS;
  }

  /**
   * Учёт уничтоженного врага: очки по типу, счётчик, событие. Победа, когда
   * очередь спавна пуста, на поле никого нет и база цела.
   */
  onEnemyKilled(code: string, cx: number, cy: number): void {
    const points = ENEMY_TYPES[code as EnemyCode]?.points ?? 0;
    this.score += points;
    this.killed++;
    this.emit({ type: 'enemyDestroyed', x: cx, y: cy, code });
    this.checkVictory();
  }

  /** Победа: очередь пуста, врагов на поле нет, игрок и база живы. */
  checkVictory(): void {
    if (this.outcome !== 'playing') return;
    if (this.enemyQueue.length === 0 && this.enemies.length === 0 && this.baseAlive) {
      this.finish('won');
    }
  }

  /** Фиксирует итог уровня, если он ещё не принят. */
  finish(outcome: Exclude<LevelOutcome, 'playing'>): void {
    if (this.outcome !== 'playing') return;
    this.outcome = outcome;
  }
}

export type LevelOutcome = 'playing' | 'won' | 'lost';
