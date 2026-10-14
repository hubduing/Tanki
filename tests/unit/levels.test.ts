import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../../src/levels/validate';

/**
 * Проверка всех встроенных уровней одной командой: `pnpm check:levels`.
 * Каждый файл public/levels/*.json должен пройти валидатор (PLAN.md, R8).
 */
const dir = join(process.cwd(), 'public', 'levels');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('встроенные уровни', () => {
  it('есть хотя бы один уровень', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} проходит валидацию`, () => {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown;
      const res = validateLevel(raw);
      expect(res.ok, res.ok ? '' : res.problems.join('; ')).toBe(true);
    });
  }
});
