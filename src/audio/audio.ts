// Звук: собственный синтез WebAudio (без внешних файлов). Эффекты с
// ограничением одновременных голосов и стерео по позиции; громкость
// эффектов/музыки/общая; музыка — процедурный секвенсор (music.ts).

type OscType = OscillatorType;

interface ToneOpts {
  type?: OscType;
  vol?: number;
  to?: number;
  at?: number;
  delay?: number;
  pan?: number;
  dest?: AudioNode;
  attack?: number;
  detune?: number;
}

interface NoiseOpts {
  vol?: number;
  freq?: number;
  to?: number;
  filter?: BiquadFilterType;
  q?: number;
  at?: number;
  delay?: number;
  pan?: number;
  dest?: AudioNode;
  attack?: number;
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

class AudioEngine {
  ac: AudioContext | null = null;
  master: GainNode | null = null;
  sfxBus: GainNode | null = null;
  musicBus: GainNode | null = null;
  comp: DynamicsCompressorNode | null = null;
  noiseBuf: AudioBuffer | null = null;
  settings: AudioSettings = { master: 0.8, music: 0.55, sfx: 0.8, muted: false };
  private last = new Map<string, number>();
  private voices = 0;
  /** Множитель «мощи» звуков (растёт с поколением танка). */
  power = 0;

  unlock(): void {
    try {
      if (!this.ac) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ac = new AC();
        this.comp = this.ac.createDynamicsCompressor();
        this.comp.threshold.value = -16; this.comp.ratio.value = 6; this.comp.attack.value = 0.003; this.comp.release.value = 0.2;
        this.master = this.ac.createGain();
        this.master.connect(this.comp);
        this.comp.connect(this.ac.destination);
        this.sfxBus = this.ac.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus = this.ac.createGain();
        this.musicBus.connect(this.master);
        const len = this.ac.sampleRate * 2;
        this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.apply();
      }
      if (this.ac.state === 'suspended') void this.ac.resume();
    } catch { /* без звука */ }
  }

  apply(): void {
    if (!this.master || !this.sfxBus || !this.musicBus) return;
    const s = this.settings;
    this.master.gain.value = s.muted ? 0 : s.master;
    this.sfxBus.gain.value = s.sfx;
    this.musicBus.gain.value = s.music * 0.6;
  }

  get now(): number {
    return this.ac ? this.ac.currentTime : 0;
  }

  private out(dest: AudioNode | undefined, pan: number | undefined): AudioNode {
    const d = dest ?? this.sfxBus!;
    if (!pan || !this.ac) return d;
    const p = this.ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(d);
    return p;
  }

  tone(f: number, dur: number, o: ToneOpts = {}): void {
    const ac = this.ac;
    if (!ac) return;
    const t = o.at ?? ac.currentTime + (o.delay ?? 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + dur);
    const v = o.vol ?? 0.15;
    const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.out(o.dest, o.pan));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur: number, o: NoiseOpts = {}): void {
    const ac = this.ac;
    if (!ac || !this.noiseBuf) return;
    const t = o.at ?? ac.currentTime + (o.delay ?? 0);
    const s = ac.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.filter ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t);
    if (o.q) f.Q.value = o.q;
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    const g = ac.createGain();
    const v = o.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out(o.dest, o.pan));
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.02);
  }

  /** Проигрывает эффект с ограничением частоты и числа голосов. */
  play(name: string, o: { pan?: number; vol?: number; pitch?: number; gap?: number } = {}): void {
    if (!this.ac || this.settings.muted) return;
    const now = performance.now();
    const gap = o.gap ?? 40;
    const l = this.last.get(name) ?? 0;
    if (now - l < gap) return;
    if (this.voices > 28) return;
    this.last.set(name, now);
    this.voices++;
    setTimeout(() => { this.voices--; }, 120);
    const pan = o.pan, v = o.vol ?? 1, k = o.pitch ?? 1;
    const P = this.power;
    const deep = 1 - P * 0.05; // с поколением звуки глубже
    switch (name) {
      // Оружие игроков
      case 'ap':
        this.noise(0.12, { vol: 0.16 * v, freq: 5000, to: 600, pan });
        this.tone(220 * k * deep, 0.18, { type: 'triangle', vol: 0.22 * v, to: 60, pan });
        if (P >= 6) this.tone(1600, 0.12, { type: 'sawtooth', vol: 0.05 * v, to: 400, pan });
        break;
      case 'he':
        this.noise(0.22, { vol: 0.2 * v, freq: 1800, to: 200, pan });
        this.tone(140 * k * deep, 0.22, { type: 'triangle', vol: 0.24 * v, to: 45, pan });
        break;
      case 'mg':
        this.noise(0.05, { vol: 0.1 * v, freq: 4200, to: 1500, filter: 'bandpass', q: 0.8, pan });
        this.tone(330 * k, 0.04, { type: 'square', vol: 0.04 * v, to: 140, pan });
        break;
      case 'rockets':
        this.noise(0.35, { vol: 0.09 * v, freq: 2500, to: 700, filter: 'bandpass', q: 1, pan });
        this.tone(500 * k, 0.3, { type: 'sawtooth', vol: 0.03 * v, to: 900, pan });
        break;
      case 'flame':
        this.noise(0.18, { vol: 0.07 * v, freq: 900, to: 400, filter: 'lowpass', pan, attack: 0.03 });
        break;
      case 'tesla':
        this.tone(1800 * k, 0.12, { type: 'sawtooth', vol: 0.05 * v, to: 300, pan });
        this.noise(0.1, { vol: 0.08 * v, freq: 6000, filter: 'highpass', pan });
        break;
      case 'mine':
        this.tone(900, 0.05, { vol: 0.05 * v, pan });
        this.tone(600, 0.05, { vol: 0.04 * v, delay: 0.05, pan });
        break;
      // Враги
      case 'eshot':
        this.tone(420 * k, 0.08, { type: 'square', vol: 0.04 * v, to: 160, pan });
        break;
      case 'eshell':
        this.noise(0.12, { vol: 0.08 * v, freq: 1400, to: 300, pan });
        this.tone(180 * k, 0.12, { type: 'triangle', vol: 0.08 * v, to: 70, pan });
        break;
      case 'elaser':
        this.tone(1200 * k, 0.12, { type: 'sawtooth', vol: 0.035 * v, to: 500, pan });
        break;
      // Попадания и взрывы
      case 'hit':
        this.noise(0.06, { vol: 0.07 * v, freq: 2600, to: 700, pan });
        break;
      case 'hitArmor':
        this.tone(1400 * k, 0.06, { type: 'square', vol: 0.04 * v, to: 900, pan });
        this.noise(0.04, { vol: 0.05 * v, freq: 6000, filter: 'highpass', pan });
        break;
      case 'boomS':
        this.noise(0.35, { vol: 0.22 * v, freq: 1500 * k, to: 90, pan });
        this.tone(110 * k * deep, 0.3, { type: 'triangle', vol: 0.22 * v, to: 35, pan });
        break;
      case 'boomM':
        this.noise(0.6, { vol: 0.3 * v, freq: 1100 * k, to: 60, pan });
        this.tone(80 * k * deep, 0.5, { type: 'triangle', vol: 0.3 * v, to: 28, pan });
        break;
      case 'boomL':
        this.noise(1.3, { vol: 0.4 * v, freq: 800 * k, to: 40, pan, attack: 0.01 });
        this.tone(60 * deep, 1.1, { type: 'sine', vol: 0.45 * v, to: 22, pan });
        this.tone(90 * deep, 0.8, { type: 'triangle', vol: 0.2 * v, to: 30, pan, delay: 0.05 });
        break;
      case 'crush':
        this.noise(0.1, { vol: 0.1 * v, freq: 700, to: 200, pan });
        this.tone(90 * k, 0.08, { type: 'square', vol: 0.05 * v, to: 50, pan });
        break;
      case 'break':
        this.noise(0.18, { vol: 0.12 * v, freq: 1800 * k, to: 300, pan });
        break;
      case 'glass':
        for (let i = 0; i < 4; i++) this.tone(2400 + Math.random() * 2000, 0.08, { type: 'sine', vol: 0.03 * v, delay: i * 0.02, pan });
        break;
      case 'kill':
        this.noise(0.25, { vol: 0.14 * v, freq: 1300 * k, to: 120, pan });
        this.tone(160 * k, 0.2, { type: 'square', vol: 0.06 * v, to: 50, pan });
        break;
      // Игрок
      case 'hurt':
        this.tone(260, 0.2, { type: 'square', vol: 0.12 * v, to: 70, pan });
        this.noise(0.15, { vol: 0.12 * v, freq: 900, pan });
        break;
      case 'down':
        this.noise(0.9, { vol: 0.3 * v, freq: 900, to: 50 });
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.1 * v, delay: i * 0.12 }));
        break;
      case 'revive':
        [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, { vol: 0.08 * v, delay: i * 0.07 }));
        break;
      case 'reviveTick':
        this.tone(660 + (o.pitch ?? 0) * 600, 0.05, { vol: 0.04 * v, type: 'triangle' });
        break;
      case 'respawn':
        this.tone(220, 0.4, { type: 'triangle', to: 880, vol: 0.08 * v });
        break;
      case 'pickup':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.1, { vol: 0.08 * v, delay: i * 0.05 }));
        break;
      case 'star':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, { vol: 0.08 * v, delay: i * 0.06, type: 'square' }));
        [392, 494].forEach((f, i) => this.tone(f, 0.3, { vol: 0.06 * v, delay: i * 0.12, type: 'triangle' }));
        break;
      case 'freeze':
        [1400, 1100, 1400, 1100, 1700].forEach((f, i) => this.tone(f, 0.07, { vol: 0.05 * v, delay: i * 0.05, type: 'sine' }));
        break;
      case 'helmet':
        this.tone(300, 0.4, { to: 900, vol: 0.07 * v, type: 'triangle' });
        this.tone(450, 0.4, { to: 1350, vol: 0.05 * v, type: 'triangle', delay: 0.05 });
        break;
      case 'grenade':
        this.noise(1.6, { vol: 0.5 * v, freq: 1000, to: 40, attack: 0.02 });
        this.tone(55, 1.4, { type: 'sine', vol: 0.5 * v, to: 25 });
        break;
      case 'levelup':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, { vol: 0.07 * v, delay: i * 0.06 }));
        break;
      case 'select':
        this.tone(880, 0.04, { vol: 0.05 * v });
        break;
      case 'confirm':
        this.tone(660, 0.06, { vol: 0.07 * v });
        this.tone(990, 0.1, { vol: 0.07 * v, delay: 0.06 });
        break;
      case 'deny':
        this.tone(150, 0.14, { vol: 0.08 * v });
        break;
      case 'ability':
        this.tone(300 * k, 0.18, { to: 1200 * k, vol: 0.07 * v, pan });
        break;
      case 'dash':
        this.noise(0.22, { vol: 0.12 * v, freq: 3000, to: 500, filter: 'bandpass', q: 1.2, pan });
        break;
      case 'emp':
        this.tone(120, 0.6, { type: 'sawtooth', vol: 0.1 * v, to: 1800 });
        this.noise(0.6, { vol: 0.1 * v, freq: 5000, filter: 'highpass' });
        break;
      case 'warn':
        for (let i = 0; i < 3; i++) { this.tone(440, 0.16, { vol: 0.08 * v, delay: i * 0.38, type: 'square' }); this.tone(330, 0.16, { vol: 0.08 * v, delay: i * 0.38 + 0.19, type: 'square' }); }
        break;
      case 'event':
        this.tone(660, 0.1, { vol: 0.06 * v, type: 'triangle' });
        this.tone(880, 0.16, { vol: 0.06 * v, type: 'triangle', delay: 0.1 });
        break;
      case 'bossIntro':
        this.tone(55, 2.2, { type: 'sawtooth', vol: 0.2 * v, to: 41, attack: 0.3 });
        this.noise(2, { vol: 0.15 * v, freq: 400, to: 80, attack: 0.5 });
        [110, 104, 98].forEach((f, i) => this.tone(f, 0.5, { type: 'square', vol: 0.06 * v, delay: 0.6 + i * 0.45 }));
        break;
      case 'bossDead':
        for (let i = 0; i < 6; i++) this.noise(0.8, { vol: 0.3 * v, freq: 900, to: 50, delay: i * 0.22 });
        this.tone(50, 2.4, { type: 'sine', vol: 0.5 * v, to: 20, delay: 0.3 });
        break;
      case 'whoosh':
        this.noise(2.6, { vol: 0.18 * v, freq: 200, to: 4000, filter: 'bandpass', q: 1.5, attack: 1.2 });
        this.tone(80, 2.6, { type: 'sine', vol: 0.15 * v, to: 30, attack: 0.8 });
        break;
      case 'reveal':
        [262, 330, 392, 523].forEach((f, i) => this.tone(f, 2.2, { type: 'triangle', vol: 0.06 * v, delay: i * 0.18, attack: 0.3 }));
        [131, 196].forEach(f => this.tone(f, 2.6, { type: 'sine', vol: 0.12 * v, attack: 0.5 }));
        break;
      case 'evolve':
        [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.18, { vol: 0.07 * v, delay: i * 0.05, type: 'square' }));
        this.noise(0.8, { vol: 0.12 * v, freq: 300, to: 6000, filter: 'bandpass', attack: 0.3 });
        break;
      case 'gameover':
        [392, 370, 349, 330, 311, 294, 262].forEach((f, i) => this.tone(f, 0.3, { vol: 0.09 * v, delay: i * 0.2, type: 'triangle' }));
        break;
      case 'victory':
        [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { vol: 0.09 * v, delay: i * 0.13 }));
        break;
      case 'click':
        this.tone(1200, 0.02, { vol: 0.03 * v });
        break;
      case 'buy':
        [660, 880, 1320].forEach((f, i) => this.tone(f, 0.08, { vol: 0.07 * v, delay: i * 0.05 }));
        break;
    }
  }
}

export const audio = new AudioEngine();
