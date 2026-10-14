// Генератор уровней 02–12 (PLAN.md, M9). Выводит JSON в public/levels/.
// Карты фиксированы шаблонами: база и игрок всегда в проходимой зоне, валидатор проверит.
// Запуск: node scripts/gen-levels.mjs

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'levels');

/** Базовый каркас: база 2×2 внизу по центру (строки 11–12, столбцы 6–7), игрок у базы. */
const BASE_ROWS = [
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.............',
  '.....#.#.....',
  '.....#EE#....',
  '.....#EE#....',
];

/** Шаблонные блоки: заменяют пустые клетки в верхней части поля. */
const PATTERNS = [
  // Кирпичные колонны.
  ['..##...##....', '..##...##....', '.............', '.##.@@.@@.##.', '.##.@@.@@.##.', '.............', '..###...###..', '..###...###..'],
  // Лес и вода.
  ['..**...~~....', '..**...~~....', '.............', '~~..##.##..~~', '~~..##.##..~~', '.............', '..**.....**..', '..**.....**..'],
  // Лёд и сталь.
  ['=============', '.@@.......@@.', '.@@.......@@.', '.............', '..##.....##..', '..##.....##..', '=============', '.............'],
  // Лабиринт.
  ['.#.#.#.#.#.#.', '.#.#.#.#.#.#.', '.............', '#.#.#.#.#.#.#', '#.#.#.#.#.#.#', '.............', '.#.#.#.#.#.#.', '.#.#.#.#.#.#.'],
];

/** Состав врагов: 20 штук, с ростом сложности по номеру уровня. */
function enemiesFor(n) {
  const b = Math.max(2, 10 - Math.floor(n / 2));
  const f = Math.min(6, 2 + Math.floor(n / 3));
  const p = Math.min(5, 2 + Math.floor(n / 4));
  const a = 20 - b - f - p;
  if (a < 0) throw new Error(`уровень ${n}: состав не сходится`);
  return [...Array(b).fill('B'), ...Array(f).fill('F'), ...Array(p).fill('P'), ...Array(a).fill('A')];
}

/** Собирает сетку 13×13: верхняя часть из шаблона, низ — базовый каркас. */
function buildMap(n) {
  const pattern = PATTERNS[(n - 2) % PATTERNS.length];
  const rows = [];
  for (let y = 0; y < 13; y++) {
    if (y < 8) rows.push(pattern[y] ?? '.............');
    else rows.push(BASE_ROWS[y]);
  }
  return rows;
}

for (let n = 2; n <= 12; n++) {
  const level = {
    number: n,
    palette: (n - 1) % 4,
    spawnIntervalSec: Math.max(1.2, +(2.0 - (n - 1) * 0.07).toFixed(2)),
    enemies: enemiesFor(n),
    player: { x: 4, y: 12 },
    enemySpawns: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 12, y: 0 },
    ],
    map: buildMap(n),
  };
  const name = String(n).padStart(2, '0') + '.json';
  writeFileSync(join(outDir, name), JSON.stringify(level, null, 2) + '\n', 'utf8');
  console.log('записан', name);
}
