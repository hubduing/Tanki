import type { Dir } from '../core/dir';
import type { EnemyCode } from '../config/enemies';

/** Игрок или тип врага. */
export type TankKind = 'player' | EnemyCode;

/**
 * Танк. Позиция — левый верхний угол в fixed-point (1/256 px).
 * Логика движения — в movement.ts, ИИ — в ai.ts; здесь только данные.
 */
export class Tank {
  x: number;
  y: number;
  dir: Dir;
  /** Двигался ли танк на последнем шаге (нужно для инерции на льду и для ИИ). */
  moving = false;
  /** Направление, на которое игрок хочет повернуть, пока танк выравнивается. */
  pendingTurn: Dir | null = null;
  /** Шагов до следующего выстрела (перезарядка). */
  cooldown = 0;
  /** Уровень улучшения 0..3 (для игрока). */
  upgrade = 0;
  /** Оставшиеся шаги анимации появления; пока > 0, танк не действует и не поражается. */
  spawning = 0;
  /** Здоровье: у бронированного врага 4, у остальных 1. */
  health: number;
  /** Направление движения ИИ врага. */
  aiDir: Dir;
  /** Шагов до случайной смены направления ИИ. */
  turnTimer = 0;
  /** Упёрся ли враг на прошлом шаге (тогда меняет направление). */
  blockedLast = false;

  constructor(
    x: number,
    y: number,
    dir: Dir,
    public readonly kind: TankKind = 'player',
    health = 1,
  ) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.aiDir = dir;
    this.health = health;
  }
}
