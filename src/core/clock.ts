/** Длительность логического шага: 60 Гц (PLAN.md, D4). */
export const STEP_MS = 1000 / 60;

/** Ограничение догоняющих шагов за один кадр (защита от «спирали смерти»). */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * Фиксированный шаг с аккумулятором. По каждому кадру возвращает, сколько
 * логических шагов нужно выполнить. Скорость игрового времени не зависит
 * от частоты монитора.
 */
export class FixedStepClock {
  private accumulator = 0;
  private lastMs: number | null = null;

  constructor(
    private readonly stepMs: number = STEP_MS,
    private readonly maxSteps: number = MAX_STEPS_PER_FRAME,
  ) {}

  /** Принимает текущее время кадра (мс), возвращает число шагов к выполнению. */
  advance(nowMs: number): number {
    if (this.lastMs === null) {
      this.lastMs = nowMs;
      return 0;
    }
    const dt = Math.max(0, nowMs - this.lastMs);
    this.lastMs = nowMs;
    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= this.stepMs && steps < this.maxSteps) {
      this.accumulator -= this.stepMs;
      steps++;
    }
    // Если упёрлись в лимит, отбрасываем накопленный долг, а не копим его дальше.
    if (steps === this.maxSteps && this.accumulator >= this.stepMs) {
      this.accumulator = 0;
    }
    return steps;
  }

  /** Сбрасывает аккумулятор; следующий вызов advance даст 0 шагов. */
  reset(): void {
    this.accumulator = 0;
    this.lastMs = null;
  }
}
