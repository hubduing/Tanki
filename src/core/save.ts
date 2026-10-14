/** Версия схемы сохранения. Меняется при несовместимом изменении полей. */
export const SAVE_VERSION = 1;

/** Ключ в localStorage. */
export const SAVE_KEY = 'tanki.save';

/** Прогресс и настройки игрока (PLAN.md, M8). */
export interface SaveData {
  version: number;
  /** Номер максимального пройденного уровня (1 — ещё ничего не пройдено). */
  unlockedLevel: number;
  /** Рекорд очков за всё время. */
  highScore: number;
  /** Звук включён. */
  soundOn: boolean;
}

export const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  unlockedLevel: 1,
  highScore: 0,
  soundOn: true,
};

/**
 * Разбирает сырой текст из localStorage. Любая ошибка — возвращаем значения по умолчанию,
 * чтобы повреждённые данные не ломали запуск.
 */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return { ...DEFAULT_SAVE };
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SAVE };
  }
  if (typeof obj !== 'object' || obj === null) return { ...DEFAULT_SAVE };
  const o = obj as Record<string, unknown>;
  // Будущая версия или чужая схема — не трогаем, начинаем с чистого состояния.
  if (o.version !== SAVE_VERSION) return { ...DEFAULT_SAVE };
  const unlockedLevel = Number.isInteger(o.unlockedLevel) && (o.unlockedLevel as number) >= 1
    ? (o.unlockedLevel as number)
    : 1;
  const highScore = Number.isFinite(o.highScore) && (o.highScore as number) >= 0
    ? Math.floor(o.highScore as number)
    : 0;
  const soundOn = typeof o.soundOn === 'boolean' ? o.soundOn : true;
  return { version: SAVE_VERSION, unlockedLevel, highScore, soundOn };
}

/** Сериализует сохранение. */
export function serializeSave(data: SaveData): string {
  return JSON.stringify({ ...data, version: SAVE_VERSION });
}

/** Загружает сохранение из localStorage. Недоступное хранилище — значения по умолчанию. */
export function loadSave(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): SaveData {
  try {
    return parseSave(storage ? storage.getItem(SAVE_KEY) : null);
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

/** Записывает сохранение. Ошибки записи (квота, приватный режим) не падают. */
export function writeSave(
  data: SaveData,
  storage: Pick<Storage, 'setItem'> | undefined = safeStorage(),
): boolean {
  try {
    storage?.setItem(SAVE_KEY, serializeSave(data));
    return true;
  } catch {
    return false;
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
