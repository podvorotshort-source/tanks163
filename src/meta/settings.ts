// Настройки игрока (громкость, тряска, числа урона). Хранятся отдельно от прогресса.

import { audio } from '../audio/audio';
import { storage } from './storage';

export interface SettingsData {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  /** Сила тряски экрана 0..1. */
  shake: number;
  damageNumbers: boolean;
  showFps: boolean;
  /** Уменьшить вспышки. */
  lowFlash: boolean;
  /** Режим для слабых телефонов: без теней, 30 кадров/с, меньше частиц. */
  lowSpec: boolean;
}

/** Слабое устройство: телефон с малым числом ядер или памяти — режим экономии включён по умолчанию. */
function weakDevice(): boolean {
  try {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    return coarse && ((navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 3);
  } catch { return false; }
}

const DEFAULTS: SettingsData = { master: 0.8, music: 0.55, sfx: 0.8, muted: false, shake: 0.8, damageNumbers: true, showFps: false, lowFlash: false, lowSpec: false };
const KEY = 'tankorost.settings';

class Settings {
  data: SettingsData = { ...DEFAULTS };
  /** Слушатели смены настроек (графика подхватывает режим для слабых телефонов). */
  private subs: (() => void)[] = [];
  onApply(fn: () => void): void { this.subs.push(fn); fn(); }

  load(): void {
    this.data.lowSpec = weakDevice();
    const raw = storage.get(KEY);
    if (raw) {
      try {
        const v = JSON.parse(raw) as Partial<SettingsData>;
        for (const k of Object.keys(DEFAULTS) as (keyof SettingsData)[]) {
          if (typeof v[k] === typeof DEFAULTS[k]) (this.data as unknown as Record<string, unknown>)[k] = v[k];
        }
      } catch { this.data = { ...DEFAULTS, lowSpec: weakDevice() }; }
    }
    this.apply();
  }

  save(): void {
    storage.set(KEY, JSON.stringify(this.data));
    this.apply();
  }

  apply(): void {
    audio.settings.master = this.data.master;
    audio.settings.music = this.data.music;
    audio.settings.sfx = this.data.sfx;
    audio.settings.muted = this.data.muted;
    audio.apply();
    for (const fn of this.subs) fn();
  }
}

export const settings = new Settings();
