import { LOGICAL_HEIGHT, LOGICAL_WIDTH, computeIntegerScale } from './render/scale';

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

// Отладочный счётчик кадров (включается клавишей F3 — см. M1 оверлей).
const fpsEl = document.getElementById('fps') as HTMLDivElement;
let fpsFrames = 0;
let fpsWindowStart = performance.now();
let debugVisible = false;

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    debugVisible = !debugVisible;
    fpsEl.style.display = debugVisible ? 'block' : 'none';
  }
});

function frame(now: number): void {
  // Временный кадр M0: чёрный экран с надписью, пока не реализован цикл (M1).
  ctx!.fillStyle = '#000';
  ctx!.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx!.fillStyle = '#fff';
  ctx!.font = '8px monospace';
  ctx!.fillText('TANCHIKI M0', 92, 112);

  fpsFrames++;
  if (now - fpsWindowStart >= 1000) {
    if (debugVisible) {
      fpsEl.textContent = `FPS: ${fpsFrames}`;
    }
    fpsFrames = 0;
    fpsWindowStart = now;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
