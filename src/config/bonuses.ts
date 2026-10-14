import { STEP_HZ } from './balance';

/** Коды бонусов из приложения В PLAN.md. */
export type BonusCode = 'S' | 'G' | 'H' | 'L' | 'T' | 'C';

export const BONUS_CODES: readonly BonusCode[] = ['S', 'G', 'H', 'L', 'T', 'C'];

/** Длительности и значения; все в одном месте, правятся без пересборки логики. */
export const BONUS = {
  /** Время жизни бонуса на карте, шагов (~15 с). */
  lifeSteps: 15 * STEP_HZ,
  /** Последние шаги жизни бонуса мигают (~3 с). */
  blinkSteps: 3 * STEP_HZ,
  /** Щит «каска», шагов (~10 с). */
  helmetSteps: 10 * STEP_HZ,
  /** Стальная база «лопата», шагов (~15 с). */
  shovelSteps: 15 * STEP_HZ,
  /** Заморозка врагов «таймер», шагов (~10 с). */
  freezeSteps: 10 * STEP_HZ,
  /** Очки за звезду на максимальном уровне улучшения. */
  starMaxPoints: 500,
} as const;

/** Максимальный уровень улучшения (PLAN.md, 3.7). */
export const MAX_UPGRADE = 3;

/**
 * Каждый N-й заспавненный враг несёт бонус. Детерминированный выбор «помеченных»
 * врагов без отдельного поля в формате уровня (PLAN.md не задаёт правила).
 */
export const BONUS_EVERY = 4;
