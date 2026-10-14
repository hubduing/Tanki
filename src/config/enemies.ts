import { STEP_HZ } from './balance';
import { FP } from './geometry';

/** Типы врагов (PLAN.md, приложение Б). Коды совпадают с символами в файле уровня. */
export type EnemyCode = 'B' | 'F' | 'P' | 'A';

export interface EnemyType {
  name: string;
  health: number;
  speedPx: number;
  /** Быстрая пуля (300 px/с) или обычная (180 px/с). */
  fastBullet: boolean;
  fireIntervalSec: number;
  points: number;
}

export const ENEMY_TYPES: Readonly<Record<EnemyCode, EnemyType>> = {
  B: { name: 'Обычный', health: 1, speedPx: 30, fastBullet: false, fireIntervalSec: 1.6, points: 100 },
  F: { name: 'Быстрый', health: 1, speedPx: 60, fastBullet: false, fireIntervalSec: 1.6, points: 200 },
  P: { name: 'Мощный', health: 1, speedPx: 45, fastBullet: true, fireIntervalSec: 0.9, points: 300 },
  A: { name: 'Бронированный', health: 4, speedPx: 45, fastBullet: true, fireIntervalSec: 1.2, points: 400 },
};

/** Максимум врагов на поле одновременно, включая появляющихся (PLAN.md, 3.7). */
export const MAX_ENEMIES_ON_FIELD = 4;

/** Длительность анимации появления врага, шагов (≈1 с). */
export const SPAWN_ANIM_STEPS = STEP_HZ;

export function isEnemyKind(kind: string): kind is EnemyCode {
  return kind in ENEMY_TYPES;
}

/** Скорость врага в fixed-point за шаг. Все типы дают целое число fp. */
export function enemySpeedFp(code: EnemyCode): number {
  return (ENEMY_TYPES[code].speedPx * FP) / STEP_HZ;
}

/** Скорость пули врага, целые пиксели за шаг: 3 (обычная) или 5 (быстрая). */
export function enemyBulletSpeedPx(code: EnemyCode): number {
  return (ENEMY_TYPES[code].fastBullet ? 300 : 180) / STEP_HZ;
}

/** Интервал выстрела в шагах. */
export function enemyCooldownSteps(code: EnemyCode): number {
  return Math.round(ENEMY_TYPES[code].fireIntervalSec * STEP_HZ);
}
