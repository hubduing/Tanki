import { FP } from './geometry';

/** Частота логических шагов (D4). */
export const STEP_HZ = 60;

/** Скорость игрока, px/с. Все значения из PLAN.md дают целое число fp за шаг. */
export const PLAYER_SPEED_PX_S = 60;

/** Скорость в fp за один логический шаг: 60 px/с → 256 fp. */
export const PLAYER_SPEED_FP = (PLAYER_SPEED_PX_S * FP) / STEP_HZ;
