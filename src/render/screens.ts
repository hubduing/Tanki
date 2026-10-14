import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './scale';
import type { App } from '../core/app';

const TITLES: Record<App['state'], string> = {
  loading: 'ЗАГРУЗКА',
  menu: 'ТАНЧИКИ',
  playing: 'ИГРА',
  paused: 'ПАУЗА',
  levelComplete: 'УРОВЕНЬ ПРОЙДЕН',
  gameOver: 'ИГРА ОКОНЧЕНА',
};

const HINTS: Record<App['state'], string> = {
  loading: '',
  menu: 'ENTER - старт',
  playing: 'ESC/P - пауза   F6/F7 - отладка',
  paused: 'ESC/P - продолжить   M - меню',
  levelComplete: 'ENTER - следующий уровень',
  gameOver: 'ENTER - в меню',
};

/**
 * Рисует текущий экран. Не меняет состояние приложения (PLAN.md, раздел 3.2).
 * Заглушки: настоящая карта появится на M2.
 */
export function drawScreen(ctx: CanvasRenderingContext2D, app: App): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const state = app.state;
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(TITLES[state], LOGICAL_WIDTH / 2, 100);

  ctx.font = '8px monospace';
  if (HINTS[state]) {
    ctx.fillText(HINTS[state], LOGICAL_WIDTH / 2, 124);
  }

  if (state === 'playing' || state === 'paused') {
    ctx.fillStyle = '#888';
    ctx.fillText(`шаги: ${app.logicSteps}`, LOGICAL_WIDTH / 2, 140);
  }
  ctx.textAlign = 'start';
}
