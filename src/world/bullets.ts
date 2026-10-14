import { BULLET_PX } from '../config/balance';
import { FIELD_ORIGIN, FP, TANK_PX, TILE_PX } from '../config/geometry';
import { LEVEL_SIZE } from '../config/tiles';
import { DIR_VEC, type Dir } from '../core/dir';
import type { Tank } from './tank';
import type { World } from './world';

export type Owner = 'player' | 'enemy';

/**
 * Пуля. Позиция — целые пиксели: скорости из PLAN.md кратны 60 px/с, поэтому
 * пуля движется целым числом пикселей за шаг, а подшаги по 1 px не дают туннелирования.
 */
export class Bullet {
  alive = true;

  constructor(
    public x: number,
    public y: number,
    public readonly dir: Dir,
    public readonly speedPx: number,
    public readonly owner: Owner,
    /** Пробивает сталь (пуля игрока уровня 3). */
    public readonly pierceSteel: boolean,
    /** Танк, выпустивший пулю; нужен для лимита «одна пуля на врага». */
    public readonly source: Tank,
  ) {}
}

const SIZE = BULLET_PX;
const FIELD_PX = LEVEL_SIZE * TILE_PX;
const FIELD_MAX = FIELD_ORIGIN + FIELD_PX;
const QUAD = TILE_PX / 2;

/** Пересечение прямоугольников (полуоткрытые интервалы). */
export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** Танк в пикселях (округление fixed-point). */
function tankPx(t: Tank): { x: number; y: number } {
  return { x: Math.round(t.x / FP), y: Math.round(t.y / FP) };
}

/** Создаёт пулю у ствола танка и добавляет её на поле. */
export function spawnBullet(
  world: World,
  tank: Tank,
  owner: Owner,
  speedPx: number,
  pierceSteel: boolean,
): Bullet {
  const p = tankPx(tank);
  const mid = (TANK_PX - SIZE) / 2;
  let x: number;
  let y: number;
  switch (tank.dir) {
    case 'up':
      x = p.x + mid;
      y = p.y - SIZE;
      break;
    case 'down':
      x = p.x + mid;
      y = p.y + TANK_PX;
      break;
    case 'left':
      x = p.x - SIZE;
      y = p.y + mid;
      break;
    case 'right':
      x = p.x + TANK_PX;
      y = p.y + mid;
      break;
  }
  const b = new Bullet(x, y, tank.dir, speedPx, owner, pierceSteel, tank);
  world.bullets.push(b);
  return b;
}

/**
 * Двигает все пули подшагами по 1 px и разрешает попадания (PLAN.md, 3.4, шаги 5–6).
 * Погибшие пули удаляются из списка в конце.
 */
export function updateBullets(world: World): void {
  for (const b of world.bullets) {
    for (let i = 0; i < b.speedPx && b.alive; i++) {
      const v = DIR_VEC[b.dir];
      b.x += v.dx;
      b.y += v.dy;
      resolveBullet(world, b);
      if (b.alive) collideWithBullets(world, b);
    }
  }
  world.bullets = world.bullets.filter((b) => b.alive);
}

function resolveBullet(world: World, b: Bullet): void {
  // Граница поля: пуля улетает и гаснет.
  if (b.x < FIELD_ORIGIN || b.y < FIELD_ORIGIN || b.x + SIZE > FIELD_MAX || b.y + SIZE > FIELD_MAX) {
    b.alive = false;
    return;
  }

  // Тайлы, которые пересекает пуля.
  const tx0 = Math.floor((b.x - FIELD_ORIGIN) / TILE_PX);
  const tx1 = Math.floor((b.x + SIZE - 1 - FIELD_ORIGIN) / TILE_PX);
  const ty0 = Math.floor((b.y - FIELD_ORIGIN) / TILE_PX);
  const ty1 = Math.floor((b.y + SIZE - 1 - FIELD_ORIGIN) / TILE_PX);

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const tile = world.tileAt(tx, ty);
      if (!tile) continue;
      const cx = FIELD_ORIGIN + tx * TILE_PX + TILE_PX / 2;
      const cy = FIELD_ORIGIN + ty * TILE_PX + TILE_PX / 2;
      switch (tile.kind) {
        case 'brick':
          if (hitBrick(tile, tx, ty, b)) {
            b.alive = false;
            world.emit({ type: 'spark', x: b.x, y: b.y });
            return;
          }
          break;
        case 'steel':
          if (b.pierceSteel && b.owner === 'player') {
            tile.kind = 'empty';
            world.emit({ type: 'explosion', x: cx, y: cy, size: 'small' });
          } else {
            b.alive = false;
            world.emit({ type: 'spark', x: b.x, y: b.y });
            return;
          }
          break;
        case 'base':
          if (world.baseAlive) {
            b.alive = false;
            world.destroyBase();
            return;
          }
          break; // руины базы не останавливают пулю
        default:
          break; // пусто, вода, лес, лёд — пуля летит дальше
      }
    }
  }

  // Танки: игрок стреляет во врагов, враги — в игрока.
  if (b.owner === 'player') {
    for (let i = world.enemies.length - 1; i >= 0; i--) {
      const e = world.enemies[i];
      // Появляющийся враг неуязвим, пуля пролетает мимо.
      if (e.spawning > 0) continue;
      const p = tankPx(e);
      if (rectsOverlap(b.x, b.y, SIZE, SIZE, p.x, p.y, TANK_PX, TANK_PX)) {
        b.alive = false;
        e.health -= 1;
        const cx = p.x + TANK_PX / 2;
        const cy = p.y + TANK_PX / 2;
        if (e.health <= 0) {
          world.enemies.splice(i, 1);
          world.onEnemyKilled(e.kind, cx, cy);
        } else {
          world.emit({ type: 'spark', x: b.x, y: b.y });
        }
        return;
      }
    }
  } else {
    const p = tankPx(world.player);
    if (rectsOverlap(b.x, b.y, SIZE, SIZE, p.x, p.y, TANK_PX, TANK_PX)) {
      b.alive = false;
      // Неуязвимый игрок (после возрождения) пулю поглощает без урона.
      if (world.player.invuln === 0) {
        world.onPlayerHit(p.x + TANK_PX / 2, p.y + TANK_PX / 2);
      }
    }
  }
}

/**
 * Выбивает квадранты 8×8 кирпича, которых касается пуля. Квадранты, уже
 * выбитые раньше, пуля проходит. Возвращает true, если хоть один квадрант выбит.
 */
function hitBrick(tile: { kind: string; brickMask: number }, tx: number, ty: number, b: Bullet): boolean {
  let hit = false;
  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      const bit = 1 << (qy * 2 + qx);
      if (!(tile.brickMask & bit)) continue;
      const left = FIELD_ORIGIN + tx * TILE_PX + qx * QUAD;
      const top = FIELD_ORIGIN + ty * TILE_PX + qy * QUAD;
      if (rectsOverlap(b.x, b.y, SIZE, SIZE, left, top, QUAD, QUAD)) {
        tile.brickMask &= ~bit;
        hit = true;
      }
    }
  }
  if (tile.brickMask === 0) tile.kind = 'empty';
  return hit;
}

/** Встречные пули разных владельцев уничтожают друг друга; одного владельца — проходят. */
function collideWithBullets(world: World, b: Bullet): void {
  for (const o of world.bullets) {
    if (o === b || !o.alive || o.owner === b.owner) continue;
    if (rectsOverlap(b.x, b.y, SIZE, SIZE, o.x, o.y, SIZE, SIZE)) {
      b.alive = false;
      o.alive = false;
      world.emit({ type: 'spark', x: b.x, y: b.y });
      return;
    }
  }
}
