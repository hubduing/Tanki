import { ENEMY_TYPES, type EnemyCode } from '../config/enemies';
import type { WorldEvent } from './events';
import type { World } from './world';

export type EffectKind = 'spark' | 'explosion' | 'score';

export interface Effect {
  kind: EffectKind;
  /** Центр эффекта в пикселях экрана (поле 8..216). */
  cx: number;
  cy: number;
  /** Оставшееся время жизни в логических шагах. */
  life: number;
  /** Для 'score': текст очков. */
  text?: string;
  /** Для 'score': цвет текста. */
  color?: string;
}

const EFFECT_LIFETIME: Record<EffectKind, number> = {
  spark: 10,
  explosion: 24,
  score: 48,
};

const SCORE_COLOR: Record<EnemyCode, string> = {
  B: '#f8f8f8',
  F: '#8ef08a',
  P: '#ffd23f',
  A: '#ff8a1f',
};

/**
 * Превращает события мира (звук + эффекты, PLAN.md 3.4 шаг 9) в визуальные эффекты.
 * Звук проигрывается отдельно из того же набора событий — см. main.ts.
 */
export function spawnEffects(world: World, events: readonly WorldEvent[]): void {
  for (const e of events) {
    let kind: EffectKind | null = null;
    let text: string | undefined;
    if (e.type === 'spark') {
      kind = 'spark';
    } else if (e.type === 'enemyDestroyed') {
      // Взрыв уничтоженного врага сопровождается всплывающими очками.
      const points = ENEMY_TYPES[e.code as EnemyCode]?.points ?? 0;
      kind = 'explosion';
      text = String(points);
      world.effects.push({
        kind: 'score',
        cx: e.x,
        cy: e.y - 4,
        life: EFFECT_LIFETIME.score,
        text,
        color: SCORE_COLOR[e.code as EnemyCode] ?? '#fff4d6',
      });
    } else if (e.type === 'explosion' || e.type === 'baseDestroyed' || e.type === 'playerHit') {
      kind = 'explosion';
    }
    if (kind) {
      world.effects.push({ kind, cx: e.x, cy: e.y, life: EFFECT_LIFETIME[kind], ...(text && { text }) });
    }
  }
}

/** Убывает таймер жизни, удаляет просроченные эффекты. */
export function stepEffects(world: World): void {
  for (let i = world.effects.length - 1; i >= 0; i--) {
    const eff = world.effects[i];
    eff.life--;
    if (eff.life <= 0) world.effects.splice(i, 1);
  }
}
