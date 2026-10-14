/**
 * Конечный автомат. Переходы разрешены только по таблице `allowed`
 * (PLAN.md, раздел 3.5). Глобальных флагов состояния не хранится.
 */
export class StateMachine<S extends string> {
  private current: S;
  private readonly listeners: Array<(from: S, to: S) => void> = [];

  constructor(
    initial: S,
    private readonly allowed: Record<S, readonly S[]>,
  ) {
    this.current = initial;
  }

  get state(): S {
    return this.current;
  }

  canGo(to: S): boolean {
    return this.allowed[this.current].includes(to);
  }

  /** Переходит в состояние, если переход разрешён. Возвращает успех. */
  go(to: S): boolean {
    if (!this.canGo(to)) return false;
    const from = this.current;
    this.current = to;
    for (const listener of this.listeners) listener(from, to);
    return true;
  }

  onChange(listener: (from: S, to: S) => void): void {
    this.listeners.push(listener);
  }
}
