/** Команды игрока, не зависящие от клавиш (PLAN.md, M1: ввод → команды). */
export type Command =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'fire'
  | 'pause'
  | 'confirm'
  | 'menu'
  | 'debugWin'
  | 'debugLose';

/** Карта клавиш по `KeyboardEvent.code`: стрелки и WASD. */
export const KEY_MAP: Readonly<Record<string, Command>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire',
  KeyJ: 'fire',
  Escape: 'pause',
  KeyP: 'pause',
  Enter: 'confirm',
  KeyM: 'menu',
  // Отладочные переходы; в релизе будут убраны.
  F6: 'debugWin',
  F7: 'debugLose',
};

/** Команды, которые срабатывают по нажатию, а не удерживаются. */
const EDGE_ONLY: ReadonlySet<Command> = new Set<Command>([
  'pause',
  'confirm',
  'menu',
  'debugWin',
  'debugLose',
]);

export function commandForCode(code: string): Command | undefined {
  return KEY_MAP[code];
}

/**
 * Буфер ввода. Хранит удерживаемые команды и очередь нажатий, которую
 * потребляет логика на каждом кадре.
 */
export class Input {
  private readonly held = new Set<Command>();
  private pressed: Command[] = [];

  keyDown(code: string): void {
    const cmd = commandForCode(code);
    if (!cmd) return;
    if (!this.held.has(cmd) && EDGE_ONLY.has(cmd)) {
      this.pressed.push(cmd);
    }
    this.held.add(cmd);
  }

  keyUp(code: string): void {
    const cmd = commandForCode(code);
    if (cmd) this.held.delete(cmd);
  }

  /** Сброс удерживаемых клавиш при потере фокуса окна. */
  releaseAll(): void {
    this.held.clear();
  }

  isHeld(cmd: Command): boolean {
    return this.held.has(cmd);
  }

  /** Забирает накопленные нажатия и очищает очередь. */
  takePressed(): Command[] {
    const out = this.pressed;
    this.pressed = [];
    return out;
  }
}

/** Привязывает Input к окну и не даёт браузеру прокручивать страницу клавишами. */
export function attachInput(input: Input, target: Window): void {
  const prevent = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  target.addEventListener('keydown', (e) => {
    if (prevent.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    input.keyDown(e.code);
  });
  target.addEventListener('keyup', (e) => input.keyUp(e.code));
  target.addEventListener('blur', () => input.releaseAll());
}
