import type { WorldEvent } from '../world/events';

/** Частоты нот (A4 = 440). Доля длительности — 1/16. */
const NOTE_FREQ: Record<string, number> = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
  'C3': 130.81, 'G3': 196.00, 'E3': 130.81,
};

/** Мелодия баса и мелодии: массив «нота/пауза — длительность в 16-ных». */
const MELODY: Array<[string | null, number]> = [
  ['C5', 2], ['E5', 2], ['G5', 2], ['C5', 2],
  ['D5', 2], ['F5', 2], ['A5', 2], ['D5', 2],
  ['E5', 2], ['G5', 2], ['C5', 2], ['E5', 2],
  ['G5', 2], ['E5', 2], ['D5', 2], ['F5', 2],
];
const BASS: Array<[string | null, number]> = [
  ['C3', 4], ['G3', 4], ['C3', 4], ['A3', 4],
  ['F3', 4], ['G3', 4], ['C3', 4], ['G3', 4],
];

const BEAT_SEC = 0.3;

/**
 * Звук по событиям мира (PLAN.md, M6/M9). Логика не знает об аудио: получает только
 * события. Контекст создаётся после первого действия пользователя, иначе браузер
 * его заблокирует. Фоновая музыка — процедурный chiptune-цикл (D7, M9).
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private musicTimer: number | null = null;
  private musicStart = 0;
  private musicOsc: OscillatorNode | null = null;
  private bassOsc: OscillatorNode | null = null;
  private hatOsc: OscillatorNode | null = null;
  private hatFilter: BiquadFilterNode | null = null;

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
    if (!on) this.stopMusic();
  }

  /** Запускает процедурный фоновой музыкальный цикл. */
  playMusic(): void {
    if (!this.ctx || !this.enabled) return;
    if (this.musicTimer !== null) return;
    this.stopMusicNodes();
    this.musicStart = this.ctx.currentTime;
    this.scheduleMusic();
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 200);
  }

  /** Останавливает фоновую музыку. */
  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.stopMusicNodes();
  }

  private stopMusicNodes(): void {
    for (const osc of [this.musicOsc, this.bassOsc, this.hatOsc]) {
      if (osc) { try { osc.stop(); } catch {} }
    }
    this.musicOsc = null;
    this.bassOsc = null;
    this.hatOsc = null;
    this.hatFilter = null;
  }

  /**
   * Планирует следующие 200 мс музыки: мелодию, бас и хэт.
   * Использует schedule на будущее время для точного ритма.
   */
  private scheduleMusic(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const elapsed = (t0 - this.musicStart) % (BEAT_SEC * 16);
    const bar = Math.floor(elapsed / BEAT_SEC);

    // Мелодия — пищащий квадратный осциллятор.
    if (!this.musicOsc) {
      this.musicOsc = this.ctx.createOscillator();
      this.musicOsc.type = 'square';
      const g = this.ctx.createGain();
      g.gain.value = 0.04;
      this.musicOsc.connect(g).connect(this.ctx.destination);
      this.musicOsc.start(t0);
    }
    // Бас — треугольник.
    if (!this.bassOsc) {
      this.bassOsc = this.ctx.createOscillator();
      this.bassOsc.type = 'triangle';
      const g = this.ctx.createGain();
      g.gain.value = 0.06;
      this.bassOsc.connect(g).connect(this.ctx.destination);
      this.bassOsc.start(t0);
    }
    // Хэт — шум с фильтром.
    if (!this.hatOsc) {
      this.hatOsc = this.ctx.createOscillator();
      this.hatOsc.type = 'white' as OscillatorType;
      this.hatFilter = this.ctx.createBiquadFilter();
      this.hatFilter.type = 'lowpass';
      this.hatFilter.frequency.value = 4000;
      const g = this.ctx.createGain();
      g.gain.value = 0.02;
      this.hatOsc.connect(this.hatFilter).connect(g).connect(this.ctx.destination);
      this.hatOsc.start(t0);
    }

    // Настраиваем частоты на ближайшие 16 долей.
    for (let i = 0; i < 16; i++) {
      const idx = (bar + i) % MELODY.length;
      const time = t0 + i * BEAT_SEC;
      const note = MELODY[idx][0];
      if (note && NOTE_FREQ[note] !== undefined) {
        this.musicOsc.frequency.setValueAtTime(NOTE_FREQ[note], time);
      }
    }
    for (let i = 0; i < 8; i++) {
      const idx = (Math.floor(bar / 2) + i) % BASS.length;
      const time = t0 + i * BEAT_SEC * 2;
      const note = BASS[idx][0];
      if (note && NOTE_FREQ[note] !== undefined) {
        this.bassOsc.frequency.setValueAtTime(NOTE_FREQ[note], time);
      }
    }
    // Хэт каждую вторую долю.
    for (let i = 0; i < 16; i += 2) {
      const time = t0 + i * BEAT_SEC;
      this.hatFilter!.frequency.setValueAtTime(200 + Math.random() * 800, time);
    }
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
