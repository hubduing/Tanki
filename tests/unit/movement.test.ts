import { describe, expect, it } from 'vitest';
import { PLAYER_SPEED_FP, PLAYER_SPEED_PX_S, STEP_HZ } from '../../src/config/balance';
import { ALIGN_PX, FIELD_ORIGIN, FP, TANK_PX } from '../../src/config/geometry';
import type { Dir } from '../../src/core/dir';
import { Input } from '../../src/input/input';
import { stepTank } from '../../src/world/movement';
import { placeTank, tankPx, tilePx, worldFromRows } from '../helpers/world';
import type { World } from '../../src/world/world';

function run(world: World, dir: Dir | null, ticks: number): void {
  for (let i = 0; i < ticks; i++) stepTank(world.player, world, dir, PLAYER_SPEED_FP);
}

/** Строка поля с одним препятствием в колонке 4 (тайл 4 в строке 0). */
function rowWith(ch: string): string {
  return `....${ch}....`;
}

describe('скорости', () => {
  it('игрок едет 60 px/с: 256 fp за шаг', () => {
    expect(PLAYER_SPEED_FP).toBe(256);
    expect(PLAYER_SPEED_PX_S).toBe(60);
  });

  it('скорости 30/45/60/90 px/с дают целое число fp за шаг', () => {
    for (const pxs of [30, 45, 60, 90]) {
      const fp = (pxs * FP) / STEP_HZ;
      expect(Number.isInteger(fp)).toBe(true);
    }
  });
});

describe('прямое движение', () => {
  it('едет по открытому полю ровно со скоростью 1 px за шаг', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(3), tilePx(3));
    run(w, 'right', 10);
    expect(tankPx(w).x).toBe(tilePx(3) + 10);
  });

  it('останавливается у края поля', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(3), tilePx(3));
    run(w, 'left', 300);
    expect(tankPx(w).x).toBe(tilePx(0));
  });

  it('кирпич останавливает танк у своей грани', () => {
    const w = worldFromRows([rowWith('#')]);
    placeTank(w, tilePx(0), tilePx(0));
    run(w, 'right', 200);
    expect(tankPx(w).x).toBe(tilePx(4) - TANK_PX);
  });

  it.each([
    ['сталь', '@'],
    ['вода', '~'],
    ['база', 'E'],
  ])('%s — препятствие для танка', (_name, ch) => {
    const w = worldFromRows([rowWith(ch)]);
    placeTank(w, tilePx(0), tilePx(0));
    run(w, 'right', 200);
    expect(tankPx(w).x).toBe(tilePx(4) - TANK_PX);
  });

  it('лес проходим', () => {
    const w = worldFromRows([rowWith('*')]);
    placeTank(w, tilePx(0), tilePx(0));
    run(w, 'right', 200);
    expect(tankPx(w).x).toBe(tilePx(13) - TANK_PX);
  });

  it('разворот на 180° не требует выравнивания', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(3), tilePx(3) + 3); // поперечная координата не выровнена
    w.player.dir = 'right';
    stepTank(w.player, w, 'left', PLAYER_SPEED_FP);
    expect(w.player.dir).toBe('left');
  });
});

/** Линия выравнивания поворота: поперечная координата кратна ALIGN_PX от начала поля. */
function alignLine(k: number): number {
  return FIELD_ORIGIN + k * ALIGN_PX;
}

describe('поворот', () => {
  it('поворот ждёт выравнивания, сдвигая танк поперёк, и не меняет направление сразу', () => {
    const w = worldFromRows([]);
    // Танк на линии 2 по Y (x = 18 px), смещён на 3 px вниз от неё.
    placeTank(w, tilePx(2), alignLine(2) + 3);
    w.player.dir = 'right';
    // Три шага выравнивания по 1 px: танк возвращается на линию, направление не меняется.
    run(w, 'up', 3);
    expect(w.player.dir).toBe('right');
    expect(tankPx(w).y).toBe(alignLine(2));
    // Следующий шаг — поворот.
    run(w, 'up', 1);
    expect(w.player.dir).toBe('up');
  });

  it('в коридоре шириной в один тайл поворот проходит сразу', () => {
    const w = worldFromRows([
      '#############',
      '.............',
      '#############',
    ]);
    // Тайл-коридор: строка 1 (y 24..40). Линия выравнивания внутри неё — 28 px (k = 2).
    placeTank(w, tilePx(3), alignLine(2));
    w.player.dir = 'right';
    stepTank(w.player, w, 'up', PLAYER_SPEED_FP);
    expect(w.player.dir).toBe('up');
    // Стена сверху: танк на линии 28 px не может сдвинуться в строку 0 (кирпич),
    // поэтому остаётся на месте и не выходит из коридора.
    run(w, 'up', 20);
    expect(tankPx(w).y).toBe(alignLine(2));
  });

  it('отпускание клавиши отменяет ожидающий поворот', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(2), alignLine(2) + 3);
    w.player.dir = 'right';
    stepTank(w.player, w, 'up', PLAYER_SPEED_FP);
    expect(w.player.pendingTurn).toBe('up');
    stepTank(w.player, w, null, PLAYER_SPEED_FP);
    expect(w.player.pendingTurn).toBeNull();
  });
});

describe('лёд', () => {
  it('танк скользит по льду до препятствия после отпускания клавиши', () => {
    // Лёд в тайлах 4..7, сталь в тайле 8.
    const w = worldFromRows(['....====@....']);
    placeTank(w, tilePx(4), tilePx(0));
    w.player.dir = 'right';
    run(w, 'right', 3);
    run(w, null, 200);
    expect(tankPx(w).x).toBe(tilePx(8) - TANK_PX);
  });

  it('на обычном полу танк останавливается сразу после отпускания', () => {
    const w = worldFromRows([]);
    placeTank(w, tilePx(4), tilePx(0));
    w.player.dir = 'right';
    run(w, 'right', 3);
    run(w, null, 50);
    expect(tankPx(w).x).toBe(tilePx(4) + 3);
  });
});

describe('ввод: удерживаемое направление', () => {
  it('берётся последнее нажатое направление', () => {
    const input = new Input();
    input.keyDown('ArrowLeft');
    input.keyDown('ArrowUp');
    expect(input.heldDirection()).toBe('up');
    input.keyUp('ArrowUp');
    expect(input.heldDirection()).toBe('left');
    input.keyUp('ArrowLeft');
    expect(input.heldDirection()).toBeNull();
  });
});
