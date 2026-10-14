import { FIELD_ORIGIN_FP, TILE_FP } from '../config/geometry';
import {
  ENEMY_TYPES,
  MAX_ENEMIES_ON_FIELD,
  SPAWN_ANIM_STEPS,
  isEnemyKind,
} from '../config/enemies';
import { STEP_HZ } from '../config/balance';
import { BONUS_EVERY } from '../config/bonuses';
import { tankBlocked, tankOverlapsOther } from './collision';
import { Tank } from './tank';
import type { World } from './world';

/**
 * Спавн врагов (PLAN.md, M5): очередь уровня, точки появления по кругу,
 * лимит занятых слотов. Враг занимает слот с начала анимации появления.
 * Если точка занята, спавн ждёт, не сбрасывая таймер.
 */
export function stepSpawn(world: World): void {
  if (world.enemyQueue.length === 0) return;
  if (world.enemies.length >= MAX_ENEMIES_ON_FIELD) return;

  world.spawnTimer--;
  if (world.spawnTimer > 0) return;

  const n = world.enemySpawns.length;
  for (let k = 0; k < n; k++) {
    const idx = (world.nextSpawn + k) % n;
    const pt = world.enemySpawns[idx];
    const x = FIELD_ORIGIN_FP + pt.x * TILE_FP;
    const y = FIELD_ORIGIN_FP + pt.y * TILE_FP;
    if (tankBlocked(world, x, y) || tankOverlapsOther(world, null, x, y)) continue;

    const code = world.enemyQueue.shift()!;
    if (!isEnemyKind(code)) continue; // валидатор не пропускает такие коды, защита на всякий случай
    const tank = new Tank(x, y, 'down', code, ENEMY_TYPES[code].health);
    // Каждый четвёртый враг несёт бонус (детерминированно через счётчик, см. BONUS_EVERY).
    world.spawnedCount++;
    tank.carriesBonus = world.spawnedCount % BONUS_EVERY === 0;
    tank.spawning = SPAWN_ANIM_STEPS;
    tank.turnTimer = world.rng.int(60, 180);
    world.enemies.push(tank);
    world.nextSpawn = (idx + 1) % n;
    world.spawnTimer = Math.round(world.spawnIntervalSec * STEP_HZ);
    return;
  }
}
