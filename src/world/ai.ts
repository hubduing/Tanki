import { FIELD_ORIGIN, FP, TANK_PX, TILE_PX } from '../config/geometry';
import {
  enemyBulletSpeedPx,
  enemyCooldownSteps,
  enemySpeedFp,
  isEnemyKind,
  type EnemyCode,
} from '../config/enemies';
import type { Dir } from '../core/dir';
import { tryFire } from './step';
import { stepTank } from './movement';
import type { Tank } from './tank';
import type { World } from './world';

/** Вероятность выстрела на шаге, когда перезарядка прошла. Даёт неровный ритм без пачек. */
const FIRE_CHANCE = 0.05;

const ALL_DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

/** Случайное направление, отличное от текущего. */
function otherDir(world: World, current: Dir): Dir {
  const options = ALL_DIRS.filter((d) => d !== current);
  return options[world.rng.int(0, options.length - 1)];
}

/**
 * Направление на игрока или базу, если враг стоит с ними на одной линии
 * (колонка или строка, допуск половина тайла). Иначе null.
 */
function aimDir(world: World, e: Tank): Dir | null {
  const ecx = Math.round(e.x / FP) + TANK_PX / 2;
  const ecy = Math.round(e.y / FP) + TANK_PX / 2;
  const targets: Array<{ cx: number; cy: number }> = [
    { cx: Math.round(world.player.x / FP) + TANK_PX / 2, cy: Math.round(world.player.y / FP) + TANK_PX / 2 },
  ];
  if (world.baseAlive) {
    // База 2×2: центр совпадает с углом центрального тайла, т.е. левый верхний + 16 px.
    targets.push({
      cx: FIELD_ORIGIN + world.base.x * TILE_PX + TILE_PX,
      cy: FIELD_ORIGIN + world.base.y * TILE_PX + TILE_PX,
    });
  }
  for (const t of targets) {
    if (Math.abs(t.cx - ecx) < TANK_PX / 2) return t.cy > ecy ? 'down' : 'up';
    if (Math.abs(t.cy - ecy) < TANK_PX / 2) return t.cx > ecx ? 'right' : 'left';
  }
  return null;
}

/**
 * ИИ одного врага за шаг (PLAN.md, M5): смена направления при упоре или по таймеру,
 * поворот к игроку или базе при совпадении линии, выстрел с перезарядкой и не более
 * одной пули на врага. Спавнящиеся враги не действуют.
 */
export function stepEnemyAI(world: World, e: Tank): void {
  if (e.spawning > 0 || !isEnemyKind(e.kind)) return;
  const code: EnemyCode = e.kind;

  e.turnTimer--;
  if (e.blockedLast || e.turnTimer <= 0) {
    e.aiDir = otherDir(world, e.aiDir);
    e.turnTimer = world.rng.int(60, 180);
  }
  if (e.cooldown === 0) {
    const aim = aimDir(world, e);
    if (aim) e.aiDir = aim;
  }

  stepTank(e, world, e.aiDir, enemySpeedFp(code));
  e.blockedLast = !e.moving;

  if (e.cooldown === 0 && world.rng.next() < FIRE_CHANCE) {
    tryFire(world, e, 'enemy', enemyBulletSpeedPx(code), false, 1, enemyCooldownSteps(code));
  }
}
