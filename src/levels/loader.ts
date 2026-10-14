import { parseLevel } from './validate';
import type { Level } from './format';

/** Загружает уровень из внешнего JSON (PLAN.md, D6). Ошибки сети и данных — понятными сообщениями. */
export async function loadLevel(url: string): Promise<Level> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Не удалось загрузить уровень ${url}: HTTP ${res.status}`);
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new Error(`Файл уровня ${url} не является корректным JSON`);
  }
  return parseLevel(raw);
}
