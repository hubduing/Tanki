import { describe, expect, it } from 'vitest';
import { clampMenuLevel, stepMenuLevel } from '../../src/core/menu';

describe('выбор уровня в меню', () => {
  it('сдвигает выбор в пределах открытых уровней', () => {
    expect(stepMenuLevel(1, 1, 3, 12)).toBe(2);
    expect(stepMenuLevel(2, -1, 3, 12)).toBe(1);
  });

  it('не выходит за открытые уровни', () => {
    expect(stepMenuLevel(3, 1, 3, 12)).toBe(3);
  });

  it('не выходит ниже первого уровня', () => {
    expect(stepMenuLevel(1, -1, 3, 12)).toBe(1);
  });

  it('не выходит за число уровней в игре, даже если открыто больше', () => {
    expect(stepMenuLevel(12, 1, 99, 12)).toBe(12);
  });

  it('нецелый или неверный ввод не меняет выбор', () => {
    expect(stepMenuLevel(2, 0.5, 5, 12)).toBe(2);
    expect(stepMenuLevel(2, Number.NaN, 5, 12)).toBe(2);
  });
});

describe('приведение выбора к допустимому', () => {
  it('сбрасывает выбор, если он выше открытого', () => {
    expect(clampMenuLevel(5, 2, 12)).toBe(2);
  });

  it('сбрасывает некорректный выбор на первый уровень', () => {
    expect(clampMenuLevel(0, 3, 12)).toBe(1);
    expect(clampMenuLevel(Number.NaN, 3, 12)).toBe(1);
  });

  it('допустимый выбор не меняет', () => {
    expect(clampMenuLevel(2, 3, 12)).toBe(2);
  });
});
