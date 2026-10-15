# Архитектура «Танчиков»

Документ описывает **фактически реализованную** архитектуру. Каждое утверждение проверено
чтением кода; имена файлов и функций приведены как в исходниках. Отступления от PLAN.md
собраны в последнем разделе.

## 1. Слои и правило зависимостей

Композиционный корень — `src/main.ts`: только он связывает логику, ввод, рендер, аудио и уровни.

Правило «логика не знает о вводе, рендере и звуке» выполняется:

- Ни один файл `src/world/` не импортирует `src/render/`, `src/input/` или `src/audio/`.
  Полный список внешних зависимостей мира: `src/config/*`, `src/core/dir.ts`, `src/core/rng.ts`
  и тип `Level` из `src/levels/format.ts`.
- Обмен наружу — события: `src/world/events.ts` задаёт `WorldEvent`, `World.emit()` пишет их
  в приватный буфер, `World.drainEvents()` забирает и очищает его. `src/audio/audio.ts`
  и `src/world/effects.ts` читают только эти события.
- Обмен внутрь — команда: `stepWorld(world, intent)` принимает `PlayerIntent { dir, fire }`
  (`src/world/step.ts`). Мир не обращается к `Input`.

Направление «наружу → внутрь» соблюдено и для остальных слоёв: `src/render/*` читает `World`,
`Tank`, `Effect` и `App`, но мир об этих модулях не знает.

Замеченные особенности (не нарушения правила, но отклонения от буквы раздела 3.1):

- `src/core/app.ts` импортирует **тип** `Command` из `src/input/input.ts`, то есть ядро
  зависит от модуля ввода. Импорт только типовой, цикла во время выполнения не возникает.
- `src/audio/audio.ts` импортирует **тип** `WorldEvent` из `src/world/events.ts`. Зависимость
  идёт из аудио в логику, а не наоборот.
- `src/world/step.ts` импортирует `stepEnemyAI` из `./ai`, а `src/world/ai.ts` — `tryFire`
  из `./step`. Это **циклическая зависимость между двумя файлами мира**. Она разрешается
  загрузчиком ES-модулей (функции вызываются во время шага, а не при инициализации),
  но формально цикл существует.

## 2. Карта модулей

### src/core

| Файл | Ответственность | Не делает |
|---|---|---|
| `app.ts` | Состояние приложения (`AppState`), таблицы `ALLOWED` и `BINDINGS`, применение команд, `tick(nowMs)` поверх часов | Не знает про танки, карту и рендер |
| `clock.ts` | `FixedStepClock`: фиксированный шаг с аккумулятором, лимит `MAX_STEPS_PER_FRAME` | Не хранит игровое время и не рисует |
| `stateMachine.ts` | Обобщённый `StateMachine<S>`: переход только по таблице, слушатели `onChange` | Не знает конкретных состояний игры |
| `dir.ts`, `rng.ts` | Тип `Dir`, `DIR_VEC`, `opposite`, `isHorizontal`; детерминированный ГСЧ `Rng` (mulberry32): `next()`, `int(min, max)` | Не двигают танки и не хранят состояние мира |
| `save.ts`, `levels.ts`, `menu.ts` | Сохранение в localStorage (`SaveData`, `SAVE_VERSION`, `parseSave`, `serializeSave`, `loadSave`, `writeSave`); последовательность уровней `LEVEL_FILES`, `levelFileFor`, `nextLevelNumber`; выбор уровня в меню `stepMenuLevel`, `clampMenuLevel` | Не знают о сущностях, не читают файлы уровней, не обращаются к DOM |

### src/input

| Файл | Ответственность | Не делает |
|---|---|---|
| `input.ts` | Тип `Command`, карта `KEY_MAP`, класс `Input` (удерживаемые команды, очередь нажатий, `heldDirection`), `attachInput` | Не двигает танки и не меняет состояние приложения |

### src/world

| Файл | Ответственность | Не делает |
|---|---|---|
| `world.ts` | Класс `World`: сетка `Tile[]`, база, точки спавна, очередь врагов, танки, пули, бонусы, эффекты, очки, жизни, `outcome`; `fromLevel`, `tileAt`, `isTankPassableAt`, `emit`/`drainEvents`, `applyShovel`, `destroyBase`, `onPlayerHit`, `onEnemyKilled`, `checkVictory`, `finish` | Не рисует, не читает ввод, не звучит |
| `step.ts` | `stepWorld` — порядок одного шага; `tryFire` — выстрел с проверкой перезарядки и лимита | Не читает клавиатуру (получает `PlayerIntent`) |
| `tank.ts` | Класс `Tank`: координаты в fixed-point, направление, перезарядка, улучшение, здоровье, анимация появления, неуязвимость, поля ИИ | Не содержит логики движения и стрельбы |
| `movement.ts` | `stepTank`: движение подшагами, разворот на 180°, поворот на 90° с выравниванием, инерция на льду | Не решает, что значит попадание |
| `collision.ts` | `tankBlocked` (границы поля и тайлы), `tankOverlapsOther` (танк против танка), `tankOnIce` | Не разрушает тайлы |
| `bullets.ts` | Класс `Bullet`, `spawnBullet`, `updateBullets` с подшагами по 1 px, `resolveBullet` (граница, тайлы, танки), `hitBrick`, `collideWithBullets` | Не начисляет очки напрямую |
| `ai.ts` | `stepEnemyAI`: смена направления при упоре или по таймеру, доворот на игрока/базу по линии, выстрел с вероятностью `FIRE_CHANCE` | Не рисует и не звучит |
| `spawn.ts` | `stepSpawn`: очередь уровня, точки по кругу, лимит `MAX_ENEMIES_ON_FIELD`, анимация появления, метка `carriesBonus` | Не решает судьбу уровня |
| `bonus.ts` | `Bonus`, `rollBonusCode`, `spawnBonus`, `stepBonuses` (жизнь на карте, подбор), `applyBonus` (шесть эффектов) | Не рисует бонусы |
| `effects.ts` | `Effect`, `spawnEffects` (события → взрывы/искры/очки), `stepEffects` (таймеры жизни) | Не рисует |
| `events.ts` | Тип `WorldEvent` (`spark`, `explosion`, `playerHit`, `enemyDestroyed`, `baseDestroyed`) | Не содержит логики |

### src/levels

| Файл | Ответственность | Не делает |
|---|---|---|
| `format.ts` | Типы `TilePoint`, `Level` и класс ошибки `LevelError` со списком `problems` | Не валидирует |
| `validate.ts` | `validateLevel` — все правила формата; `parseLevel` — бросает `LevelError`; константы `ENEMY_CODES`, `ENEMIES_PER_LEVEL` | Не загружает файлы |
| `loader.ts` | `loadLevel(url)` — `fetch` с `cache: 'no-cache'`, понятные сообщения об ошибках HTTP и JSON | Не содержит правил валидации |

### src/render

| Файл | Ответственность | Не делает |
|---|---|---|
| `scale.ts` | `LOGICAL_WIDTH`/`LOGICAL_HEIGHT` (256×224), `computeIntegerScale` | Не меняет размер canvas |
| `sprites.ts` | Процедурный пиксель-арт: `drawTankSprite`, `drawTile`, `drawBrickQuadrant`, `drawBaseSprite`, `drawBulletSprite`, `drawBonusSprite`, `drawExplosionSprite`, `drawSparkSprite`, `drawFloatTextSprite`, палитры | Не читает состояние мира |
| `map.ts` | `drawMapBase` (всё, кроме леса, и база), `drawForestLayer` (лес поверх танков) | Не меняет состояние мира |
| `tank.ts`, `enemy.ts` | `drawTank` — спрайт игрока с миганием при неуязвимости; `drawEnemy` — спрайт врага, мигание при появлении, потемнение бронированного по здоровью | Не двигают танки и не управляют ИИ |
| `bullets.ts`, `bonus.ts`, `effects.ts` | `drawBullets` (пули игрока белые, врагов оранжевые), `drawBonuses` (значок 16×16 с миганием), `drawEffects` (взрывы, искры, очки) | Не двигают пули, не применяют бонусы, не создают эффекты |
| `hud.ts` | `drawHud(ctx, world, x0)` — панель справа: остаток врагов, жизни, номер уровня | Не показывает счёт |
| `debug.ts` | `drawDebug` (F4) — сетка тайлов, линии 8 px, хитбокс игрока | Не меняет состояние мира |
| `screens.ts` | `drawScreen`, `drawPauseOverlay`, `drawControlsHint` — загрузка, меню, итоги, пауза, подсказка управления | Не меняет состояние приложения |

### src/audio

| Файл | Ответственность | Не делает |
|---|---|---|
| `audio.ts` | Класс `Audio`: `unlock()` после жеста пользователя, `setEnabled`, процедурная музыка (`playMusic`/`stopMusic`), сигналы по событиям (`play`) | Не влияет на логику и не хранит игровые данные |

### src/config

| Файл | Ответственность | Не делает |
|---|---|---|
| `geometry.ts`, `tiles.ts` | `FP` (256), `SUB_STEP_FP` (16), `FIELD_ORIGIN(_FP)`, `TILE_PX`/`TILE_FP`, `FIELD_FP`, `TANK_PX`/`TANK_FP`, `ALIGN_PX`/`ALIGN_FP`, `fpToPx`; `TileKind`, `TILE_CHARS`, `LEVEL_SIZE` (13), `isTankPassable`, `BRICK_FULL` | Не содержат логики движения и не рисуют тайлы |
| `balance.ts`, `rules.ts` | `STEP_HZ`, скорости игрока и пуль, `BULLET_PX`, перезарядка, `playerBulletSpeedPx`, `playerBulletLimit`; `START_LIVES`, `RESPAWN_DELAY_STEPS`, `RESPAWN_INVULN_STEPS` | Не выполняют шаг и не считают итог уровня |
| `enemies.ts`, `bonuses.ts` | `ENEMY_TYPES`, `MAX_ENEMIES_ON_FIELD`, `SPAWN_ANIM_STEPS`, `isEnemyKind`, `enemySpeedFp`, `enemyBulletSpeedPx`, `enemyCooldownSteps`; `BonusCode`, `BONUS_CODES`, `BONUS`, `MAX_UPGRADE`, `BONUS_EVERY` | Не управляют врагами и не применяют бонусы |

Все файлы конфига — только числа, таблицы и чистые функции пересчёта; логики шага в них нет.

## 3. Геометрия

Числа живут в `src/config/geometry.ts`, `src/config/tiles.ts`, `src/config/balance.ts`
и `src/render/scale.ts`:

- Логический экран — 256×224 px (`LOGICAL_WIDTH`, `LOGICAL_HEIGHT` в `src/render/scale.ts`).
- Поле — 13×13 тайлов (`LEVEL_SIZE`), тайл 16 px (`TILE_PX`), смещение поля `FIELD_ORIGIN = 8`.
  Отсюда `FIELD_FP = 13 · 16 · 256`.
- Координаты танков — fixed-point с точностью 1/256 px (`FP = 256`); `fpToPx` округляет
  до целого пикселя при отрисовке.
- Подшаг коллизий танка — `SUB_STEP_FP = 16`, то есть 1/16 px (`moveBy` в `src/world/movement.ts`).
- Выравнивание для поворота — `ALIGN_PX = 8` от начала поля; проверка кратности в `stepTank`.
- Кирпич разрушается поквадрантно: `BRICK_FULL = 0b1111`, бит квадранта `1 << (qy·2 + qx)`
  (TL=1, TR=2, BL=4, BR=8), выбивание — `hitBrick` в `src/world/bullets.ts`, отрисовка —
  `drawBrickQuadrant` в `src/render/sprites.ts`.
- Танк занимает ровно один тайл: `TANK_PX = 16`.

**Важное уточнение.** Пули живут не в fixed-point, а в целых пикселях: `Bullet.x/y` —
целые, а подшаг в `updateBullets` равен 1 px. Это работает, потому что все скорости пуль
кратны 60 px/с и дают целое число пикселей за шаг (3, 4, 5). Таким образом, в коде
**два разных подшага**: 1/16 px для танков и 1 px для пуль. Формулировка «подшаг 1/16 px»
верна только для танков.

В `src/render/map.ts` константы `FIELD_ORIGIN = 8` и `TILE_PX = 16` объявлены заново,
а не импортированы из `src/config/geometry.ts` — дублирование значений.

## 4. Порядок одного шага мира

`stepWorld(world, intent)` в `src/world/step.ts` выполняется так:

1. Ранний выход, если `world.outcome !== 'playing'`.
2. Таймеры: перезарядка игрока, неуязвимость, `freezeTimer`, `shovelTimer` (при обнулении —
   `applyShovel(false)`), перезарядка и анимация появления каждого врага, `stepBonuses`
   (жизнь и подбор бонусов), таймер возрождения игрока.
3. `stepSpawn` — появление врагов из очереди.
4. Движение игрока (`stepTank`, только если не `playerDown`).
5. ИИ врагов (`stepEnemyAI` для каждого врага) — только при `freezeTimer === 0`;
   ИИ сам вызывает `stepTank` для своего танка.
6. Выстрел игрока: `tryFire` со скоростью и лимитом по уровню улучшения.
7. `updateBullets` — движение пуль подшагами и разрешение попаданий (тайл, танк, база, граница,
   встречные пули).
8. `world.checkVictory()`.
9. `stepEffects` — таймеры визуальных эффектов.

События копятся в `World` в течение шага и забираются вызывающим кодом через `drainEvents()`
**вне** `stepWorld` — из `src/main.ts`, где из них создаются эффекты (`spawnEffects`)
и проигрывается звук (`audio.play`).

Отличия от порядка из PLAN.md, раздел 3.4: спавн выполняется **до** движения, а не седьмым
пунктом; ИИ не отделён от движения (он внутри себя двигает танк); чтение ввода вынесено
за пределы шага в параметр `intent`; пункт «сформировать события» не является отдельной фазой.

## 5. Машина состояний

Состояния (`AppState` в `src/core/app.ts`): `loading`, `menu`, `playing`, `paused`,
`levelComplete`, `gameOver`. Таблица `ALLOWED`:

| Из | Разрешено перейти в |
|---|---|
| `loading` | `menu` |
| `menu` | `playing` |
| `playing` | `paused`, `levelComplete`, `gameOver` |
| `paused` | `playing`, `menu` |
| `levelComplete` | `playing`, `gameOver` |
| `gameOver` | `menu`, `playing` |

Таблица `BINDINGS` — какие команды вызывают переход:

| Состояние | Команда → состояние |
|---|---|
| `menu` | `confirm` → `playing` |
| `playing` | `pause` → `paused` |
| `paused` | `pause` → `playing`, `confirm` → `playing`, `menu` → `menu` |
| `levelComplete` | `confirm` → `playing` |
| `gameOver` | `confirm` → `menu` |

`App.handle(cmd)` возвращает `false`, если для пары «состояние, команда» перехода нет.
Переходы в `levelComplete` и `gameOver` выполняет `src/main.ts` напрямую через
`app.machine.go(...)` по значению `world.outcome`. При входе в `playing` слушатель
в `App` сбрасывает часы, чтобы не догонять время паузы.

## 6. Данные

**Формат уровня** (`src/levels/format.ts`): `number`, `palette`, `spawnIntervalSec`,
`enemies` (коды типов), `player`, `enemySpawns`, `map` (13 строк по 13 символов).

**Валидация** (`src/levels/validate.ts`, `validateLevel`) проверяет: `number` — целое ≥ 1;
`palette` — целое ≥ 0; `spawnIntervalSec` > 0; сетку 13×13 из допустимых символов `TILE_CHARS`;
ровно четыре `E`, образующие квадрат 2×2; наличие `player` внутри поля в проходимой клетке;
минимум одну точку появления врагов, каждая — внутри поля, в проходимой клетке и не совпадает
с другой точкой или с точкой игрока (множество `occupied`); ровно 20 врагов с кодами `B`, `F`,
`P`, `A`. Все проблемы собираются в список и возвращаются вместе.

**Загрузка** (`src/levels/loader.ts`): `loadLevel(url)` делает `fetch` с `cache: 'no-cache'`,
превращает ошибку HTTP и ошибку разбора JSON в понятные сообщения и вызывает `parseLevel`.

**Сохранения** (`src/core/save.ts`): ключ `SAVE_KEY = 'tanki.save'`, текущая версия схемы
`SAVE_VERSION = 1`, поля `unlockedLevel`, `highScore`, `soundOn`. `parseSave` при повреждённом
JSON, не-объекте или **несовпадении версии** возвращает `DEFAULT_SAVE`. Миграций между
версиями нет: чужая версия сбрасывается в значения по умолчанию. `loadSave`/`writeSave`
принимают хранилище параметром (для тестов) и не падают при недоступном localStorage.

**Последовательность уровней** (`src/core/levels.ts`): массив `LEVEL_FILES` из 35 имён
файлов; `levelFileFor(n)` даёт имя файла по номеру, `nextLevelNumber(n)` — следующий номер
или `null`. Число уровней задаётся списком, а не содержимым каталога.

## 7. Цикл и рендер

**Часы** (`src/core/clock.ts`): `STEP_MS = 1000/60`, `MAX_STEPS_PER_FRAME = 5`. `advance(nowMs)`
копит время в аккумуляторе и отдаёт число шагов; при упоре в лимит накопленный долг
обнуляется, а не переносится. `App.tick` возвращает 0 шагов во всех состояниях, кроме `playing`.

**Кадр** (`src/main.ts`, `frame(now)`):

1. Разбор нажатий `input.takePressed()`: `sound` переключает звук, стрелки в меню двигают
   выбор уровня, остальные команды идут в `app.handle`; здесь же по переходам
   перезагружается уровень или сбрасывается мир при выходе в меню.
2. Запуск/остановка музыки при смене состояния.
3. Логика: `app.tick(now)` даёт число шагов, каждый шаг — `stepWorld` с текущими
   `input.heldDirection()` и `input.isHeld('fire')`; при ненулевом `world.outcome` итог
   сохраняется (`recordOutcome`) и машина переходит на экран итогов.
4. События кадра: `world.drainEvents()` → `audio.play(events)` и `spawnEffects(world, events)`.
5. Рендер. В состоянии `playing` или `paused` и при наличии мира порядок такой:
   заливка чёрным → `drawMapBase` → `drawTank(world.player)` → `drawEnemy` для каждого врага →
   `drawBonuses` → `drawBullets` → `drawEffects` → `drawForestLayer` → `drawHud(ctx, world, 240)` →
   `drawDebug` (если включён F4) → `drawControlsHint` (только `playing`) →
   `drawPauseOverlay` (только `paused`). В остальных состояниях вызывается `drawScreen`,
   а поверх выводится текст ошибки загрузки уровня.
6. Счётчики кадров и FPS, оверлей F3, `requestAnimationFrame(frame)`.

**Масштабирование** (`src/render/scale.ts` + `applyScale` в `src/main.ts`): canvas имеет
логические размеры 256×224, `computeIntegerScale` даёт целый коэффициент (не меньше 1),
стиль canvas задаётся как `LOGICAL × scale`; сглаживание выключено (`imageSmoothingEnabled = false`
и `image-rendering: pixelated` в `index.html`). Пересчёт — на событие `resize`.

## 8. Отступления от PLAN.md

Фактические расхождения структуры с разделом 4 плана:

| PLAN.md | Факт |
|---|---|
| `src/ai/` | Каталога нет; поведение врагов — `src/world/ai.ts` |
| `src/storage/` | Каталога нет; сохранения — `src/core/save.ts` |
| `assets/sprites/`, `assets/audio/` | Каталога `assets/` нет вообще: графика и звук процедурные (D11, D7) |
| `tools/` | Каталога нет; генератор уровней — `scripts/gen-levels.mjs` |
| `docs/architecture.md`, `docs/test-plan.md` | Отсутствовали; добавлены этим документом и `docs/test-plan.md`. Ранее в `docs/` был только `level-format.md` |
| `src/core/` — «цикл, машина состояний, RNG, таймеры, математика» | Отдельных модулей таймеров и математики нет; дополнительно лежат `save.ts`, `levels.ts`, `menu.ts`, `dir.ts` |
| `src/world/` — «мир, сущности, коллизии, правила, спавн» | Дополнительно содержит `ai.ts` (по плану — `src/ai/`) и `effects.ts` (по плану — рендер) |
| `src/levels/` — «загрузчик, валидатор» | Дополнительно содержит `format.ts` с типами и `LevelError` |
| `src/render/` — «рендер, атлас спрайтов, HUD, эффекты» | Атласа нет: спрайты рисуются процедурно в `sprites.ts`. Эффекты разделены: логика — `src/world/effects.ts`, отрисовка — `src/render/effects.ts` |
| `src/config/` — «числа баланса, типы врагов, бонусы» | Дополнительно содержит `geometry.ts`, `tiles.ts`, `rules.ts` |
| Конфигурация тестов | Отдельного `vitest.config.ts` нет; настройки Vitest живут в `vite.config.ts` (`test.include: tests/**/*.test.ts`, `environment: 'node'`) |
| Разделы 3.4–3.6 | Спавн идёт до движения, ИИ двигает танк сам, ввод приходит параметром; `levelComplete` и `gameOver` достигаются прямым `app.machine.go(...)`, а не командой ввода; миграций сохранений нет — при несовпадении `SAVE_VERSION` сохранение сбрасывается в `DEFAULT_SAVE` |

Структура `tests/unit` и `tests/sim` из раздела 4 плану соответствует.
