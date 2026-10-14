/** Логическое разрешение экрана (см. PLAN.md, D3). */
export const LOGICAL_WIDTH = 256;
export const LOGICAL_HEIGHT = 224;

/**
 * Целочисленный коэффициент масштабирования, при котором логический экран
 * помещается в окно целиком. Минимум 1: при окне меньше исходного размера
 * canvas просто не масштабируется (лучше обрезка, чем дробные пиксели).
 */
export function computeIntegerScale(
  windowWidth: number,
  windowHeight: number,
  logicalWidth: number = LOGICAL_WIDTH,
  logicalHeight: number = LOGICAL_HEIGHT,
): number {
  if (!(windowWidth > 0) || !(windowHeight > 0)) return 1;
  const sx = Math.floor(windowWidth / logicalWidth);
  const sy = Math.floor(windowHeight / logicalHeight);
  return Math.max(1, Math.min(sx, sy));
}
