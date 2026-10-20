// Сенсорное управление для телефона: плавающий стик под левым большим пальцем (где коснулся — там и центр),
// справа — три круглые кнопки способностей (со значками) и пауза. Показывается только в бою; в меню, на выборе
// улучшений и паузе касания идут в игру как щелчки мыши (меню и так управляются мышью).
// Ввод попадает в InputManager как ещё одно устройство игрока 1P.

import { iconCanvas } from '../gfx/art/icons';

export interface TouchState {
  /** Есть сенсорный экран (был хоть один тач). */
  active: boolean;
  x: number;
  y: number;
  down: { a1: boolean; a2: boolean; a3: boolean; pause: boolean };
  /** Нажатие с прошлого опроса (быстрый тап может начаться и закончиться между кадрами). */
  hit: { a1: boolean; a2: boolean; a3: boolean; pause: boolean };
}

/** Способность на кнопке: значок и перезарядка. */
export interface TouchAbility {
  id: string;
  /** Доля оставшейся перезарядки 0..1 (0 — готова). */
  left: number;
  /** Секунд до готовности. */
  sec: number;
  /** Эффект сейчас действует. */
  active: boolean;
  charges: number;
}

const STICK_R = 56;            // ход стика, css-пиксели

class TouchUI {
  readonly st: TouchState = { active: false, x: 0, y: 0, down: { a1: false, a2: false, a3: false, pause: false }, hit: { a1: false, a2: false, a3: false, pause: false } };
  private root!: HTMLDivElement;
  private zone!: HTMLDivElement;
  private base!: HTMLDivElement;
  private knob!: HTMLDivElement;
  private btns: Record<'a1' | 'a2' | 'a3' | 'pause', HTMLDivElement> = {} as never;
  private turn!: HTMLDivElement;
  private stickId: number | null = null;
  private sx = 0; private sy = 0;
  private want = false;
  private shown = false;
  private icons = ['', '', ''];
  /** Слои индикатора перезарядки на кнопках способностей. */
  private cdEl: { ic: HTMLDivElement; cd: HTMLDivElement; n: HTMLDivElement; c: HTMLDivElement; last: string; left: number }[] = [];
  onAny: (() => void) | null = null;

  install(): void {
    const coarse = matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
    const css = document.createElement('style');
    css.textContent = `
      html, body { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      #touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; display: none; }
      #touch.on { display: block; }
      #touch .zone { position: absolute; left: 0; top: 0; width: 50%; height: 100%; pointer-events: auto; }
      #touch .base { position: absolute; width: ${STICK_R * 2}px; height: ${STICK_R * 2}px; margin: -${STICK_R}px 0 0 -${STICK_R}px; border-radius: 50%;
        background: rgba(20,16,34,.38); border: 3px solid rgba(255,255,255,.28); box-sizing: border-box; display: none; }
      #touch .knob { position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
        background: radial-gradient(circle at 40% 35%, #8fa2d8, #4a5c94 70%); border: 3px solid #1a1124; box-sizing: border-box; display: none; }
      #touch .b { position: absolute; border-radius: 50%; pointer-events: auto; box-sizing: border-box; border: 3px solid #1a1124;
        background: radial-gradient(circle at 40% 32%, #4c5a84, #232a44 72%); box-shadow: 0 3px 0 rgba(0,0,0,.45);
        display: flex; align-items: center; justify-content: center; color: #fbe9a8; font: bold 18px monospace; }
      #touch .b .ic { width: 60%; height: 60%; display: flex; }
      #touch .b canvas { image-rendering: pixelated; width: 100%; height: 100%; }
      #touch .b .cd, #touch .b .n { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; }
      #touch .b .n { display: flex; align-items: center; justify-content: center; font: bold 22px monospace; color: #fbe9a8;
        text-shadow: 0 2px 0 #07060b, 0 0 4px #07060b; }
      #touch .b .c { position: absolute; right: -4px; top: -4px; min-width: 20px; height: 20px; border-radius: 10px; pointer-events: none;
        background: #fbcd4a; color: #1a1124; border: 2px solid #1a1124; box-sizing: border-box; font: bold 12px/16px monospace; text-align: center; display: none; }
      #touch .b.act { box-shadow: 0 0 0 3px #fbcd4a, 0 3px 0 rgba(0,0,0,.45); }
      #touch .b.rdy { animation: tready .45s ease-out; }
      @keyframes tready { 0% { filter: brightness(2.2); transform: scale(1.14); } 100% { filter: none; transform: none; } }
      #touch .b.p { background: radial-gradient(circle at 40% 32%, #e8b84a, #b07818 72%); }
      #touch .b.d { transform: translateY(2px) scale(.94); filter: brightness(1.35); }
      #touch .b.pause { width: 44px; height: 44px; right: 14px; top: 12px; border-radius: 12px; font-size: 16px; }
      #turn { position: fixed; inset: 0; z-index: 20; background: #07060b; color: #fbcd4a; display: none; align-items: center; justify-content: center;
        text-align: center; font: bold 20px monospace; padding: 24px; }
    `;
    document.head.appendChild(css);
    const root = this.root = document.createElement('div');
    root.id = 'touch';
    this.zone = this.el(root, 'zone');
    this.base = this.el(root, 'base');
    this.knob = this.el(root, 'knob');
    const place: [('a1' | 'a2' | 'a3'), number, number, number][] = [['a1', 24, 30, 84], ['a2', 122, 22, 64], ['a3', 30, 128, 64]];
    for (const [k, r, b, s] of place) {
      const d = this.btns[k] = this.el(root, 'b' + (k === 'a1' ? ' p' : ''));
      Object.assign(d.style, { right: r + 'px', bottom: b + 'px', width: s + 'px', height: s + 'px' });
      this.cdEl.push({ ic: this.el(d, 'ic'), cd: this.el(d, 'cd'), n: this.el(d, 'n'), c: this.el(d, 'c'), last: '', left: 0 });
      if (s < 70) this.cdEl[this.cdEl.length - 1].n.style.fontSize = '17px';
      this.hold(d, k);
    }
    const p = this.btns.pause = this.el(root, 'b pause');
    p.textContent = 'II';
    this.hold(p, 'pause');
    document.body.appendChild(root);
    this.turn = document.createElement('div');
    this.turn.id = 'turn';
    this.turn.textContent = 'Поверните телефон горизонтально ⟳';
    document.body.appendChild(this.turn);

    // стик: касание в левой половине — центр там, где палец
    this.zone.addEventListener('touchstart', e => {
      e.preventDefault();
      this.touched();
      if (this.stickId !== null) return;
      const t = e.changedTouches[0];
      this.stickId = t.identifier; this.sx = t.clientX; this.sy = t.clientY;
      this.moveKnob(t.clientX, t.clientY);
      this.base.style.display = this.knob.style.display = 'block';
      Object.assign(this.base.style, { left: this.sx + 'px', top: this.sy + 'px' });
    }, { passive: false });
    const move = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === this.stickId) { e.preventDefault(); this.moveKnob(t.clientX, t.clientY); }
    };
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === this.stickId) this.release();
    };
    this.zone.addEventListener('touchmove', move, { passive: false });
    this.zone.addEventListener('touchend', end);
    this.zone.addEventListener('touchcancel', end);
    addEventListener('touchstart', () => this.touched(), { passive: true });
    // во весь экран — по отпусканию пальца (touchstart браузеры не считают жестом пользователя)
    addEventListener('touchend', () => this.fullscreen(), { passive: true });
    addEventListener('resize', () => this.orient());
    if (coarse) this.st.active = true;
    this.orient();
  }

  private el(parent: HTMLElement, cls: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
  }

  private hold(d: HTMLDivElement, k: 'a1' | 'a2' | 'a3' | 'pause'): void {
    d.addEventListener('touchstart', e => { e.preventDefault(); this.touched(); this.st.down[k] = true; this.st.hit[k] = true; d.classList.add('d'); }, { passive: false });
    const up = (e: TouchEvent) => { e.preventDefault(); this.st.down[k] = false; d.classList.remove('d'); };
    d.addEventListener('touchend', up, { passive: false });
    d.addEventListener('touchcancel', up, { passive: false });
  }

  private moveKnob(cx: number, cy: number): void {
    let dx = cx - this.sx, dy = cy - this.sy;
    const m = Math.hypot(dx, dy);
    if (m > STICK_R) {
      // палец ушёл дальше хода — центр стика подтягивается за ним
      const k = (m - STICK_R) / m;
      this.sx += dx * k; this.sy += dy * k;
      Object.assign(this.base.style, { left: this.sx + 'px', top: this.sy + 'px' });
      dx = cx - this.sx; dy = cy - this.sy;
    }
    Object.assign(this.knob.style, { left: this.sx + dx + 'px', top: this.sy + dy + 'px' });
    const mm = Math.hypot(dx, dy) / STICK_R;
    const dead = 0.18;
    if (mm < dead) { this.st.x = this.st.y = 0; return; }
    const k = Math.min(1, (mm - dead) / (1 - dead)) / mm;
    this.st.x = (dx / STICK_R) * k; this.st.y = (dy / STICK_R) * k;
  }

  private release(): void {
    this.stickId = null;
    this.st.x = this.st.y = 0;
    this.base.style.display = this.knob.style.display = 'none';
  }

  private touched(): void {
    this.st.active = true;
    this.onAny?.();
    this.orient();
  }

  /** Пока ни разу не удалось — просимся во весь экран и в альбомную ориентацию
   *  (где браузер позволяет; на iPhone — нет, тогда игра просто в окне). Вышел сам — больше не навязываем. */
  private fullDone = false;
  private fullscreen(): void {
    if (this.fullDone) return;
    if (document.fullscreenElement) { this.fullDone = true; return; }
    try {
      const de = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      const lock = () => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
      if (de.requestFullscreen) de.requestFullscreen({ navigationUI: 'hide' }).then(() => { this.fullDone = true; lock(); }).catch(() => {});
      else { de.webkitRequestFullscreen?.(); this.fullDone = true; }
    } catch { this.fullDone = true; /* не поддерживается */ }
  }

  private orient(): void {
    if (!this.turn) return;
    const portrait = this.st.active && innerHeight > innerWidth * 1.05;
    this.turn.style.display = portrait ? 'flex' : 'none';
  }

  /** Начало кадра: сцена боя должна снова попросить кнопки (want), иначе они скрываются. */
  begin(): void { this.want = false; }
  /** Бой идёт — показать стик и кнопки; abs — способности 1P (значки и перезарядка на кнопках). */
  show(abs: TouchAbility[]): void {
    this.want = true;
    for (let i = 0; i < 3; i++) {
      const ab = abs[i];
      const id = ab?.id ?? '';
      const b = this.btns[(['a1', 'a2', 'a3'] as const)[i]];
      const el = this.cdEl[i];
      if (id !== this.icons[i]) {
        this.icons[i] = id;
        el.ic.textContent = '';
        if (id) { const c = iconCanvas('a_' + id, 2), img = document.createElement('canvas'); img.width = c.width; img.height = c.height; img.getContext('2d')!.drawImage(c, 0, 0); el.ic.appendChild(img); }
        b.style.opacity = id ? '1' : '0.35';
        el.left = 0;
      }
      this.cooldown(b, el, ab);
    }
  }

  /** Перезарядка: тёмный сектор убывает по часовой стрелке, в центре — секунды; при готовности кнопка вспыхивает. */
  private cooldown(b: HTMLDivElement, el: TouchUI['cdEl'][number], ab: TouchAbility | undefined): void {
    const left = ab ? ab.left : 0;
    const deg = Math.round(left * 72) * 5;           // шаг 5°, чтобы не трогать стиль каждый кадр
    const key = `${deg}|${left > 0 ? ab!.sec : ''}|${ab?.active ? 1 : 0}|${ab && ab.charges > 1 ? ab.charges : ''}`;
    if (key === el.last) return;
    el.last = key;
    el.cd.style.background = deg > 0 ? `conic-gradient(rgba(7,6,11,.74) ${deg}deg, rgba(7,6,11,.18) 0)` : 'none';
    el.n.textContent = left > 0 ? String(ab!.sec) : '';
    el.ic.style.opacity = left > 0 ? '0.55' : '1';
    b.classList.toggle('act', !!ab?.active);
    const ch = ab && ab.charges > 1 ? String(ab.charges) : '';
    el.c.textContent = ch;
    el.c.style.display = ch ? 'block' : 'none';
    if (el.left > 0 && left === 0) { b.classList.remove('rdy'); void b.offsetWidth; b.classList.add('rdy'); }
    el.left = left;
  }
  /** Конец кадра: применить видимость. */
  end(): void {
    const on = this.want && this.st.active;
    if (on === this.shown) return;
    this.shown = on;
    this.root.classList.toggle('on', on);
    if (!on) { this.release(); for (const k of ['a1', 'a2', 'a3', 'pause'] as const) { this.st.down[k] = false; this.btns[k].classList.remove('d'); } }
  }
}

export const touch = new TouchUI();
