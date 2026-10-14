/** Виды тайлов (PLAN.md, приложение А). */
export type TileKind = 'empty' | 'brick' | 'steel' | 'water' | 'forest' | 'ice' | 'base';

/** Соответствие символов сетки уровня видам тайлов. */
export const TILE_CHARS: Readonly<Record<string, TileKind>> = {
  '.': 'empty',
  '#': 'brick',
  '@': 'steel',
  '~': 'water',
  '*': 'forest',
  '=': 'ice',
  E: 'base',
};

export const LEVEL_SIZE = 13;

/** Танк проходит по пустому тайлу, лесу и льду; остальное — препятствие. */
export function isTankPassable(kind: TileKind): boolean {
  return kind === 'empty' || kind === 'forest' || kind === 'ice';
}

/** Битовые маски квадрантов кирпича 8×8 в тайле 16×16 (TL, TR, BL, BR). */
export const BRICK_FULL = 0b1111;
