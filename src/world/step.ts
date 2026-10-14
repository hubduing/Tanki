import {
  PLAYER_FIRE_COOLDOWN_STEPS,
  PLAYER_SPEED_FP,
  playerBulletLimit,
  playerBulletSpeedPx,
} from '../config/balance';
import type { Dir } from '../core/dir';
import { RESPAWN_INVULN_STEPS } from '../config/rules';
import { stepBonuses } from './bonus';
import { FIELD_ORIGIN_FP, TILE_FP } from '../config/geometry';
import { stepEnemyAI } from './ai';
import { spawnBullet, updateBullets, type Owner } from './bullets';
import { stepTank } from './movement';
import { stepSpawn } from './spawn';
import type { Tank } from './tank';
import type { World } from './world';

/** Команды игрока на один логический шаг. */
export interface PlayerIntent {
  /** Удерживаемое направление или null. */
  dir: Dir | null;
  /** Запрошен выстрел в этом шаге. */
  fire: boolean;
}

/**
 * Пытается выстрелить танком. Лимит считается по самому танку: у игрока это
 * его пули (уровень улучшения), у врага — не более одной пули на врага.
 * Возвращает true, если пуля создана.
 */
export function tryFire(
  world: World,
  tank: Tank,
  owner: Owner,
  speedPx: number,
  pierceSteel: boolean,
  limit: number,
  cooldownSteps: number = PLAYER_FIRE_COOLDOWN_STEPS,
): boolean {
  if (tank.cooldown > 0) return false;
  const alive = world.bullets.filter((b) => b.alive && b.source === tank).length;
  if (alive >= limit) return false;
  spawnBullet(world, tank, owner, speedPx, pierceSteel);
  tank.cooldown = cooldownSteps;
  return true;
}

/**
 * Один логический шаг мира в порядке PLAN.md, 3.4: ввод, таймеры, спавн,
 * движение танков и ИИ, пули, последствия.
 */
export function stepWorld(world: World, intent: PlayerIntent): void {
  const p = world.player;

  if (world.outcome !== 'playing') return;

  // 2. Таймеры: перезарядка, анимация появления, неуязвимость, заморозка, лопата, возрождение.
  if (p.cooldown > 0) p.cooldown--;
  if (p.invuln > 0) p.invuln--;
  if (world.freezeTimer > 0) world.freezeTimer--;
  if (world.shovelTimer > 0) {
    world.shovelTimer--;
    if (world.shovelTimer === 0) world.applyShovel(false);
  }
  for (const e of world.enemies) {
    if (e.cooldown > 0) e.cooldown--;
    if (e.spawning > 0) e.spawning--;
  }
  stepBonuses(world);
  if (world.playerDown) {
    world.respawnTimer--;
    if (world.respawnTimer <= 0) respawnPlayer(world);
  }

  // 3. Спавн врагов из очереди.
  stepSpawn(world);

  // 1 и 4. Движение игрока (только если жив) и ИИ врагов.
  if (!world.playerDown) {
    stepTank(p, world, intent.dir, PLAYER_SPEED_FP);
  }
  // Заморозка: враги не двигаются и не стреляют, пока действует таймер.
  if (world.freezeTimer === 0) {
    for (const e of world.enemies) stepEnemyAI(world, e);
  }

  // Выстрел игрока.
  if (intent.fire && !world.playerDown) {
    const speed = playerBulletSpeedPx(p.upgrade);
    const pierce = p.upgrade >= 3;
    tryFire(world, p, 'player', speed, pierce, playerBulletLimit(p.upgrade));
  }

  // 5. Пули и попадания.
  updateBullets(world);

  // 8. Условия завершения.
  world.checkVictory();
}

/** Возрождение игрока на точке старта с неуязвимостью. Без жизней не вызывается. */
function respawnPlayer(world: World): void {
  const p = world.player;
  p.x = FIELD_ORIGIN_FP + world.playerSpawn.x * TILE_FP;
  p.y = FIELD_ORIGIN_FP + world.playerSpawn.y * TILE_FP;
  p.dir = 'up';
  p.pendingTurn = null;
  p.cooldown = 0;
  p.invuln = RESPAWN_INVULN_STEPS;
  world.playerDown = false;
}
