import { FP } from './geometry';

/** Частота логических шагов (D4). */
export const STEP_HZ = 60;

/** Скорость игрока, px/с. Все значения из PLAN.md дают целое число fp за шаг. */
export const PLAYER_SPEED_PX_S = 60;

/** Скорость в fp за один логический шаг: 60 px/с → 256 fp. */
export const PLAYER_SPEED_FP = (PLAYER_SPEED_PX_S * FP) / STEP_HZ;

/** Размер пули в пикселях (PLAN.md, 3.3). */
export const BULLET_PX = 4;

/**
 * Скорость пули игрока по уровню улучшения 0..3 (PLAN.md, 3.7), px/с.
 * Значения кратны 60, поэтому пуля движется целым числом пикселей за шаг.
 */
export const PLAYER_BULLET_SPEED_PX_S: readonly number[] = [180, 240, 300, 300];

/** Перезарядка игрока: 0,25 с при 60 Гц. */
export const PLAYER_FIRE_COOLDOWN_STEPS = 15;

/** Скорость пули игрока на данном уровне улучшения, px за шаг. */
export function playerBulletSpeedPx(upgrade: number): number {
  const idx = Math.min(Math.max(upgrade, 0), PLAYER_BULLET_SPEED_PX_S.length - 1);
  return PLAYER_BULLET_SPEED_PX_S[idx] / STEP_HZ;
}

/** Сколько пуль игрока одновременно на поле: 1 на уровнях 0–1, 2 на уровнях 2–3. */
export function playerBulletLimit(upgrade: number): number {
  return upgrade >= 2 ? 2 : 1;
}
