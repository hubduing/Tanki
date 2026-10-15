import { FIELD_ORIGIN_FP, FP, TANK_PX, TILE_FP } from '../config/geometry';
import { PLAYER_FIRE_COOLDOWN_STEPS, PLAYER_SPEED_FP, playerBulletSpeedPx } from '../config/balance';
import { ALLY_RESPAWN_DELAY_STEPS, ALLY_SPAWN_TILE } from '../config/rules';
import type { Dir } from '../core/dir';
import { tankBlocked, tankOverlapsOther } from './collision';
import { stepTank } from './movement';
import { tryFire } from './step';
import { Tank } from './tank';
import type { World } from './world';

/** Напарник стреляет редко, чтобы не забивать поле пулями. */
const ALLY_COOLDOWN_STEPS = PLAYER_FIRE_COOLDOWN_STEPS * 2;

/**
 * Выпускает напарника справа от штаба, если на уровне остались появления. Возвращает true,
 * если танк появился. Если точка занята танком или препятствием, появление откладывается
 * (расход появления не списывается, попытка повторится на следующем шаге).
 */
export function spawnAlly(world: World): boolean {
  if (world.ally || world.allySpawnsLeft <= 0 || world.playerDown) return false;
  const x = FIELD_ORIGIN_FP + ALLY_SPAWN_TILE.x * TILE_FP;
  const y = FIELD_ORIGIN_FP + ALLY_SPAWN_TILE.y * TILE_FP;
  if (tankBlocked(world, x, y) || tankOverlapsOther(world, null, x, y)) return false;
  world.ally = new Tank(x, y, 'up', 'player', 1);
  world.allySpawnsLeft--;
  return true;
}

/** Ближайший к напарнику живой враг или null. */
function nearestEnemy(world: World, ally: Tank): Tank | null {
  let best: Tank | null = null;
  let bestD = Infinity;
  for (const e of world.enemies) {
    if (e.spawning > 0) continue;
    const d = Math.abs(e.x - ally.x) + Math.abs(e.y - ally.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/**
 * Направление к цели, если она на одной линии с напарником (колонка или строка).
 * Допуск — половина танка, как у врагов.
 */
function lineDir(ally: Tank, target: Tank): Dir | null {
  const dx = target.x - ally.x;
  const dy = target.y - ally.y;
  if (Math.abs(dx) < (TANK_PX * FP) / 2) return dy > 0 ? 'down' : 'up';
  if (Math.abs(dy) < (TANK_PX * FP) / 2) return dx > 0 ? 'right' : 'left';
  return null;
}

/**
 * Шаг напарника: без танка — появляется (сразу в начале уровня или после задержки
 * возрождения, пока остались появления); живой — едет к ближайшему врагу,
 * выравнивает линию огня и стреляет по ней.
 */
export function stepAlly(world: World): void {
  if (!world.ally) {
    if (world.allySpawnsLeft <= 0) return;
    if (world.allyRespawnTimer > 0) {
      world.allyRespawnTimer--;
      if (world.allyRespawnTimer > 0) return;
    }
    spawnAlly(world);
    return;
  }

  const ally = world.ally;
  if (ally.cooldown > 0) ally.cooldown--;
  if (ally.spawning > 0) ally.spawning--;
  if (ally.spawning > 0) return;

  const target = nearestEnemy(world, ally);
  if (!target) return;

  const want = lineDir(ally, target) ?? approachDir(ally, target);
  stepTank(ally, world, want, PLAYER_SPEED_FP);

  const onLine = lineDir(ally, target);
  if (onLine && onLine === ally.dir) {
    tryFire(world, ally, 'player', playerBulletSpeedPx(0), false, 1, ALLY_COOLDOWN_STEPS);
  }
}

/** Направление сближения, если линии ещё нет: сначала по большей оси. */
function approachDir(ally: Tank, target: Tank): Dir {
  const dx = target.x - ally.x;
  const dy = target.y - ally.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Попадание по напарнику: погибает, если нет неуязвимости; ставит таймер возрождения,
 * если появления ещё остались, иначе напарник уходит с поля насовсем.
 */
export function onAllyHit(world: World): void {
  if (!world.ally) return;
  world.ally = null;
  world.allyRespawnTimer = world.allySpawnsLeft > 0 ? ALLY_RESPAWN_DELAY_STEPS : 0;
}
