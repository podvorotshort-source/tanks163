// Процедурная музыка: у каждой ступени своя тема (лад, темп, ритм,
// аккорды). Ноты планируются наперёд по часам AudioContext.

import { audio } from './audio';
import { Rng } from '../core/rng';

interface Track {
  bpm: number;
  /** Тоника (MIDI). */
  root: number;
  /** Лад: интервалы ступеней. */
  scale: number[];
  /** Аккорды по тактам (ступени лада). */
  prog: number[];
  drums: string; // 16 шагов: k — бочка, s — малый, h — хэт, o — открытый, . — пауза
  bass: string; // 16 шагов: x — нота, o — октава, . — пауза
  leadType: OscillatorType;
  padType: OscillatorType;
  leadVol: number;
  /** Плотность мелодии 0..1. */
  density: number;
  seed: number;
  arp?: boolean;
  noDrums?: boolean;
  swing?: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const PHRYG = [0, 1, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

const TRACKS: Record<string, Track> = {
  menu: { bpm: 92, root: 50, scale: DORIAN, prog: [0, 3, 5, 4], drums: 'k...h...k.k.h...', bass: 'x.......x...o...', leadType: 'triangle', padType: 'sine', leadVol: 0.045, density: 0.35, seed: 3, arp: true },
  stage0: { bpm: 128, root: 55, scale: MAJOR, prog: [0, 4, 5, 3], drums: 'k.h.s.h.k.k.s.hh', bass: 'x.x.o.x.x.x.o.x.', leadType: 'square', padType: 'triangle', leadVol: 0.04, density: 0.6, seed: 11 },
  stage1: { bpm: 122, root: 57, scale: MIXO, prog: [0, 6, 3, 4], drums: 'k.hhs.h.k.hhs.hk', bass: 'x..x..x.o..x..x.', leadType: 'square', padType: 'triangle', leadVol: 0.04, density: 0.55, seed: 21, swing: 0.12 },
  stage2: { bpm: 112, root: 52, scale: DORIAN, prog: [0, 3, 6, 4], drums: 'k..hs..hk.k.s..h', bass: 'x...x.o.x...x.o.', leadType: 'triangle', padType: 'sine', leadVol: 0.05, density: 0.45, seed: 31, arp: true },
  stage3: { bpm: 118, root: 53, scale: MIXO, prog: [0, 3, 4, 3], drums: 'k.h.s.hkk.h.s.ho', bass: 'xx.o.x.xx..o.x.o', leadType: 'square', padType: 'sawtooth', leadVol: 0.035, density: 0.5, seed: 41, swing: 0.15 },
  stage4: { bpm: 132, root: 50, scale: MINOR, prog: [0, 5, 3, 4], drums: 'k.h.s.h.k.hks.hh', bass: 'x.x.x.x.x.x.o.x.', leadType: 'sawtooth', padType: 'square', leadVol: 0.03, density: 0.55, seed: 51 },
  stage5: { bpm: 138, root: 49, scale: MINOR, prog: [0, 5, 6, 4], drums: 'k.hok.h.s.hok.hs', bass: 'xoxoxoxoxoxoxoxo', leadType: 'sawtooth', padType: 'sawtooth', leadVol: 0.03, density: 0.6, seed: 61, arp: true },
  stage6: { bpm: 100, root: 45, scale: PHRYG, prog: [0, 1, 0, 6], drums: 'k...s..kk.k.s...', bass: 'x.....x.x.....o.', leadType: 'sawtooth', padType: 'sawtooth', leadVol: 0.035, density: 0.4, seed: 71 },
  stage7: { bpm: 108, root: 48, scale: LYDIAN, prog: [0, 1, 4, 5], drums: 'k..hs.h.k.khs..h', bass: 'x...o...x...o.x.', leadType: 'triangle', padType: 'sine', leadVol: 0.05, density: 0.45, seed: 81, arp: true },
  boss: { bpm: 150, root: 47, scale: PHRYG, prog: [0, 1, 0, 5], drums: 'k.hsk.hsk.hsk.ss', bass: 'xxoxxxoxxxoxxxox', leadType: 'sawtooth', padType: 'square', leadVol: 0.035, density: 0.7, seed: 91 },
  reveal: { bpm: 70, root: 48, scale: LYDIAN, prog: [0, 4, 5, 3], drums: '................', bass: 'x...............', leadType: 'triangle', padType: 'sine', leadVol: 0.05, density: 0.3, seed: 101, noDrums: true, arp: true },
  victory: { bpm: 120, root: 55, scale: MAJOR, prog: [0, 3, 4, 0], drums: 'k...s...k.k.s...', bass: 'x...x...x...x...', leadType: 'square', padType: 'triangle', leadVol: 0.045, density: 0.5, seed: 111 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Music {
  private track: Track | null = null;
  private name = '';
  private step = 0;
  private next = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private melody: (number | null)[][] = [];

  play(name: string): void {
    if (this.name === name) return;
    const t = TRACKS[name];
    if (!t) return;
    this.name = name;
    this.track = t;
    this.step = 0;
    this.melody = this.compose(t);
    if (audio.ac) this.next = audio.ac.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 50);
  }

  stop(): void {
    this.name = '';
    this.track = null;
  }

  get current(): string {
    return this.name;
  }

  /** Мелодия на 4 такта × 16 шагов, 2 варианта. */
  private compose(t: Track): (number | null)[][] {
    const rng = new Rng(t.seed);
    const out: (number | null)[][] = [];
    for (let v = 0; v < 2; v++) {
      const line: (number | null)[] = [];
      let deg = 2 + rng.int(0, 2);
      for (let bar = 0; bar < 4; bar++) {
        const chord = t.prog[bar];
        for (let s = 0; s < 16; s++) {
          const strong = s % 4 === 0;
          const play = strong ? rng.chance(0.75 * t.density + 0.2) : rng.chance(t.density * 0.55);
          if (!play || (bar === 3 && s > 12)) { line.push(null); continue; }
          if (strong) {
            const tones = [chord, chord + 2, chord + 4];
            deg = tones.reduce((a, b) => (Math.abs(b - deg) < Math.abs(a - deg) ? b : a)) + (rng.chance(0.3) ? 7 : 0);
          } else deg += rng.pick([-1, 1, 1, -2, 2]);
          deg = Math.max(-2, Math.min(11, deg));
          line.push(deg);
        }
      }
      out.push(line);
    }
    return out;
  }

  private note(t: Track, deg: number, oct: number): number {
    const sc = t.scale;
    const o = Math.floor(deg / sc.length);
    const i = ((deg % sc.length) + sc.length) % sc.length;
    return t.root + sc[i] + 12 * (o + oct);
  }

  private tick(): void {
    const ac = audio.ac, t = this.track;
    if (!ac || !t || !audio.musicBus) return;
    if (this.next < ac.currentTime) this.next = ac.currentTime + 0.05;
    const dt = 60 / t.bpm / 4;
    while (this.next < ac.currentTime + 0.25) {
      this.playStep(t, this.step, this.next, dt);
      this.next += dt * (t.swing && this.step % 2 === 0 ? 1 + t.swing : t.swing ? 1 - t.swing : 1);
      this.step++;
    }
  }

  private playStep(t: Track, step: number, at: number, dt: number): void {
    const dest = audio.musicBus!;
    const s = step % 16, bar = Math.floor(step / 16) % 4, loop = Math.floor(step / 64);
    const chord = t.prog[bar];
    // Бас
    const b = t.bass[s];
    if (b !== '.') audio.tone(midi(this.note(t, chord, b === 'o' ? -1 : -2)), dt * 1.6, { type: 'triangle', vol: 0.32, at, dest });
    // Пэд на сильные доли
    if (s === 0) for (const d of [0, 2, 4]) audio.tone(midi(this.note(t, chord + d, 0)), dt * 15, { type: t.padType, vol: t.padType === 'sawtooth' ? 0.012 : 0.03, at, dest, attack: 0.08 });
    // Арпеджио
    if (t.arp && s % 2 === 0) {
      const d = [0, 2, 4, 7][(s / 2) % 4];
      audio.tone(midi(this.note(t, chord + d, 1)), dt * 1.2, { type: 'square', vol: 0.018, at, dest });
    }
    // Мелодия: со второго круга, с вариацией.
    if (loop % 4 !== 0) {
      const mel = this.melody[loop % 2][bar * 16 + s];
      if (mel !== null && mel !== undefined) audio.tone(midi(this.note(t, mel, 1)), dt * 1.8, { type: t.leadType, vol: t.leadVol, at, dest });
    }
    // Ударные
    if (t.noDrums) return;
    const d = t.drums[s];
    if (d === 'k') audio.tone(150, 0.12, { type: 'sine', to: 42, vol: 0.5, at, dest });
    else if (d === 's') audio.noise(0.12, { vol: 0.13, freq: 2600, filter: 'bandpass', q: 0.7, at, dest });
    else if (d === 'h') audio.noise(0.03, { vol: 0.045, freq: 8000, filter: 'highpass', at, dest });
    else if (d === 'o') audio.noise(0.14, { vol: 0.05, freq: 7000, filter: 'highpass', at, dest });
    // Брейк каждые 8 тактов.
    if (bar === 3 && s >= 12 && loop % 2 === 1 && s % 2 === 0) audio.noise(0.08, { vol: 0.1, freq: 3000, filter: 'bandpass', at, dest });
  }
}

export const music = new Music();
