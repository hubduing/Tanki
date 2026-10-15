import type { Dir } from '../core/dir';

/**
 * Пиксель-арт в стиле классических «Танчиков». Всё рисуется процедурно (без внешних файлов):
 * тайлы кэшируются в офскрин-канвасах, танки рисуются по прямоугольникам с поворотом
 * через таблицу отображений, чтобы все координаты оставались целыми пикселями.
 */

/** Палитра танка: корпус, тень, блик, гусеница. */
export interface TankPalette {
  hull: string;
  shade: string;
  light: string;
  track: string;
}

export const PLAYER_PALETTE: TankPalette = {
  hull: '#e0b020',
  shade: '#7a5410',
  light: '#fff3a0',
  track: '#3a3a3a',
};

/** Палитры врагов по типу (PLAN.md, приложение Б). */
export const ENEMY_PALETTES: Record<string, TankPalette> = {
  B: { hull: '#a8a8a8', shade: '#5a5a5a', light: '#e8e8e8', track: '#3a3a3a' },
  F: { hull: '#d8d8d8', shade: '#7c7c7c', light: '#ffffff', track: '#333333' },
  P: { hull: '#c0a470', shade: '#6e5a30', light: '#f2e2b0', track: '#3a3a3a' },
  A: { hull: '#4f8a3a', shade: '#2a4a1e', light: '#9ae07a', track: '#2a2a2a' },
};

/** Пересчёт прямоугольника из локальной системы «ствол вверх» в систему направления. */
function mapRect(dir: Dir, x: number, y: number, w: number, h: number): [number, number, number, number] {
  switch (dir) {
    case 'up':
      return [x, y, w, h];
    case 'down':
      return [16 - x - w, 16 - y - h, w, h];
    case 'right':
      return [16 - y - h, x, h, w];
    case 'left':
      return [y, 16 - x - w, h, w];
  }
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Рисует танк 16×16 в точке (ox, oy) с направлением dir. */
export function drawTankSprite(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dir: Dir,
  p: TankPalette,
): void {
  const R = (color: string, x: number, y: number, w: number, h: number): void => {
    const [a, b, cw, ch] = mapRect(dir, x, y, w, h);
    fill(ctx, color, ox + a, oy + b, cw, ch);
  };

  // Гусеницы: 3 пикселя слева и справа, с полосами протектора.
  for (const tx of [0, 13]) {
    R(p.track, tx, 0, 3, 16);
    R('#000000', tx === 0 ? 0 : 15, 0, 1, 16);
    for (let i = 1; i < 16; i += 3) R('#777777', tx, i, 3, 1);
  }

  // Корпус и его тень с блеском.
  R(p.hull, 3, 1, 10, 14);
  R(p.shade, 3, 1, 1, 14);
  R(p.shade, 12, 1, 1, 14);
  R(p.shade, 3, 14, 10, 1);
  R(p.light, 4, 1, 8, 1);
  R(p.light, 4, 2, 1, 11);

  // Ствол и дульный тормоз.
  R('#1a1a1a', 7, 0, 2, 7);
  R('#555555', 7, 0, 2, 1);

  // Башня с люком.
  R('#000000', 4, 4, 8, 8);
  R(p.hull, 5, 5, 6, 6);
  R(p.light, 5, 5, 6, 1);
  R(p.shade, 5, 10, 6, 1);
  R(p.shade, 7, 7, 2, 2);
}

/**
 * Танк физического размера `size` px (TANK_PX): спрайт 16×16 уменьшается ближайшим соседом.
 * Уменьшенные варианты кэшируются по направлению и палитре, чтобы не рисовать каждый кадр заново.
 */
const scaledCache = new WeakMap<TankPalette, Map<string, HTMLCanvasElement>>();
export function drawTankSpriteScaled(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  size: number,
  dir: Dir,
  p: TankPalette,
): void {
  let byDir = scaledCache.get(p);
  if (!byDir) {
    byDir = new Map();
    scaledCache.set(p, byDir);
  }
  let c = byDir.get(`${dir}:${size}`);
  if (!c) {
    const full = makeCanvas(16, 16);
    drawTankSprite(full.getContext('2d')!, 0, 0, dir, p);
    c = makeCanvas(size, size);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(full, 0, 0, size, size);
    byDir.set(`${dir}:${size}`, c);
  }
  ctx.drawImage(c, ox, oy);
}

/** Пиксельный спрайт 16×16 из строк: символ → цвет. Пустой символ ('.') пропускается. */
function paintPixels(ctx: CanvasRenderingContext2D, rows: string[], palette: Record<string, string>, ox: number, oy: number, scale: number): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (c) fill(ctx, c, ox + x * scale, oy + y * scale, scale, scale);
    }
  });
}

/** Офскрин-канвас для тайла 16×16, рисуется один раз. */
function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Кирпич: кладка с чередующимися швами. */
let brickCanvas: HTMLCanvasElement | null = null;
function getBrick(): HTMLCanvasElement {
  if (brickCanvas) return brickCanvas;
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d')!;
  fill(g, '#a8461a', 0, 0, 16, 16);
  for (let band = 0; band < 4; band++) {
    const y = band * 4;
    // Верх кирпича — светлее.
    fill(g, '#c86430', 0, y, 16, 1);
    // Горизонтальный шов внизу полосы.
    fill(g, '#5a1e08', 0, y + 3, 16, 1);
    // Вертикальные швы: сдвиг в каждой второй полосе.
    const joints = band % 2 === 0 ? [7] : [3, 11];
    for (const jx of joints) fill(g, '#5a1e08', jx, y, 1, 3);
  }
  brickCanvas = c;
  return c;
}

/** Сталь: плиты с заклёпками. */
let steelCanvas: HTMLCanvasElement | null = null;
function getSteel(): HTMLCanvasElement {
  if (steelCanvas) return steelCanvas;
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d')!;
  fill(g, '#6e7680', 0, 0, 16, 16);
  for (const [px, py] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
    fill(g, '#a4acb6', px + 1, py + 1, 6, 6);
    fill(g, '#dfe6ee', px + 1, py + 1, 6, 1);
    fill(g, '#dfe6ee', px + 1, py + 1, 1, 6);
    fill(g, '#4a5058', px + 1, py + 6, 6, 1);
    fill(g, '#4a5058', px + 6, py + 1, 1, 6);
    fill(g, '#eef2f6', px + 2, py + 2, 1, 1);
    fill(g, '#eef2f6', px + 5, py + 2, 1, 1);
    fill(g, '#eef2f6', px + 2, py + 5, 1, 1);
  }
  steelCanvas = c;
  return c;
}

/** Вода: тёмно-синий фон с волнами. */
let waterCanvas: HTMLCanvasElement | null = null;
function getWater(): HTMLCanvasElement {
  if (waterCanvas) return waterCanvas;
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d')!;
  fill(g, '#1a3a9e', 0, 0, 16, 16);
  for (const y of [2, 7, 12]) {
    fill(g, '#4a74e0', 2, y, 4, 1);
    fill(g, '#4a74e0', 9, y, 4, 1);
    fill(g, '#4a74e0', 5, y + 2, 4, 1);
    fill(g, '#4a74e0', 12, y + 2, 2, 1);
  }
  waterCanvas = c;
  return c;
}

/** Лёд: светло-голубой с белыми бликами. */
let iceCanvas: HTMLCanvasElement | null = null;
function getIce(): HTMLCanvasElement {
  if (iceCanvas) return iceCanvas;
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d')!;
  fill(g, '#bfe6f4', 0, 0, 16, 16);
  for (const [x, y] of [[2, 3], [3, 4], [10, 9], [11, 10], [6, 13], [7, 14]]) {
    fill(g, '#ffffff', x, y, 2, 1);
  }
  iceCanvas = c;
  return c;
}

/** Лес: густая крона из тёмных и светлых пятен. Рисуется поверх танков. */
let forestCanvas: HTMLCanvasElement | null = null;
function getForest(): HTMLCanvasElement {
  if (forestCanvas) return forestCanvas;
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d')!;
  fill(g, '#1a5e1a', 0, 0, 16, 16);
  const spots: Array<[number, number, string]> = [
    [1, 1, '#2e8a2e'], [5, 0, '#237a23'], [10, 2, '#2e8a2e'], [14, 1, '#174f17'],
    [2, 6, '#174f17'], [7, 5, '#2e8a2e'], [12, 7, '#237a23'], [0, 11, '#2e8a2e'],
    [5, 10, '#174f17'], [10, 12, '#2e8a2e'], [14, 10, '#237a23'], [3, 14, '#237a23'],
    [8, 15, '#174f17'], [13, 14, '#2e8a2e'],
  ];
  for (const [x, y, col] of spots) fill(g, col, x, y, 2, 2);
  forestCanvas = c;
  return c;
}

/** Тип тайла, который можно отрисовать из кэша. */
export type TileArt = 'brick' | 'steel' | 'water' | 'ice' | 'forest';

const TILE_CACHE: Record<TileArt, () => HTMLCanvasElement> = {
  brick: getBrick,
  steel: getSteel,
  water: getWater,
  ice: getIce,
  forest: getForest,
};

/** Полный тайл 16×16 из кэша. */
export function drawTile(ctx: CanvasRenderingContext2D, art: TileArt, x: number, y: number): void {
  ctx.drawImage(TILE_CACHE[art](), x, y);
}

/**
 * Четверть кирпичного тайла 8×8 (квадрант q: 0 TL, 1 TR, 2 BL, 3 BR).
 * Используется для поквадрантного разрушения кирпича.
 */
export function drawBrickQuadrant(ctx: CanvasRenderingContext2D, x: number, y: number, q: number): void {
  const sx = (q & 1) * 8;
  const sy = (q >> 1) * 8;
  ctx.drawImage(getBrick(), sx, sy, 8, 8, x + sx, y + sy, 8, 8);
}

/**
 * Орёл — эмблема базы. Левая половина 8×16, правая зеркальная.
 * Символы: g — золото, d — тень, '.' — пусто.
 */
const EAGLE_LEFT: string[] = [
  '......dg',
  '.....dgg',
  '...ddggg',
  '..dggggg',
  '.dgggggg',
  'dggggggg',
  'ggggggg.',
  'gggggg..',
  'gggg....',
  'ggg.....',
  'gg......',
  'd.......',
  '........',
  '........',
  '........',
  '........',
];

function eagleRows(): string[] {
  return EAGLE_LEFT.map((row) => row + row.split('').reverse().join(''));
}

/** База 2×2 тайла (32×32) в точке (x, y). Если база разрушена — серый остов. */
export function drawBaseSprite(ctx: CanvasRenderingContext2D, x: number, y: number, alive: boolean): void {
  fill(ctx, '#000000', x, y, 32, 32);
  const palette = alive
    ? { g: '#f0c040', d: '#8a5a00' }
    : { g: '#5a5a5a', d: '#2a2a2a' };
  paintPixels(ctx, eagleRows(), palette, x, y, 2);
}

/** Пуля 4×4 со скруглёнными углами. */
export function drawBulletSprite(ctx: CanvasRenderingContext2D, x: number, y: number, owner: 'player' | 'enemy'): void {
  const color = owner === 'player' ? '#ffffff' : '#f8c060';
  fill(ctx, color, x + 1, y, 2, 4);
  fill(ctx, color, x, y + 1, 4, 2);
}

/** Значок бонуса 16×16: цветная рамка и буква. */
export function drawBonusSprite(ctx: CanvasRenderingContext2D, x: number, y: number, code: string, color: string): void {
  fill(ctx, '#000000', x, y, 16, 16);
  fill(ctx, color, x, y, 16, 1);
  fill(ctx, color, x, y + 15, 16, 1);
  fill(ctx, color, x, y, 1, 16);
  fill(ctx, color, x + 15, y, 1, 16);
  fill(ctx, color, x + 2, y + 2, 12, 12);
  ctx.fillStyle = '#000000';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, x + 8, y + 11);
  ctx.textAlign = 'start';
}

/**
 * Взрыв: вспышка из 8 лучей, растягивающаяся к центру. `progress` в [0, 1]:
 * 0 — раскрытие лучей, 0.5 — максимум, 1 — затухание.
 */
export function drawExplosionSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  life: number,
  maxLife: number,
): void {
  const progress = 1 - life / maxLife;
  const radius = progress < 0.5 ? Math.round(progress * 16) : Math.round((1 - progress) * 16);
  if (radius <= 0) return;
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#ff8a1f';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const dx = Math.round(Math.cos(a) * radius);
    const dy = Math.round(Math.sin(a) * radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.4 + 0.6 * Math.abs(0.5 - progress) * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Искра попадания: 4-точечный крест, мигает к концу жизни. */
export function drawSparkSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, life: number, maxLife: number): void {
  const progress = 1 - life / maxLife;
  const alpha = 0.8 * (1 - progress);
  if (alpha <= 0.05) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff3a0';
  const r = 2;
  ctx.fillRect(cx - r, cy - r, r * 2, 2);
  ctx.fillRect(cx - r, cy - r, 2, r * 2);
  ctx.globalAlpha = 1;
}

/**
 * Плавающий текст очков над исчезающей сущностью. `life` убывает,
 * текст поднимается вверх и затухает.
 */
export function drawFloatTextSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  life: number,
  maxLife: number,
  color: string = '#fff4d6',
): void {
  const progress = 1 - life / maxLife;
  const offsetY = Math.round(-progress * 10);
  const alpha = 1 - progress;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + offsetY);
  ctx.textAlign = 'start';
  ctx.globalAlpha = 1;
}
