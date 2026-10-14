import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './scale';
import type { App } from '../core/app';
import type { Dir } from '../core/dir';
import { ENEMY_PALETTES, PLAYER_PALETTE, drawTankSprite } from './sprites';

/**
 * Экраны вне уровня: загрузка, меню, пауза, итоги. Чистый рендер — состояние не меняет.
 * Вся графика процедурная: звёздный фон, волнистые заголовки, панели, анимированные танки.
 * Время берётся из performance.now() только для анимации, на логику не влияет.
 */

const W = LOGICAL_WIDTH;
const H = LOGICAL_HEIGHT;

/** Шрифты: жирный моноширинный с обводкой. Размеры кратны логическим пикселям. */
const F_HUGE = 'bold 26px "Courier New", Consolas, monospace';
const F_TITLE = 'bold 16px "Courier New", Consolas, monospace';
const F_BIG = 'bold 12px "Courier New", Consolas, monospace';
const F_TEXT = 'bold 10px "Courier New", Consolas, monospace';
const F_SMALL = 'bold 8px "Courier New", Consolas, monospace';

const GOLD = '#ffd23f';
const ORANGE = '#ff8a1f';
const RED = '#ff4a3a';
const GREEN = '#7dff7d';
const CREAM = '#fff4d6';
const DIM = '#8c96c8';
const DARK = '#1a0a00';

/** Звёзды: детерминированные позиции, чтобы фон был одинаковым при каждом запуске. */
const STARS = Array.from({ length: 56 }, (_, i) => ({
  x: (i * 73) % W,
  y: (i * 41) % H,
  speed: 4 + (i % 4) * 3,
  size: i % 7 === 0 ? 2 : 1,
  phase: (i * 0.37) % 1,
}));

function now(): number {
  return performance.now() / 1000;
}

/** Фон: вертикальный градиент, движущиеся звёзды и тонкие строки развёртки. */
function drawBackground(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0730');
  g.addColorStop(0.55, '#1b0c3d');
  g.addColorStop(1, '#2a0a10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const s of STARS) {
    const y = (s.y + t * s.speed * 0.5) % H;
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 2 + s.phase * 10));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = s.size > 1 ? '#fff4d6' : '#9fb0ff';
    ctx.fillRect(s.x, y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

/** Текст с тёмной обводкой и тенью — основа всех надписей. */
function outlined(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  font: string,
  align: CanvasTextAlign = 'center',
): void {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = DARK;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(text, x + 1, y + 2);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Заголовок, где каждая буква качается волной и меняет оттенок. */
function waveTitle(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, t: number, font: string, colors: [string, string]): void {
  ctx.font = font;
  const total = ctx.measureText(text).width;
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const w = ctx.measureText(ch).width;
    const dy = Math.sin(t * 3 + i * 0.6) * 2.5;
    const mix = i % 2 === 0 ? colors[0] : colors[1];
    outlined(ctx, ch, x + w / 2, cy + dy, mix, font, 'center');
    x += w;
  }
}

/** Панель с двойной рамкой. */
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(8,4,24,0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
}

/** Декоративный танк по краю экрана: ездит вверх-вниз и разворачивается. */
function patrolTank(ctx: CanvasRenderingContext2D, x: number, t: number, phase: number, enemy: boolean): void {
  const cycle = (Math.sin(t * 1.1 + phase) + 1) / 2;
  const y = 90 + Math.round(cycle * 56);
  const dir: Dir = Math.cos(t * 1.1 + phase) >= 0 ? 'down' : 'up';
  drawTankSprite(ctx, x, y, dir, enemy ? ENEMY_PALETTES.A : PLAYER_PALETTE);
}

/** Экран загрузки: спиннер из точек и бегущие многоточия. */
function drawLoading(ctx: CanvasRenderingContext2D, t: number): void {
  waveTitle(ctx, 'ТАНЧИКИ', W / 2, 88, t, F_HUGE, [GOLD, ORANGE]);
  const cx = W / 2;
  const cy = 130;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - t * 4;
    const alpha = (i + Math.floor(t * 8)) % 8 / 8;
    ctx.globalAlpha = 0.2 + 0.8 * alpha;
    ctx.fillStyle = GOLD;
    ctx.fillRect(Math.round(cx + Math.cos(a) * 12) - 2, Math.round(cy + Math.sin(a) * 12) - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  const dots = '.'.repeat(Math.floor(t * 2) % 4);
  outlined(ctx, 'ЗАГРУЗКА' + dots, W / 2, 166, CREAM, F_BIG);
}

/** Главное меню: заголовок, выбор уровня, звук, кнопка старта и танки по бокам. */
function drawMenu(ctx: CanvasRenderingContext2D, t: number, menu: { menuLevel: number; soundOn: boolean }): void {
  waveTitle(ctx, 'ТАНЧИКИ', W / 2, 52, t, F_HUGE, [GOLD, ORANGE]);
  outlined(ctx, 'ЗАЩИТИ БАЗУ', W / 2, 74, DIM, F_SMALL);

  patrolTank(ctx, 10, t, 0, false);
  patrolTank(ctx, W - 26, t, Math.PI, true);

  panel(ctx, 40, 90, 176, 96);
  outlined(ctx, 'УРОВЕНЬ', W / 2, 106, DIM, F_SMALL);

  const arrowPulse = Math.sin(t * 6) > 0 ? 0 : 2;
  outlined(ctx, '<', 56 - arrowPulse, 128, GOLD, F_TITLE);
  outlined(ctx, '>', 200 + arrowPulse, 128, GOLD, F_TITLE);
  outlined(ctx, String(menu.menuLevel).padStart(2, '0'), W / 2, 128, CREAM, F_HUGE);

  const soundColor = menu.soundOn ? GREEN : RED;
  outlined(ctx, `ЗВУК: ${menu.soundOn ? 'ВКЛ' : 'ВЫКЛ'}`, W / 2, 166, soundColor, F_TEXT);

  const blink = 0.55 + 0.45 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  outlined(ctx, 'ENTER - СТАРТ', W / 2, 200, GOLD, F_BIG);
  ctx.globalAlpha = 1;

  outlined(ctx, 'ВВЕРХ/ВНИЗ - УРОВЕНЬ   N - ЗВУК', W / 2, 216, DIM, F_SMALL);
}

/** Экран итогов: счётчики очков и врагов плавно набегают. */
function drawResult(
  ctx: CanvasRenderingContext2D,
  t: number,
  startedAt: number,
  title: string,
  color: string,
  hint: string,
  stats: { score: number; killed: number; levelNumber: number },
): void {
  waveTitle(ctx, title, W / 2, 50, t, F_TITLE, [color, CREAM]);

  panel(ctx, 40, 72, 176, 112);
  const k = Math.min(1, (t - startedAt) / 1.2);
  const ease = 1 - Math.pow(1 - k, 3);

  outlined(ctx, `УРОВЕНЬ ${stats.levelNumber}`, W / 2, 92, DIM, F_TEXT);
  outlined(ctx, 'ОЧКИ', W / 2, 116, DIM, F_SMALL);
  outlined(ctx, String(Math.round(stats.score * ease)).padStart(6, '0'), W / 2, 132, GOLD, F_BIG);
  outlined(ctx, 'ВРАГОВ УНИЧТОЖЕНО', W / 2, 152, DIM, F_SMALL);
  outlined(ctx, String(Math.round(stats.killed * ease)), W / 2, 168, CREAM, F_BIG);

  if (k >= 1) {
    const blink = 0.55 + 0.45 * Math.sin(t * 4);
    ctx.globalAlpha = blink;
    outlined(ctx, hint, W / 2, 204, GOLD, F_TEXT);
    ctx.globalAlpha = 1;
  }
}

/** Отдельная отрисовка паузы поверх кадра уровня (вызывает main.ts). */
export function drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
  const t = now();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 40, 78, 176, 80);
  waveTitle(ctx, 'ПАУЗА', W / 2, 108, t, F_TITLE, [GOLD, ORANGE]);
  outlined(ctx, 'ESC/P - ПРОДОЛЖИТЬ', W / 2, 136, CREAM, F_SMALL);
  outlined(ctx, 'M - В МЕНЮ', W / 2, 148, DIM, F_SMALL);
}

/**
 * Подсказка управления поверх поля в начале уровня (PLAN.md, M9: «управление описано на экране»).
 * Видна первые `durationSec` секунд, затем гаснет за 0,5 с. `elapsedSec` считает вызывающий код по логическим шагам.
 */
export function drawControlsHint(ctx: CanvasRenderingContext2D, elapsedSec: number, durationSec = 6): void {
  if (elapsedSec < 0 || elapsedSec >= durationSec) return;
  const fadeStart = durationSec - 0.5;
  const alpha = elapsedSec < fadeStart ? 1 : Math.max(0, (durationSec - elapsedSec) / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  // Панель держится выше базы (она занимает низ поля с y=184), чтобы не закрывать
  // ни базу, ни танк игрока в первые секунды уровня.
  panel(ctx, 8, 130, 224, 48);
  outlined(ctx, 'СТРЕЛКИ / WASD - ДВИЖЕНИЕ', W / 2 - 8, 144, CREAM, F_SMALL);
  outlined(ctx, 'ПРОБЕЛ / J - ОГОНЬ', W / 2 - 8, 156, CREAM, F_SMALL);
  outlined(ctx, 'ESC / P - ПАУЗА', W / 2 - 8, 168, CREAM, F_SMALL);
  ctx.restore();
}

/** Результаты уровня и игры: нужны, чтобы сбрасывать таймер анимации при смене экрана. */
export interface ResultStats {
  score: number;
  killed: number;
  levelNumber: number;
}

/** Состояние меню: выбранный уровень и звук (PLAN.md, M8). */
export interface MenuInfo {
  menuLevel: number;
  soundOn: boolean;
}

let lastState: string | null = null;
let stateStartedAt = 0;

/**
 * Рисует текущий экран вне уровня. Не меняет состояние приложения (PLAN.md, раздел 3.2).
 * Экран итогов получает статистику из переданного `stats`.
 */
export function drawScreen(
  ctx: CanvasRenderingContext2D,
  app: App,
  stats?: ResultStats,
  menu?: MenuInfo,
): void {
  const t = now();
  if (app.state !== lastState) {
    lastState = app.state;
    stateStartedAt = t;
  }

  ctx.save();
  drawBackground(ctx, t);

  switch (app.state) {
    case 'loading':
      drawLoading(ctx, t);
      break;
    case 'menu':
      if (menu) drawMenu(ctx, t, menu);
      break;
    case 'levelComplete':
      if (stats) {
        drawResult(ctx, t, stateStartedAt, 'УРОВЕНЬ ПРОЙДЕН', GOLD, 'ENTER - СЛЕДУЮЩИЙ УРОВЕНЬ', stats);
      }
      break;
    case 'gameOver':
      if (stats) {
        drawResult(ctx, t, stateStartedAt, 'ИГРА ОКОНЧЕНА', RED, 'ENTER - В МЕНЮ', stats);
      }
      break;
    default:
      // playing/paused рисуются в main.ts поверх кадра уровня.
      break;
  }
  ctx.restore();
}
