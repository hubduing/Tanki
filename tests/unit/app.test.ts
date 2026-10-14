import { describe, expect, it } from 'vitest';
import { App } from '../../src/core/app';
import { StateMachine } from '../../src/core/stateMachine';
import { KEY_MAP, Input } from '../../src/input/input';

function startedApp(): App {
  const app = new App();
  app.finishLoading();
  app.handle('confirm'); // menu → playing
  return app;
}

describe('StateMachine', () => {
  it('разрешает только таблицу переходов', () => {
    const m = new StateMachine('a', { a: ['b'], b: ['a'] } as const);
    expect(m.go('a')).toBe(false);
    expect(m.state).toBe('a');
    expect(m.go('b')).toBe(true);
    expect(m.state).toBe('b');
  });

  it('уведомляет слушателей о переходе', () => {
    const m = new StateMachine('a', { a: ['b'], b: [] } as const);
    const seen: string[] = [];
    m.onChange((from, to) => seen.push(`${from}->${to}`));
    m.go('b');
    expect(seen).toEqual(['a->b']);
  });
});

describe('App: переходы', () => {
  it('стартует в загрузке и переходит в меню', () => {
    const app = new App();
    expect(app.state).toBe('loading');
    app.finishLoading();
    expect(app.state).toBe('menu');
  });

  it('меню → игра → пауза → игра', () => {
    const app = startedApp();
    expect(app.state).toBe('playing');
    app.handle('pause');
    expect(app.state).toBe('paused');
    app.handle('pause');
    expect(app.state).toBe('playing');
  });

  it('пауза → меню, незавершённый уровень не засчитывается', () => {
    const app = startedApp();
    app.handle('pause');
    app.handle('menu');
    expect(app.state).toBe('menu');
  });

  it('итоги уровня и конец игры', () => {
    const app = startedApp();
    app.handle('debugWin');
    expect(app.state).toBe('levelComplete');
    app.handle('confirm');
    expect(app.state).toBe('playing');
    app.handle('debugLose');
    expect(app.state).toBe('gameOver');
    app.handle('confirm');
    expect(app.state).toBe('menu');
  });

  it('недопустимая команда не меняет состояние', () => {
    const app = new App();
    expect(app.handle('fire')).toBe(false);
    expect(app.state).toBe('loading');
  });
});

describe('App: логические шаги', () => {
  it('шаги идут только в состоянии playing', () => {
    const app = new App();
    app.finishLoading();
    app.tick(0);
    expect(app.tick(1000)).toBe(0); // в меню шагов нет

    app.handle('confirm');
    app.tick(2000);
    const steps = app.tick(3000);
    expect(steps).toBeGreaterThan(0);

    app.handle('pause');
    const before = app.logicSteps;
    app.tick(10000);
    expect(app.logicSteps).toBe(before); // на паузе логика стоит
  });

  it('после паузы часы не догоняют время паузы', () => {
    const app = startedApp();
    app.tick(0);
    app.handle('pause');
    app.tick(5000);
    app.handle('pause');
    app.tick(5000);
    // Сразу после возобновления шагов не больше лимита на кадр.
    expect(app.tick(5016)).toBeLessThanOrEqual(1);
  });
});

describe('Input', () => {
  it('стрелки и WASD сопоставлены с направлениями', () => {
    expect(KEY_MAP.ArrowUp).toBe('up');
    expect(KEY_MAP.KeyW).toBe('up');
    expect(KEY_MAP.KeyA).toBe('left');
    expect(KEY_MAP.KeyD).toBe('right');
  });

  it('направления удерживаются, а паузa даёт одно нажатие', () => {
    const input = new Input();
    input.keyDown('ArrowLeft');
    expect(input.isHeld('left')).toBe(true);
    input.keyDown('Escape');
    input.keyDown('Escape'); // повтор без keyUp не дублирует нажатие
    expect(input.takePressed()).toEqual(['pause']);
    input.keyUp('ArrowLeft');
    expect(input.isHeld('left')).toBe(false);
  });

  it('releaseAll сбрасывает удерживаемые клавиши', () => {
    const input = new Input();
    input.keyDown('KeyW');
    input.releaseAll();
    expect(input.isHeld('up')).toBe(false);
  });
});
