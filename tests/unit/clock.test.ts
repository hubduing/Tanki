import { describe, expect, it } from 'vitest';
import { FixedStepClock, MAX_STEPS_PER_FRAME, STEP_MS } from '../../src/core/clock';

/** Прокручивает часы на `seconds` при заданной частоте кадров, возвращает число шагов. */
function runFor(hz: number, seconds: number): number {
  const clock = new FixedStepClock();
  let now = 0;
  clock.advance(now);
  let total = 0;
  const frameMs = 1000 / hz;
  const frames = Math.round(hz * seconds);
  for (let i = 0; i < frames; i++) {
    now += frameMs;
    total += clock.advance(now);
  }
  return total;
}

describe('FixedStepClock', () => {
  it('первый кадр не даёт шагов', () => {
    const clock = new FixedStepClock();
    expect(clock.advance(1000)).toBe(0);
  });

  it('скорость логики не зависит от частоты монитора', () => {
    // За секунду должно выполняться ~60 шагов при 60, 120 и 144 Гц (допуск ±1 из-за округления).
    for (const hz of [60, 120, 144]) {
      expect(Math.abs(runFor(hz, 1) - 60)).toBeLessThanOrEqual(1);
    }
  });

  it('ограничивает догоняющие шаги за один кадр', () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    // Пауза вкладки на 2 секунды: без лимита было бы 120 шагов.
    expect(clock.advance(2000)).toBe(MAX_STEPS_PER_FRAME);
  });

  it('после упора в лимит не копит долг на следующие кадры', () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    clock.advance(2000); // долг сброшен
    // Следующий обычный кадр даёт не больше одного шага.
    expect(clock.advance(2000 + STEP_MS)).toBeLessThanOrEqual(1);
  });

  it('reset убирает накопленное время', () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    clock.advance(100); // накоплен долг шагов
    clock.reset();
    expect(clock.advance(5000)).toBe(0);
  });
});
