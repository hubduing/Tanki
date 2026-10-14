import { describe, expect, it } from 'vitest';
import { computeIntegerScale } from '../../src/render/scale';

describe('computeIntegerScale', () => {
  it('возвращает целый коэффициент, помещающий экран в окно', () => {
    expect(computeIntegerScale(1920, 1080)).toBe(4); // 1080 / 224 = 4.8 → 4
    expect(computeIntegerScale(1024, 768)).toBe(3);  // 768 / 224 = 3.4 → 3
    expect(computeIntegerScale(256, 224)).toBe(1);
  });

  it('не опускается ниже 1 для маленьких окон', () => {
    expect(computeIntegerScale(100, 100)).toBe(1);
  });

  it('возвращает 1 для некорректных размеров', () => {
    expect(computeIntegerScale(0, 500)).toBe(1);
    expect(computeIntegerScale(NaN, 500)).toBe(1);
  });
});
