import { LEVEL_SIZE, TILE_CHARS, isTankPassable } from '../config/tiles';
import { LevelError, type Level, type TilePoint } from './format';

export const ENEMY_CODES = ['B', 'F', 'P', 'A'] as const;
export const ENEMIES_PER_LEVEL = 20;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function parsePoint(v: unknown, label: string, problems: string[]): TilePoint | null {
  if (!isObj(v) || !isInt(v.x) || !isInt(v.y)) {
    problems.push(`${label}: ожидаются целые координаты x и y`);
    return null;
  }
  return { x: v.x, y: v.y };
}

/**
 * Проверяет сырой JSON уровня и возвращает типизированный Level либо список ошибок.
 * Правила — PLAN.md, приложение А.
 */
export function validateLevel(raw: unknown): { ok: true; level: Level } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  if (!isObj(raw)) {
    return { ok: false, problems: ['корень файла должен быть объектом'] };
  }

  if (!isInt(raw.number) || raw.number < 1) problems.push('number: ожидается целое число от 1');
  if (!isInt(raw.palette) || raw.palette < 0) problems.push('palette: ожидается целое число от 0');
  if (typeof raw.spawnIntervalSec !== 'number' || !(raw.spawnIntervalSec > 0)) {
    problems.push('spawnIntervalSec: ожидается число больше 0');
  }

  // Сетка.
  const map: string[] = [];
  if (!Array.isArray(raw.map)) {
    problems.push('map: ожидается массив строк');
  } else {
    if (raw.map.length !== LEVEL_SIZE) {
      problems.push(`map: ожидается ${LEVEL_SIZE} строк, найдено ${raw.map.length}`);
    }
    raw.map.forEach((row, y) => {
      if (typeof row !== 'string') {
        problems.push(`map, строка ${y + 1}: не строка`);
        return;
      }
      if (row.length !== LEVEL_SIZE) {
        problems.push(`map, строка ${y + 1}: ожидается ${LEVEL_SIZE} символов, найдено ${row.length}`);
      }
      for (let x = 0; x < row.length; x++) {
        if (!(row[x] in TILE_CHARS)) {
          problems.push(`map, строка ${y + 1}, столбец ${x + 1}: неизвестный символ «${row[x]}»`);
        }
      }
      map.push(row);
    });
  }

  // База: ровно 4 клетки E, образующие квадрат 2×2.
  const basePoints: TilePoint[] = [];
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === 'E') basePoints.push({ x, y });
  });
  if (basePoints.length !== 4) {
    problems.push(`база: ожидается ровно 4 клетки E, найдено ${basePoints.length}`);
  } else {
    const xs = basePoints.map((p) => p.x);
    const ys = basePoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const isSquare = basePoints.every(
      (p) => p.x - minX < 2 && p.y - minY < 2,
    ) && new Set(basePoints.map((p) => `${p.x},${p.y}`)).size === 4;
    if (!isSquare) problems.push('база: клетки E должны образовывать квадрат 2×2');
  }

  const inField = (p: TilePoint) => p.x >= 0 && p.y >= 0 && p.x < LEVEL_SIZE && p.y < LEVEL_SIZE;
  const tileAt = (p: TilePoint) => map[p.y]?.[p.x];
  const isSpawnable = (p: TilePoint) => {
    const ch = tileAt(p);
    if (ch === undefined) return false;
    return isTankPassable(TILE_CHARS[ch]);
  };
  const occupied = new Set<string>();
  const checkSpawn = (p: TilePoint, label: string) => {
    if (!inField(p)) {
      problems.push(`${label}: координаты (${p.x}, ${p.y}) за пределами поля`);
      return;
    }
    if (!isSpawnable(p)) {
      problems.push(`${label}: клетка (${p.x}, ${p.y}) непроходима для танка`);
    }
    const key = `${p.x},${p.y}`;
    if (occupied.has(key)) problems.push(`${label}: клетка (${p.x}, ${p.y}) занята другой точкой появления`);
    occupied.add(key);
  };

  // Игрок.
  const player = parsePoint(raw.player, 'player', problems);
  if (player) checkSpawn(player, 'player');
  if (raw.player === undefined) problems.push('player: точка появления игрока обязательна');

  // Враги.
  const enemySpawns: TilePoint[] = [];
  if (!Array.isArray(raw.enemySpawns) || raw.enemySpawns.length === 0) {
    problems.push('enemySpawns: нужна хотя бы одна точка появления врагов');
  } else {
    raw.enemySpawns.forEach((v, i) => {
      const p = parsePoint(v, `enemySpawns[${i}]`, problems);
      if (p) {
        checkSpawn(p, `enemySpawns[${i}]`);
        enemySpawns.push(p);
      }
    });
  }

  // Состав врагов.
  const enemies: string[] = [];
  if (!Array.isArray(raw.enemies)) {
    problems.push('enemies: ожидается массив кодов');
  } else {
    if (raw.enemies.length !== ENEMIES_PER_LEVEL) {
      problems.push(`enemies: ожидается ровно ${ENEMIES_PER_LEVEL} врагов, найдено ${raw.enemies.length}`);
    }
    raw.enemies.forEach((code, i) => {
      if (typeof code !== 'string' || !(ENEMY_CODES as readonly string[]).includes(code)) {
        problems.push(`enemies[${i}]: неизвестный тип «${String(code)}» (допустимо B, F, P, A)`);
      } else {
        enemies.push(code);
      }
    });
  }

  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    level: {
      number: raw.number as number,
      palette: raw.palette as number,
      spawnIntervalSec: raw.spawnIntervalSec as number,
      enemies,
      player: player!,
      enemySpawns,
      map,
    },
  };
}

/** Валидирует и бросает LevelError со всем списком проблем. */
export function parseLevel(raw: unknown): Level {
  const res = validateLevel(raw);
  if (!res.ok) throw new LevelError(res.problems);
  return res.level;
}
