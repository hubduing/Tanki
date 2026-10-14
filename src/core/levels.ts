/**
 * Последовательность уровней (PLAN.md, M8). Порядок и число уровней задаёт этот список,
 * а не файловая система: добавление уровня = файл в public/levels/ + строка здесь.
 */
export const LEVEL_FILES: readonly string[] = [
  '01.json',
  '02.json',
  '03.json',
  '04.json',
  '05.json',
  '06.json',
  '07.json',
  '08.json',
  '09.json',
  '10.json',
  '11.json',
  '12.json',
];

/** Номер уровня (1-based) в URL файла; возвращает null, если номер вне последовательности. */
export function levelFileFor(number: number): string | null {
  if (!Number.isInteger(number) || number < 1 || number > LEVEL_FILES.length) return null;
  return LEVEL_FILES[number - 1];
}

/** Следующий номер уровня или null, если это последний. */
export function nextLevelNumber(current: number): number | null {
  return current < LEVEL_FILES.length ? current + 1 : null;
}
