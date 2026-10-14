import {
  PLAYER_FIRE_COOLDOWN_STEPS,
  PLAYER_SPEED_FP,
  playerBulletLimit,
  playerBulletSpeedPx,
} from '../config/balance';
import type { Dir } from '../core/dir';
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

  // 2. Таймеры: перезарядка, анимация появления.
  if (p.cooldown > 0) p.cooldown--;
  for (const e of world.enemies) {
    if (e.cooldown > 0) e.cooldown--;
    if (e.spawning > 0) e.spawning--;
  }

  // 3. Спавн врагов из очереди.
  stepSpawn(world);

  // 1 и 4. Движение игрока и ИИ врагов.
  stepTank(p, world, intent.dir, PLAYER_SPEED_FP);
  for (const e of world.enemies) stepEnemyAI(world, e);

  // Выстрел игрока.
  if (intent.fire) {
    const speed = playerBulletSpeedPx(p.upgrade);
    const pierce = p.upgrade >= 3;
    tryFire(world, p, 'player', speed, pierce, playerBulletLimit(p.upgrade));
  }

  // 5. Пули и попадания.
  updateBullets(world);
}
