import { FixedStepClock } from './clock';
import { StateMachine } from './stateMachine';
import type { Command } from '../input/input';

export type AppState = 'loading' | 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver';

/** Разрешённые переходы между состояниями (PLAN.md, раздел 3.5). */
export const ALLOWED: Record<AppState, readonly AppState[]> = {
  loading: ['menu'],
  menu: ['playing'],
  playing: ['paused', 'levelComplete', 'gameOver'],
  paused: ['playing', 'menu'],
  levelComplete: ['playing', 'gameOver'],
  gameOver: ['menu', 'playing'],
};

/** Какая команда в каком состоянии вызывает переход. */
export const BINDINGS: Partial<Record<AppState, Partial<Record<Command, AppState>>>> = {
  menu: { confirm: 'playing' },
  playing: { pause: 'paused' },
  paused: { pause: 'playing', confirm: 'playing', menu: 'menu' },
  levelComplete: { confirm: 'playing' },
  gameOver: { confirm: 'menu' },
};

/**
 * Ядро приложения без браузерных API: состояние, шаг времени и счётчики.
 * Логика мира появится на M2+; сейчас шаг только считается.
 */
export class App {
  readonly machine: StateMachine<AppState>;
  readonly clock = new FixedStepClock();
  /** Всего выполненных логических шагов (для отладки). */
  logicSteps = 0;

  constructor() {
    this.machine = new StateMachine<AppState>('loading', ALLOWED);
    this.machine.onChange((_from, to) => {
      // Часы сбрасываются при входе в игру, чтобы не догонять время паузы.
      if (to === 'playing') this.clock.reset();
    });
  }

  get state(): AppState {
    return this.machine.state;
  }

  /** Завершает загрузку ресурсов (на M1 ресурсов нет). */
  finishLoading(): void {
    this.machine.go('menu');
  }

  /** Применяет команду; возвращает true, если состояние изменилось. */
  handle(cmd: Command): boolean {
    const target = BINDINGS[this.machine.state]?.[cmd];
    if (!target) return false;
    return this.machine.go(target);
  }

  /**
   * Продвигает время до текущего момента. Логические шаги выполняются
   * только в состоянии «playing»; в остальных состояниях часы идут, а шаги
   * отбрасываются.
   */
  tick(nowMs: number): number {
    const steps = this.clock.advance(nowMs);
    if (this.machine.state !== 'playing') return 0;
    this.logicSteps += steps;
    return steps;
  }
}
