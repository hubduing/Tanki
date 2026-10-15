import { LEVEL_SIZE } from './tiles';

/**
 * Геометрия в fixed-point (PLAN.md, 3.3). Позиции хранятся в единицах 1/256 px,
 * отрисовка округляется до целого пикселя.
 */
export const FP = 256;

/** Шаг подвижки при проверке столкновений: 1/16 px, чтобы не «перепрыгнуть» препятствие. */
export const SUB_STEP_FP = 16;

/** Смещение игрового поля на логическом экране (px). */
export const FIELD_ORIGIN = 8;
export const FIELD_ORIGIN_FP = FIELD_ORIGIN * FP;

export const TILE_PX = 16;
export const TILE_FP = TILE_PX * FP;

/** Игровое поле 13×13 тайлов по 16 px. */
export const FIELD_FP = LEVEL_SIZE * TILE_FP;

/**
 * Танк 12×12 внутри тайла 16 px: по 2 px запаса с каждой стороны, поэтому танк
 * входит в проход шириной в один тайл и поворачивает, не требуя точной подводки.
 */
export const TANK_PX = 12;
export const TANK_FP = TANK_PX * FP;

/** Шаг выравнивания для поворота: поперечная координата кратна 8 px от начала поля. */
export const ALIGN_PX = 8;
export const ALIGN_FP = ALIGN_PX * FP;

/** Перевод fixed-point в пиксели для отрисовки (округление до целого). */
export function fpToPx(fp: number): number {
  return Math.round(fp / FP);
}
