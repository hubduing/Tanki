/** Направления движения. Совпадают с командами ввода up/down/left/right. */
export type Dir = 'up' | 'down' | 'left' | 'right';

/** Единичный вектор направления в пикселях поля (ось y вниз). */
export const DIR_VEC: Readonly<Record<Dir, { dx: number; dy: number }>> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function opposite(d: Dir): Dir {
  switch (d) {
    case 'up':
      return 'down';
    case 'down':
      return 'up';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

export function isHorizontal(d: Dir): boolean {
  return d === 'left' || d === 'right';
}
