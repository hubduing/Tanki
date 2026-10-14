import type { WorldEvent } from '../world/events';

/**
 * Звук по событиям мира (PLAN.md, M6). Логика не знает об аудио: получает только
 * события. Контекст создаётся после первого действия пользователя, иначе браузер
 * его заблокирует.
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private enabled = true;

  /** Вызывается из обработчика пользовательского ввода. Создаёт AudioContext один раз. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  /** Проигрывает короткий сигнал на каждое событие, если контекст готов. */
  play(events: readonly WorldEvent[]): void {
    if (!this.ctx || !this.enabled) return;
    for (const e of events) {
      switch (e.type) {
        case 'spark':
          this.tone(880, 0.03, 'square');
          break;
        case 'enemyDestroyed':
          this.tone(220, 0.25, 'sawtooth');
          break;
        case 'playerHit':
          this.tone(110, 0.4, 'sawtooth');
          break;
        case 'baseDestroyed':
          this.tone(70, 0.8, 'sawtooth');
          break;
        case 'explosion':
          this.tone(160, 0.15, 'triangle');
          break;
      }
    }
  }

  private tone(freq: number, seconds: number, type: OscillatorType): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }
}
