/** Точка в координатах тайлов: столбец x, строка y. */
export interface TilePoint {
  x: number;
  y: number;
}

/** Уровень в виде, удобном для логики (после валидации). Формат — PLAN.md, приложение А. */
export interface Level {
  number: number;
  palette: number;
  /** Задержка между появлениями врагов, секунд. */
  spawnIntervalSec: number;
  /** Ровно 20 кодов типов врагов: B, F, P, A. */
  enemies: string[];
  player: TilePoint;
  enemySpawns: TilePoint[];
  /** 13 строк по 13 символов. */
  map: string[];
}

/** Ошибки валидации на русском, с указанием места. */
export class LevelError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Ошибки уровня:\n- ${problems.join('\n- ')}`);
    this.name = 'LevelError';
  }
}
