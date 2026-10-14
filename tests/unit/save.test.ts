import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAVE,
  SAVE_KEY,
  SAVE_VERSION,
  loadSave,
  parseSave,
  serializeSave,
  writeSave,
} from '../../src/core/save';

/** Простое хранилище в памяти для тестов. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    data,
  };
}

describe('сохранение: разбор', () => {
  it('пустое хранилище даёт значения по умолчанию', () => {
    expect(parseSave(null)).toEqual(DEFAULT_SAVE);
  });

  it('повреждённый JSON не ломает запуск', () => {
    expect(parseSave('{не json')).toEqual(DEFAULT_SAVE);
  });

  it('не объект и чужая версия сбрасываются', () => {
    expect(parseSave('42')).toEqual(DEFAULT_SAVE);
    expect(parseSave(JSON.stringify({ version: 99, unlockedLevel: 5 }))).toEqual(DEFAULT_SAVE);
  });

  it('некорректные поля заменяются значениями по умолчанию', () => {
    const data = parseSave(
      JSON.stringify({ version: SAVE_VERSION, unlockedLevel: -3, highScore: 'много', soundOn: 'да' }),
    );
    expect(data.unlockedLevel).toBe(1);
    expect(data.highScore).toBe(0);
    expect(data.soundOn).toBe(true);
  });

  it('корректные поля сохраняются', () => {
    const data = parseSave(
      JSON.stringify({ version: SAVE_VERSION, unlockedLevel: 4, highScore: 12345, soundOn: false }),
    );
    expect(data).toEqual({ version: SAVE_VERSION, unlockedLevel: 4, highScore: 12345, soundOn: false });
  });
});

describe('сохранение: запись и чтение', () => {
  it('записанное читается после «перезагрузки»', () => {
    const storage = memoryStorage();
    writeSave({ ...DEFAULT_SAVE, unlockedLevel: 3, highScore: 900 }, storage);
    const back = loadSave(storage);
    expect(back.unlockedLevel).toBe(3);
    expect(back.highScore).toBe(900);
  });

  it('сериализация всегда пишет текущую версию схемы', () => {
    const json = serializeSave({ ...DEFAULT_SAVE, version: 0 });
    expect(JSON.parse(json).version).toBe(SAVE_VERSION);
  });

  it('повреждённые данные в хранилище не ломают загрузку', () => {
    const storage = memoryStorage({ [SAVE_KEY]: '{' });
    expect(loadSave(storage)).toEqual(DEFAULT_SAVE);
  });

  it('недоступное хранилище не падает ни на чтении, ни на записи', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadSave(broken)).toEqual(DEFAULT_SAVE);
    expect(writeSave(DEFAULT_SAVE, broken)).toBe(false);
  });
});
