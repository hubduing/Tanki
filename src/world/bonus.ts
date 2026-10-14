import { BONUS, BONUS_CODES, MAX_UPGRADE, type BonusCode } from '../config/bonuses';
import { FP, TANK_FP } from '../config/geometry';
import type { World } from './world';

/** Бонус на карте. Позиция — левый верхний угол в fixed-point. */
export interface Bonus {
  code: BonusCode;
  x: number;
  y: number;
  /** Оставшиеся шаги жизни на карте. */
  life: number;
}

/** Размер бонуса на карте, 16 px. */
export const BONUS_PX = 16;

/** Выбирает код бонуса из ГСЧ мира; равномерно по шести типам. */
export function rollBonusCode(world: World): BonusCode {
  return BONUS_CODES[world.rng.int(0, BONUS_CODES.length - 1)];
}

/** Создаёт бонус на карте в позиции уничтоженного врага (fixed-point). */
export function spawnBonus(world: World, code: BonusCode, x: number, y: number): void {
  world.bonuses.push({ code, x, y, life: BONUS.lifeSteps });
}

/** Перекрывается ли бонус с танком игрока (fixed-point). */
function overlapsPlayer(world: World, b: Bonus): boolean {
  const p = world.player;
  const size = BONUS_PX * FP;
  return b.x < p.x + TANK_FP && b.x + size > p.x && b.y < p.y + TANK_FP && b.y + size > p.y;
}

/**
 * Шаг бонусов: убывает время жизни, истёкшие удаляются. Игрок подбирает бонус,
 * касаясь его: эффект применяется один раз, бонус удаляется.
 */
export function stepBonuses(world: World): void {
  for (let i = world.bonuses.length - 1; i >= 0; i--) {
    const b = world.bonuses[i];
    b.life--;
    if (b.life <= 0) {
      world.bonuses.splice(i, 1);
      continue;
    }
    if (!world.playerDown && overlapsPlayer(world, b)) {
      world.bonuses.splice(i, 1);
      applyBonus(world, b.code, b.x, b.y);
    }
  }
}

/**
 * Применяет эффект бонуса один раз. Мгновенные — здесь; временные выставляют
 * таймеры мира, которые истекают в stepWorld; постоянные сохраняются до сброса.
 */
export function applyBonus(world: World, code: BonusCode, x = 0, y = 0): void {
  switch (code) {
    case 'S': {
      // Звезда: улучшение до максимума; на максимуме — очки.
      const p = world.player;
      if (p.upgrade < MAX_UPGRADE) p.upgrade++;
      else world.score += BONUS.starMaxPoints;
      break;
    }
    case 'G':
      // Граната: уничтожает всех врагов на поле, очки — как за каждого.
      for (const e of world.enemies.splice(0)) world.onEnemyKilled(e.kind, e.x / FP, e.y / FP);
      break;
    case 'H':
      world.player.invuln = Math.max(world.player.invuln, BONUS.helmetSteps);
      break;
    case 'L':
      world.setBaseSteel(BONUS.shovelSteps);
      break;
    case 'T':
      world.lives++;
      break;
    case 'C':
      world.freezeTimer = BONUS.freezeSteps;
      break;
  }
  world.emit({ type: 'spark', x, y });
}
