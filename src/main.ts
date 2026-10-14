import { App } from './core/app';
import { Input, attachInput } from './input/input';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, computeIntegerScale } from './render/scale';
import { drawScreen } from './render/screens';
import { drawForestLayer, drawMapBase } from './render/map';
import { loadLevel } from './levels/loader';
import { World } from './world/world';
import { stepWorld } from './world/step';
import { drawTank } from './render/tank';
import { drawBullets } from './render/bullets';
import { drawDebug } from './render/debug';
import { drawEnemy } from './render/enemy';
import { drawHud } from './render/hud';
import { drawBonuses } from './render/bonus';
import { loadSave, writeSave } from './core/save';
import { levelFileFor, nextLevelNumber } from './core/levels';
import { Audio } from './audio/audio';

const audio = new Audio();
// Настройка звука из сохранения (PLAN.md, M8). Переключатель — клавиша M в меню.
audio.setEnabled(loadSave().soundOn);
// Браузер разрешает звук только после жеста пользователя: разблокируем на первом нажатии.
window.addEventListener('keydown', () => audio.unlock(), { once: true });
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

/** Текущий уровень; null, пока не загружен. Загрузка асинхронна — до её конца показывается экран меню. */
let world: World | null = null;
/** Номер текущего уровня (1-based) из последовательности в core/levels.ts. */
let currentLevel = loadSave().unlockedLevel;
let overlayError: string | null = null;

/** Загружает уровень по номеру и создаёт свежий мир. Ошибку показывает оверлеем. */
function loadLevelNumber(n: number): void {
  const file = levelFileFor(n);
  if (!file) {
    overlayError = `уровень ${n} не найден`;
    return;
  }
  currentLevel = n;
  // Сразу убираем старый мир: иначе его итог снова переведёт игру в экран итогов.
  world = null;
  loadLevel(`${import.meta.env.BASE_URL}levels/${file}`)
    .then((level) => {
      world = World.fromLevel(level);
    })
    .catch((err: unknown) => {
      console.error(err);
      overlayError = err instanceof Error ? err.message : String(err);
    });
}
loadLevelNumber(currentLevel);

/** Итог уровня: рекорд сохраняется, прогресс двигается к следующему уровню. */
function recordOutcome(w: World): void {
  const save = loadSave();
  save.highScore = Math.max(save.highScore, w.score);
  if (w.outcome === 'won') {
    const next = nextLevelNumber(currentLevel);
    save.unlockedLevel = Math.max(save.unlockedLevel, next ?? currentLevel);
  }
  writeSave(save);
}

const found = document.getElementById('screen');
if (!(found instanceof HTMLCanvasElement)) {
  throw new Error('Canvas #screen не найден');
}
const canvas: HTMLCanvasElement = found;
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Не удалось получить 2D-контекст');
}

canvas.width = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;
ctx.imageSmoothingEnabled = false;

function applyScale(): void {
  const scale = computeIntegerScale(window.innerWidth, window.innerHeight);
  canvas.style.width = `${LOGICAL_WIDTH * scale}px`;
  canvas.style.height = `${LOGICAL_HEIGHT * scale}px`;
}
window.addEventListener('resize', applyScale);
applyScale();

const app = new App();
const input = new Input();
attachInput(input, window);
app.finishLoading();

// Отладочный оверлей (F3): состояние, шаги, кадры и FPS.
const overlay = document.getElementById('fps') as HTMLDivElement;
let debugVisible = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    debugVisible = !debugVisible;
    overlay.style.display = debugVisible ? 'block' : 'none';
  }
});

// F4: сетка, выравнивание и хитбокс танка (PLAN.md, M3).
let debugGrid = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'F4') debugGrid = !debugGrid;
});

let frames = 0;
let fpsFrames = 0;
let fpsWindowStart = performance.now();
let fps = 0;

function frame(now: number): void {
  // 1. Команды: ввод превращается в переходы состояний.
  for (const cmd of input.takePressed()) {
    const before = app.state;
    app.handle(cmd);
    // Старт нового мира: из итогов «далее» (уровень пройден) или «рестарт» (игра окончена).
    if (before === 'levelComplete' && app.state === 'playing') {
      const next = nextLevelNumber(currentLevel);
      loadLevelNumber(next ?? currentLevel);
    } else if (before === 'menu' && app.state === 'playing') {
      loadLevelNumber(currentLevel);
    }
  }

  // 2. Логика: фиксированные шаги, только в состоянии «playing».
  const steps = app.tick(now);
  if (world && steps > 0) {
    for (let i = 0; i < steps; i++) {
      stepWorld(world, { dir: input.heldDirection(), fire: input.isHeld('fire') });
      // Итог мира переводит приложение в экран итогов или «игра окончена».
      if (world.outcome !== 'playing') {
        recordOutcome(world);
        app.machine.go(world.outcome === 'won' ? 'levelComplete' : 'gameOver');
        break;
      }
    }
  }
  // События мира уходят звуку; без разблокированного аудио они просто отбрасываются.
  if (world) audio.play(world.drainEvents());

  // 3. Рендер: всегда, даже на паузе.
  const inLevel = app.state === 'playing' || app.state === 'paused';
  if (inLevel && world) {
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    drawMapBase(ctx!, world);
    drawTank(ctx!, world.player);
    for (const e of world.enemies) drawEnemy(ctx!, e);
    drawBonuses(ctx!, world);
    drawBullets(ctx!, world);
    drawForestLayer(ctx!, world);
    drawHud(ctx!, world, 240);
    if (debugGrid) drawDebug(ctx!, world);
    if (app.state === 'paused') {
      ctx!.fillStyle = '#fff';
      ctx!.font = '12px monospace';
      ctx!.textAlign = 'center';
      ctx!.fillText('ПАУЗА', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
      ctx!.textAlign = 'start';
    }
  } else {
    drawScreen(ctx!, app, world ? { score: world.score, killed: world.killed, levelNumber: world.levelNumber } : undefined);
    if (overlayError) {
      ctx!.fillStyle = '#f55';
      ctx!.font = '8px monospace';
      ctx!.fillText(overlayError.slice(0, 40), 8, 210);
    }
  }

  frames++;
  fpsFrames++;
  if (now - fpsWindowStart >= 1000) {
    fps = fpsFrames;
    fpsFrames = 0;
    fpsWindowStart = now;
  }
  if (debugVisible) {
    overlay.textContent =
      `состояние: ${app.state}\nшаги: ${app.logicSteps}\nкадры: ${frames}\nFPS: ${fps}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
