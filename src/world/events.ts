/**
 * События мира для звука и эффектов (PLAN.md, 3.4, шаг 9). Логика только пишет их,
 * а рендер и аудио читают и очищают очередь через World.drainEvents().
 */
export type WorldEvent =
  | { type: 'spark'; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; size: 'small' | 'large' }
  | { type: 'playerHit'; x: number; y: number }
  | { type: 'enemyDestroyed'; x: number; y: number }
  | { type: 'baseDestroyed'; x: number; y: number };
