import {
  PLAYER_FIRE_COOLDOWN_STEPS,
  PLAYER_SPEED_FP,
  playerBulletLimit,
  playerBulletSpeedPx,
} from '../config/balance';
import type { Dir } from '../core/dir';
import { stepTank } from './movement';
import { spawnBullet, updateBullets, type Owner } from './bullets';
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
 * Пытается выстрелить танком. Учитывает перезарядку и лимит пуль своего владельца.
 * Возвращает true, если пуля создана.
 */
export function tryFire(world: World, tank: Tank, owner: Owner, speedPx: number, pierceSteel: boolean, limit: number): boolean {
  if (tank.cooldown > 0) return false;
  const alive = world.bullets.filter((b) => b.alive && b.owner === owner).length;
  if (alive >= limit) return false;
  spawnBullet(world, tank, owner, speedPx, pierceSteel);
  tank.cooldown = PLAYER_FIRE_COOLDOWN_STEPS;
  return true;
}

/**
 * Один логический шаг мира в порядке PLAN.md, 3.4: ввод игрока, таймеры,
 * движение танков, пули, последствия. Спавн врагов и ИИ добавятся на M5.
 */
export function stepWorld(world: World, intent: PlayerIntent): void {
  const p = world.player;

  // 2. Таймеры.
  if (p.cooldown > 0) p.cooldown--;
  for (const e of world.enemies) if (e.cooldown > 0) e.cooldown--;

  // 4. Движение танков.
  stepTank(p, world, intent.dir, PLAYER_SPEED_FP);

  // 1 (выстрел) и 5. Пули.
  if (intent.fire) {
    const speed = playerBulletSpeedPx(p.upgrade);
    const pierce = p.upgrade >= 3;
    tryFire(world, p, 'player', speed, pierce, playerBulletLimit(p.upgrade));
  }
  updateBullets(world);
}
