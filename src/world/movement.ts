import { ALIGN_FP, FIELD_ORIGIN_FP, SUB_STEP_FP } from '../config/geometry';
import { DIR_VEC, isHorizontal, opposite, type Dir } from '../core/dir';
import { tankBlocked, tankOnIce, tankOverlapsOther } from './collision';
import type { Tank } from './tank';
import type { World } from './world';

function posMod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

/**
 * Сдвигает танк на `amount` fp по единичному вектору (ux, uy) подшагами.
 * Останавливается перед препятствием. Возвращает, был ли сдвиг.
 */
function moveBy(tank: Tank, world: World, ux: number, uy: number, amount: number): boolean {
  let remaining = amount;
  let moved = false;
  while (remaining > 0) {
    const s = Math.min(remaining, SUB_STEP_FP);
    const nx = tank.x + ux * s;
    const ny = tank.y + uy * s;
    if (tankBlocked(world, nx, ny) || tankOverlapsOther(world, tank, nx, ny)) break;
    tank.x = nx;
    tank.y = ny;
    remaining -= s;
    moved = true;
  }
  return moved;
}

function advance(tank: Tank, world: World, dir: Dir, speedFp: number): boolean {
  const v = DIR_VEC[dir];
  return moveBy(tank, world, v.dx, v.dy, speedFp);
}

/**
 * Один логический шаг танка (PLAN.md, 3.4, шаг 4).
 *
 * - `desired` — направление, которое удерживает игрок, или null.
 * - Движение вперёд и разворот на 180° не требуют выравнивания.
 * - Поворот на 90°: сначала танк сдвигается поперечно к ближайшей линии сетки 8 px
 *   (с полной скоростью, без движения вперёд), затем поворачивается и едет.
 * - Лёд: если кнопка отпущена, а танк скользил, он едет по инерции, пока не упрётся.
 */
export function stepTank(tank: Tank, world: World, desired: Dir | null, speedFp: number): void {
  const wasMoving = tank.moving;
  tank.moving = false;

  if (desired === null) {
    tank.pendingTurn = null;
    if (wasMoving && tankOnIce(world, tank.x, tank.y)) {
      tank.moving = advance(tank, world, tank.dir, speedFp);
    }
    return;
  }

  if (desired === tank.dir) {
    tank.pendingTurn = null;
    tank.moving = advance(tank, world, tank.dir, speedFp);
    return;
  }

  if (desired === opposite(tank.dir)) {
    tank.pendingTurn = null;
    tank.dir = desired;
    tank.moving = advance(tank, world, tank.dir, speedFp);
    return;
  }

  // Поворот на 90°.
  tank.pendingTurn = desired;
  const horizontal = isHorizontal(tank.dir);
  const perpRel = posMod((horizontal ? tank.y : tank.x) - FIELD_ORIGIN_FP, ALIGN_FP);

  if (perpRel === 0) {
    tank.dir = desired;
    tank.pendingTurn = null;
    tank.moving = advance(tank, world, tank.dir, speedFp);
    return;
  }

  // Выравнивание: сдвиг к ближайшей линии сетки.
  const toLower = perpRel;
  const toUpper = ALIGN_FP - perpRel;
  const sign = toLower <= toUpper ? -1 : 1;
  const dist = Math.min(toLower, toUpper);
  const amount = Math.min(speedFp, dist);
  tank.moving = horizontal
    ? moveBy(tank, world, 0, sign, amount)
    : moveBy(tank, world, sign, 0, amount);
}
