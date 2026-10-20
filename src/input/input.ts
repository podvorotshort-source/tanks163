// Ввод: клавиатура (две раскладки на одной клавиатуре) и геймпады
// (DualShock 4, DualSense, XInput; стандартная раскладка Chrome/Edge и
// нестандартная Firefox), сенсорный экран телефона (src/input/touch.ts — стик и кнопки 1P).
// Мышь — только для удобства в меню.

import { touch } from './touch';

export type Action = 'up' | 'down' | 'left' | 'right' | 'a1' | 'a2' | 'a3' | 'pause' | 'back' | 'info';
export const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'a1', 'a2', 'a3', 'pause', 'back', 'info'];

/** Клавиши (KeyboardEvent.code) по раскладкам игроков. */
export const KEYS: Record<0 | 1, Record<Action, string[]>> = {
  0: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    a1: ['Space'], a2: ['KeyE'], a3: ['KeyQ'],
    pause: ['Escape', 'KeyP'], back: ['Escape'], info: ['Tab'],
  },
  1: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    a1: ['Numpad0', 'Enter', 'NumpadEnter', 'ControlRight'], a2: ['Numpad1', 'Slash'], a3: ['Numpad2', 'Period'],
    pause: ['Escape', 'KeyP'], back: ['Escape', 'Backspace'], info: ['NumpadDecimal', 'Quote'],
  },
};

/** Названия клавиш для подсказок. */
export const KEY_LABEL: Record<string, string> = {
  KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyE: 'E', KeyQ: 'Q', KeyP: 'P', Space: 'ПРОБЕЛ', Tab: 'TAB',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Numpad0: 'NUM0', Numpad1: 'NUM1', Numpad2: 'NUM2',
  Enter: 'ENTER', NumpadEnter: 'ENTER', ControlRight: 'ПР.CTRL', Slash: '/', Period: '.', Escape: 'ESC',
  Backspace: 'BKSP', NumpadDecimal: 'NUM.', Quote: "'",
};

const PREVENT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Tab', 'Backspace', 'NumpadEnter',
  'Numpad0', 'Numpad1', 'Numpad2', 'Slash', 'Quote', 'Period', 'KeyQ', 'KeyE',
]);

export interface PadState {
  connected: boolean;
  index: number;
  id: string;
  name: string;
  x: number;
  y: number;
  down: Record<Action, boolean>;
  anyButton: boolean;
}

function emptyActions(): Record<Action, boolean> {
  return { up: false, down: false, left: false, right: false, a1: false, a2: false, a3: false, pause: false, back: false, info: false };
}

export function padName(id: string): string {
  const s = id.toLowerCase();
  if (/0ce6|0df2|dualsense/.test(s)) return 'DualSense';
  if (/05c4|09cc|0ba0|dualshock|wireless controller/.test(s)) return 'DualShock 4';
  if (/xbox|xinput|045e/.test(s)) return 'Xbox';
  return 'Геймпад';
}

const DEAD = 0.22;

function readPad(p: Gamepad): PadState {
  const b = (n: number) => { const x = p.buttons[n]; return !!(x && (x.pressed || x.value > 0.5)); };
  const ax = p.axes;
  let x = ax[0] ?? 0, y = ax[1] ?? 0;
  const m = Math.hypot(x, y);
  if (m < DEAD) { x = 0; y = 0; } else { const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m; x *= k; y *= k; }
  const st = emptyActions();
  const std = p.mapping === 'standard';
  let dU = false, dD = false, dL = false, dR = false;
  if (std) { dU = b(12); dD = b(13); dL = b(14); dR = b(15); }
  else if (ax.length > 9 && ax[9] >= -1.05 && ax[9] <= 1.05) {
    // Firefox/DirectInput: крестовина — «hat»-ось 9.
    const k = Math.round((ax[9] + 1) * 3.5);
    dU = k === 7 || k <= 1; dR = k >= 1 && k <= 3; dD = k >= 3 && k <= 5; dL = k >= 5 && k <= 7;
  }
  if (dU || dD || dL || dR) {
    x = (dR ? 1 : 0) - (dL ? 1 : 0);
    y = (dD ? 1 : 0) - (dU ? 1 : 0);
    const n = Math.hypot(x, y) || 1; x /= n; y /= n;
  }
  st.up = y < -0.5; st.down = y > 0.5; st.left = x < -0.5; st.right = x > 0.5;
  if (std) {
    // 0 крест, 1 круг, 2 квадрат, 3 треугольник, 4 L1, 5 R1, 6 L2, 7 R2, 9 Options
    st.a1 = b(0) || b(7); st.a2 = b(2) || b(5); st.a3 = b(1) || b(4) || b(6);
    st.back = b(1); st.info = b(3); st.pause = b(9);
  } else {
    // Firefox: 0 квадрат, 1 крест, 2 круг, 3 треугольник
    st.a1 = b(1) || b(7); st.a2 = b(0) || b(5); st.a3 = b(2) || b(4) || b(6);
    st.back = b(2); st.info = b(3); st.pause = b(9);
  }
  return {
    connected: true, index: p.index, id: p.id, name: padName(p.id), x, y, down: st,
    anyButton: p.buttons.some(q => q && q.pressed),
  };
}

export interface PlayerFrame {
  moveX: number;
  moveY: number;
  /** Удерживается. */
  down: Record<Action, boolean>;
  /** Нажато в этом кадре (фронт). */
  pressed: Record<Action, boolean>;
  /** Навигация меню с автоповтором. */
  nav: { up: boolean; down: boolean; left: boolean; right: boolean };
}

function emptyFrame(): PlayerFrame {
  return { moveX: 0, moveY: 0, down: emptyActions(), pressed: emptyActions(), nav: { up: false, down: false, left: false, right: false } };
}

class InputManager {
  keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  pads: (PadState | null)[] = [];
  /** Какой геймпад закреплён за игроком (индекс в navigator.getGamepads) */
  padOf: [number | null, number | null] = [null, null];
  /** Режим: 1 игрок — обе раскладки и все геймпады управляют 1P. */
  solo = true;
  players: [PlayerFrame, PlayerFrame] = [emptyFrame(), emptyFrame()];
  /** Объединённый ввод для общих меню. */
  menu: PlayerFrame = emptyFrame();
  private prevDown: [Record<Action, boolean>, Record<Action, boolean>, Record<Action, boolean>] = [emptyActions(), emptyActions(), emptyActions()];
  private repeat: { t: number; dir: string }[] = [{ t: 0, dir: '' }, { t: 0, dir: '' }, { t: 0, dir: '' }];
  private padPrevAny = new Map<number, boolean>();
  lastDevice: 'keyboard' | 'pad' | 'mouse' = 'keyboard';
  /** Произошёл любой пользовательский ввод (для разблокировки звука). */
  onAnyInput: (() => void) | null = null;
  /** Новое нажатие на незакреплённом геймпаде (для присоединения игрока). */
  onPadJoin: ((padIndex: number) => void) | null = null;
  /** touch — щелчок пришёл касанием (тап): списки сначала выбирают пункт, действие — повторным тапом. */
  mouse = { x: 0, y: 0, down: false, clicked: false, moved: false, wheel: 0, touch: false };
  /** Подмена getGamepads для тестов. */
  padSource: (() => (Gamepad | null)[]) | null = null;

  attach(el: HTMLElement, toVirtual: (cx: number, cy: number) => [number, number]): void {
    addEventListener('keydown', e => {
      if (PREVENT.has(e.code)) e.preventDefault();
      this.onAnyInput?.();
      this.lastDevice = 'keyboard';
      if (e.repeat) return;
      this.keysDown.add(e.code);
      this.keysPressed.add(e.code);
    });
    addEventListener('keyup', e => { this.keysDown.delete(e.code); });
    addEventListener('blur', () => this.keysDown.clear());
    el.addEventListener('mousemove', e => {
      const [x, y] = toVirtual(e.clientX, e.clientY);
      this.mouse.x = x; this.mouse.y = y; this.mouse.moved = true; this.lastDevice = 'mouse'; this.mouse.touch = false;
    });
    el.addEventListener('mousedown', e => {
      const [x, y] = toVirtual(e.clientX, e.clientY);
      this.mouse.x = x; this.mouse.y = y; this.mouse.down = true; this.mouse.clicked = true; this.lastDevice = 'mouse'; this.mouse.touch = false;
      this.onAnyInput?.();
    });
    // Касания (меню на телефоне): тап — щелчок сразу, без задержки и «эмуляции мыши» браузером;
    // протяжка пальцем по вертикали — прокрутка списков (как колесо мыши).
    let tid: number | null = null, ty = 0, drag = 0, tx0 = 0, ty0 = 0;
    const find = (e: TouchEvent) => Array.from(e.changedTouches).find(t => t.identifier === tid);
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      this.onAnyInput?.();
      if (tid !== null) return;
      const t = e.changedTouches[0];
      tid = t.identifier;
      [tx0, ty0] = toVirtual(t.clientX, t.clientY);
      ty = ty0; drag = 0;
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      const t = find(e);
      if (!t) return;
      e.preventDefault();
      const [x, y] = toVirtual(t.clientX, t.clientY);
      drag = Math.max(drag, Math.hypot(x - tx0, y - ty0));
      const step = 14;
      while (y - ty > step) { this.mouse.wheel -= 1; ty += step; }
      while (ty - y > step) { this.mouse.wheel += 1; ty -= step; }
    }, { passive: false });
    const end = (e: TouchEvent) => {
      const t = find(e);
      if (!t) return;
      e.preventDefault();
      tid = null;
      if (e.type !== 'touchend' || drag > 10) return;
      const [x, y] = toVirtual(t.clientX, t.clientY);
      this.mouse.x = x; this.mouse.y = y; this.mouse.moved = true; this.mouse.clicked = true; this.mouse.touch = true;
      this.lastDevice = 'mouse';
    };
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    addEventListener('mouseup', () => { this.mouse.down = false; });
    el.addEventListener('wheel', e => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('gamepaddisconnected', e => {
      const idx = (e as GamepadEvent).gamepad.index;
      for (let i = 0; i < 2; i++) if (this.padOf[i] === idx) this.padOf[i] = null;
    });
  }

  private pollPads(): void {
    let raw: (Gamepad | null)[] = [];
    try {
      raw = this.padSource ? this.padSource() : navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch { raw = []; }
    this.pads = [];
    for (const p of raw) {
      if (!p || !p.connected) continue;
      const st = readPad(p);
      this.pads[p.index] = st;
      const prev = this.padPrevAny.get(p.index) ?? false;
      if (st.anyButton && !prev) {
        this.lastDevice = 'pad';
        this.onAnyInput?.();
        if (!this.solo && this.padOf[0] !== p.index && this.padOf[1] !== p.index) this.onPadJoin?.(p.index);
      }
      this.padPrevAny.set(p.index, st.anyButton);
    }
    // Закреплённые геймпады, которых больше нет, освобождаем.
    for (let i = 0; i < 2; i++) { const pi = this.padOf[i]; if (pi !== null && !this.pads[pi]) this.padOf[i] = null; }
  }

  connectedPads(): PadState[] {
    return this.pads.filter((p): p is PadState => !!p);
  }

  /** Закрепить геймпад за игроком (снимает его с другого). */
  assignPad(slot: 0 | 1, padIndex: number | null): void {
    const other = slot === 0 ? 1 : 0;
    if (padIndex !== null && this.padOf[other] === padIndex) this.padOf[other] = null;
    this.padOf[slot] = padIndex;
  }

  autoAssignPads(): void {
    const list = this.connectedPads().map(p => p.index).sort((a, b) => a - b);
    for (const idx of list) {
      if (this.padOf[0] === idx || this.padOf[1] === idx) continue;
      if (this.padOf[0] === null) this.padOf[0] = idx;
      else if (this.padOf[1] === null) this.padOf[1] = idx;
    }
  }

  swapPads(): void {
    this.padOf = [this.padOf[1], this.padOf[0]];
  }

  private kb(slot: 0 | 1, a: Action, set: Set<string>): boolean {
    for (const k of KEYS[slot][a]) if (set.has(k)) return true;
    return false;
  }

  /** Вызывать один раз в начале каждого кадра отрисовки. */
  update(dt: number): void {
    this.pollPads();
    const allPads = this.connectedPads();
    for (let s = 0 as 0 | 1; s < 2; s = (s + 1) as 0 | 1) {
      const f = this.players[s];
      const down = emptyActions();
      const slots: (0 | 1)[] = this.solo && s === 0 ? [0, 1] : [s];
      let mx = 0, my = 0;
      for (const ks of slots) {
        for (const a of ACTIONS) if (this.kb(ks, a, this.keysDown)) down[a] = true;
      }
      mx = (down.right ? 1 : 0) - (down.left ? 1 : 0);
      my = (down.down ? 1 : 0) - (down.up ? 1 : 0);
      const pads = this.solo ? (s === 0 ? allPads : []) : (this.padOf[s] !== null && this.pads[this.padOf[s]!] ? [this.pads[this.padOf[s]!]!] : []);
      for (const p of pads) {
        for (const a of ACTIONS) if (p.down[a]) down[a] = true;
        if (p.x || p.y) { mx = p.x; my = p.y; }
      }
      if (s === 0 && touch.st.active) {
        const t = touch.st;
        if (t.x || t.y) { mx = t.x; my = t.y; this.lastDevice = 'pad'; }
        if (t.down.a1 || t.hit.a1) down.a1 = true;
        if (t.down.a2 || t.hit.a2) down.a2 = true;
        if (t.down.a3 || t.hit.a3) down.a3 = true;
        if (t.down.pause || t.hit.pause) down.pause = true;
        t.hit.a1 = t.hit.a2 = t.hit.a3 = t.hit.pause = false;
      }
      const m = Math.hypot(mx, my);
      if (m > 1) { mx /= m; my /= m; }
      f.moveX = mx; f.moveY = my;
      this.finishFrame(f, down, s, dt);
      // Нажатия клавиш, пропущенные между опросами (быстрое нажатие-отпускание).
      for (const ks of slots) for (const a of ACTIONS) if (this.kb(ks, a, this.keysPressed)) f.pressed[a] = true;
    }
    // Общее меню: всё вместе.
    const md = emptyActions();
    for (const a of ACTIONS) md[a] = this.players[0].down[a] || this.players[1].down[a] || this.kb(0, a, this.keysDown) || this.kb(1, a, this.keysDown);
    for (const p of allPads) for (const a of ACTIONS) if (p.down[a]) md[a] = true;
    const mf = this.menu;
    mf.moveX = this.players[0].moveX || this.players[1].moveX;
    mf.moveY = this.players[0].moveY || this.players[1].moveY;
    this.finishFrame(mf, md, 2, dt);
    for (const s of [0, 1] as const) for (const a of ACTIONS) if (this.kb(s, a, this.keysPressed)) mf.pressed[a] = true;
    this.keysPressed.clear();
  }

  private finishFrame(f: PlayerFrame, down: Record<Action, boolean>, ri: number, dt: number): void {
    const prev = this.prevDown[ri];
    for (const a of ACTIONS) { f.pressed[a] = down[a] && !prev[a]; prev[a] = down[a]; f.down[a] = down[a]; }
    // Навигация с автоповтором.
    const dirs: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
    const rep = this.repeat[ri];
    let held = '';
    for (const d of dirs) if (down[d]) held = d;
    f.nav = { up: false, down: false, left: false, right: false };
    for (const d of dirs) if (f.pressed[d]) { f.nav[d] = true; rep.dir = d; rep.t = 0.32; }
    if (held && held === rep.dir) {
      rep.t -= dt;
      if (rep.t <= 0) { f.nav[held as 'up'] = true; rep.t = 0.085; }
    } else if (!held) rep.dir = '';
  }

  /** Сбросить фронты (после обработки первым шагом симуляции). */
  consumePressed(): void {
    for (const f of [...this.players, this.menu]) for (const a of ACTIONS) f.pressed[a] = false;
  }

  endFrame(): void {
    this.mouse.clicked = false;
    this.mouse.moved = false;
    this.mouse.wheel = 0;
  }

  rumble(slot: 0 | 1, strong = 0.5, weak = 0.3, ms = 120): void {
    const idx = this.solo ? (this.connectedPads()[0]?.index ?? null) : this.padOf[slot];
    if (idx === null || idx === undefined) return;
    try {
      const gp = navigator.getGamepads?.()[idx];
      const act = (gp as unknown as { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } })?.vibrationActuator;
      act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch(() => {});
    } catch { /* не поддерживается */ }
  }

  /** Подписи клавиш для подсказок. */
  label(slot: 0 | 1, a: Action): string {
    return KEYS[slot][a].map(k => KEY_LABEL[k] ?? k).slice(0, 2).join('/');
  }
}

export const input = new InputManager();
