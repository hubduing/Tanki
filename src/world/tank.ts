import type { Dir } from '../core/dir';

/**
 * Танк игрока. Позиция — левый верхний угол танка в fixed-point (1/256 px).
 * Логика движения — в movement.ts; здесь только данные.
 */
export class Tank {
  x: number;
  y: number;
  dir: Dir;
  /** Двигался ли танк на последнем шаге (нужно для инерции на льду). */
  moving = false;
  /** Направление, на которое игрок хочет повернуть, пока танк выравнивается. */
  pendingTurn: Dir | null = null;
  /** Шагов до следующего выстрела (перезарядка). */
  cooldown = 0;
  /** Уровень улучшения 0..3 (для игрока). */
  upgrade = 0;

  constructor(x: number, y: number, dir: Dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;
  }
}
