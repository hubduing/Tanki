/**
 * Выбор уровня в меню (PLAN.md, M8). Чистая функция: не знает про DOM и хранилище,
 * поэтому её можно проверить тестами.
 */

/**
 * Сдвигает выбранный уровень на delta, не выходя за пределы открытых уровней.
 * Выход за границы игнорируется: выбор остаётся прежним.
 */
export function stepMenuLevel(current: number, delta: number, unlocked: number, total: number): number {
  const max = Math.min(unlocked, total);
  const next = current + delta;
  if (!Number.isInteger(next) || next < 1 || next > max) return current;
  return next;
}

/** Приводит выбор к допустимому диапазону, если сохранение или список уровней изменились. */
export function clampMenuLevel(current: number, unlocked: number, total: number): number {
  const max = Math.max(1, Math.min(unlocked, total));
  if (!Number.isInteger(current) || current < 1) return 1;
  return Math.min(current, max);
}
