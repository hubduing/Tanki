import { STEP_HZ } from './balance';

/** Жизни игрока, включая текущую (PLAN.md, 3.7). */
export const START_LIVES = 3;

/** Задержка перед возрождением после гибели, шагов (≈1 с). */
export const RESPAWN_DELAY_STEPS = STEP_HZ;

/** Неуязвимость после возрождения, шагов (≈3 с, PLAN.md, 3.7). */
export const RESPAWN_INVULN_STEPS = 3 * STEP_HZ;

/** Сколько раз напарник-ИИ может появиться на одном уровне. Сбрасывается на каждом новом уровне. */
export const ALLY_SPAWNS_PER_LEVEL = 5;

/**
 * Точка появления напарника в тайлах: справа от штаба (база в столбцах 6–7, стена в столбце 8).
 * Все уровни используют одну и ту же нижнюю часть карты с базой, поэтому точка общая.
 */
export const ALLY_SPAWN_TILE = { x: 9, y: 12 } as const;

/** Задержка перед появлением напарника после гибели, шагов (≈2 с). */
export const ALLY_RESPAWN_DELAY_STEPS = 2 * STEP_HZ;
