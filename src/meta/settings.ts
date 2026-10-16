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
}

const DEFAULTS: SettingsData = { master: 0.8, music: 0.55, sfx: 0.8, muted: false, shake: 0.8, damageNumbers: true, showFps: false, lowFlash: false };
const KEY = 'tankorost.settings';

class Settings {
  data: SettingsData = { ...DEFAULTS };

  load(): void {
    const raw = storage.get(KEY);
    if (raw) {
      try {
        const v = JSON.parse(raw) as Partial<SettingsData>;
        for (const k of Object.keys(DEFAULTS) as (keyof SettingsData)[]) {
          if (typeof v[k] === typeof DEFAULTS[k]) (this.data as unknown as Record<string, unknown>)[k] = v[k];
        }
      } catch { this.data = { ...DEFAULTS }; }
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
  }
}

export const settings = new Settings();
