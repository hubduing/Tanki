import { STEP_HZ } from './balance';

/** Жизни игрока, включая текущую (PLAN.md, 3.7). */
export const START_LIVES = 3;

/** Задержка перед возрождением после гибели, шагов (≈1 с). */
export const RESPAWN_DELAY_STEPS = STEP_HZ;

/** Неуязвимость после возрождения, шагов (≈3 с, PLAN.md, 3.7). */
export const RESPAWN_INVULN_STEPS = 3 * STEP_HZ;
