import { FIELD_FP, FIELD_ORIGIN_FP, TANK_FP, TILE_FP } from '../config/geometry';
import type { World } from './world';

/**
 * Проверка занятости танком квадрата TANK_FP×TANK_FP с левым верхним углом (x, y) в fp.
 * Блокирует выход за границы поля и пересечение с непроходимыми тайлами.
 * Интервалы полуоткрытые: танк, стоящий вплотную к тайлу, его не пересекает.
 */
export function tankBlocked(world: World, x: number, y: number): boolean {
  const left = FIELD_ORIGIN_FP;
  const right = FIELD_ORIGIN_FP + FIELD_FP;
  if (x < left || y < left || x + TANK_FP > right || y + TANK_FP > right) return true;

  const tx0 = Math.floor((x - FIELD_ORIGIN_FP) / TILE_FP);
  const tx1 = Math.floor((x + TANK_FP - 1 - FIELD_ORIGIN_FP) / TILE_FP);
  const ty0 = Math.floor((y - FIELD_ORIGIN_FP) / TILE_FP);
  const ty1 = Math.floor((y + TANK_FP - 1 - FIELD_ORIGIN_FP) / TILE_FP);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!world.isTankPassableAt(tx, ty)) return true;
    }
  }
  return false;
}

/** Танк считается стоящим на льду, если его центр над тайлом льда. */
export function tankOnIce(world: World, x: number, y: number): boolean {
  const cx = x + TANK_FP / 2;
  const cy = y + TANK_FP / 2;
  const tx = Math.floor((cx - FIELD_ORIGIN_FP) / TILE_FP);
  const ty = Math.floor((cy - FIELD_ORIGIN_FP) / TILE_FP);
  return world.tileAt(tx, ty)?.kind === 'ice';
}
