import { describe, expect, it } from 'vitest';
import { ALLY_RESPAWN_DELAY_STEPS, ALLY_SPAWNS_PER_LEVEL } from '../../src/config/rules';
import { spawnAlly, onAllyHit, stepAlly } from '../../src/world/ally';
import { stepWorld } from '../../src/world/step';
import { Tank } from '../../src/world/tank';
import { placeTank, tilePx, worldFromRows } from '../helpers/world';

const IDLE = { dir: null, fire: false } as const;

function fresh(rows: string[] = []) {
  const w = worldFromRows(rows, 7);
  w.enemyQueue.length = 1; // не даём победе случиться раньше проверок
  placeTank(w, tilePx(4), tilePx(12));
  return w;
}

describe('напарник: число появлений', () => {
  it('на новом уровне доступно ровно ALLY_SPAWNS_PER_LEVEL появлений', () => {
    const w = fresh();
    expect(w.allySpawnsLeft).toBe(ALLY_SPAWNS_PER_LEVEL);
    expect(w.ally).toBeNull();
  });

  it('появление уменьшает счётчик и создаёт союзника', () => {
    const w = fresh();
    expect(spawnAlly(w)).toBe(true);
    expect(w.ally).not.toBeNull();
    expect(w.allySpawnsLeft).toBe(ALLY_SPAWNS_PER_LEVEL - 1);
  });

  it('второй союзник одновременно не появляется', () => {
    const w = fresh();
    spawnAlly(w);
    expect(spawnAlly(w)).toBe(false);
    expect(w.allySpawnsLeft).toBe(ALLY_SPAWNS_PER_LEVEL - 1);
  });

  it('после гибели возрождается по таймеру, пока появления не кончились', () => {
    const w = fresh();
    spawnAlly(w);
    onAllyHit(w);
    expect(w.ally).toBeNull();
    expect(w.allyRespawnTimer).toBe(ALLY_RESPAWN_DELAY_STEPS);
    for (let i = 0; i < ALLY_RESPAWN_DELAY_STEPS; i++) stepAlly(w);
    expect(w.ally).not.toBeNull();
    expect(w.allySpawnsLeft).toBe(ALLY_SPAWNS_PER_LEVEL - 2);
  });

  it('после пятого появления и гибели напарник больше не возрождается', () => {
    const w = fresh();
    for (let i = 0; i < ALLY_SPAWNS_PER_LEVEL; i++) {
      expect(spawnAlly(w)).toBe(true);
      onAllyHit(w);
    }
    expect(w.allySpawnsLeft).toBe(0);
    expect(w.allyRespawnTimer).toBe(0);
    for (let i = 0; i < ALLY_RESPAWN_DELAY_STEPS * 3; i++) stepAlly(w);
    expect(w.ally).toBeNull();
    expect(spawnAlly(w)).toBe(false);
  });

  it('счётчик сбрасывается на каждом новом уровне', () => {
    const a = fresh();
    for (let i = 0; i < ALLY_SPAWNS_PER_LEVEL; i++) {
      spawnAlly(a);
      onAllyHit(a);
    }
    expect(a.allySpawnsLeft).toBe(0);
    const b = fresh(); // новый уровень — новый мир
    expect(b.allySpawnsLeft).toBe(ALLY_SPAWNS_PER_LEVEL);
  });
});

describe('напарник: поведение в шаге мира', () => {
  it('союзник не появляется, пока игрок погиб', () => {
    const w = fresh();
    w.playerDown = true;
    expect(spawnAlly(w)).toBe(false);
  });

  it('союзник движется к врагу и не выходит за поле', () => {
    const w = fresh();
    spawnAlly(w);
    // Враг стоит в другом углу поля: напарник должен к нему двинуться.
    const enemy = new Tank(tilePx(10), tilePx(2), 'down', 'B');
    w.enemies.push(enemy);
    const start = w.ally!.x + w.ally!.y;
    for (let i = 0; i < 60; i++) stepWorld(w, IDLE);
    expect(w.ally).not.toBeNull();
    expect(w.ally!.x + w.ally!.y).not.toBe(start);
    expect(w.ally!.x).toBeGreaterThanOrEqual(0);
    expect(w.ally!.y).toBeGreaterThanOrEqual(0);
  });
});
