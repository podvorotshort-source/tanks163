// Инструмент настройки масштабов графики: ?dev=tune.
// Слева — панель (группы и каждая картинка отдельно), справа — живая игра
// с внешней графикой (бессмертие, выбор мира, вызов босса и переход).

import type { App } from '../app';
import { GameScene } from '../client/game';
import { save } from '../meta/save';
import type { ClassId } from '../sim/types';
import { TANK_BASE, STAGE_GROWTH } from '../sim/types';
import { STAGE_DEFS } from '../sim/content/stages';
import { killEnemy } from '../sim/combat';
import { extKeys, extIcon } from '../gfx/ext';
import { clearExtFrames } from '../gfx/ext';
import { clearSprites } from '../gfx/sprites';
import {
  ART_GROUPS, artGroupOf, artScaleKey, artScales, onArtScale, setGroupScale, setKeyScale,
  resetAll, resetToFile, artScaleDirty, artScaleJson, type ArtGroup,
} from '../gfx/artScale';

export const TUNE_W = 380;

const CSS = `
#tune { position: fixed; left: 0; top: 0; bottom: 0; width: ${TUNE_W}px; box-sizing: border-box; overflow-y: auto;
  background: #15131c; color: #e6e1d3; font: 13px/1.35 system-ui, sans-serif; padding: 12px 14px 40px; border-right: 1px solid #2c2838; z-index: 5; }
#tune h1 { font-size: 16px; margin: 0 0 2px; color: #f6cf55; }
#tune h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #9d97ad; margin: 16px 0 6px; }
#tune .hint { color: #8f899e; font-size: 12px; margin: 0 0 6px; }
#tune .row { display: grid; grid-template-columns: 1fr 120px 46px; gap: 6px; align-items: center; margin: 3px 0; }
#tune .row.k { grid-template-columns: 34px 1fr 96px 46px; }
#tune .row label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#tune input[type=range] { width: 100%; accent-color: #f6cf55; }
#tune input[type=number] { width: 46px; box-sizing: border-box; background: #221f2c; color: inherit; border: 1px solid #3a3548; border-radius: 4px; padding: 2px 3px; font: inherit; font-size: 12px; }
#tune .changed label { color: #f6cf55; }
#tune button { background: #2a2636; color: inherit; border: 1px solid #423c52; border-radius: 5px; padding: 5px 8px; font: inherit; cursor: pointer; margin: 2px 2px 2px 0; }
#tune button:hover { background: #363046; }
#tune button.main { background: #6b4f12; border-color: #a77c1e; }
#tune button.on { background: #f6cf55; color: #15131c; border-color: #f6cf55; }
#tune details { border-top: 1px solid #262231; padding: 4px 0; }
#tune summary { cursor: pointer; color: #cfc8dc; padding: 3px 0; }
#tune canvas.th { width: 32px; height: 32px; image-rendering: pixelated; background: #221f2c; border-radius: 3px; }
#tune input[type=search] { width: 100%; box-sizing: border-box; background: #221f2c; color: inherit; border: 1px solid #3a3548; border-radius: 5px; padding: 5px 7px; font: inherit; }
#tune .status { font-size: 12px; margin: 4px 0; }
#tune .status.dirty { color: #f6a055; }
#tune .status.clean { color: #7fcf74; }
`;

/** Панель создаётся до холстов игры — чтобы экран сразу занял место справа от неё. */
export function mountTunePanel(): HTMLElement {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.id = 'tune';
  document.body.appendChild(el);
  document.body.style.paddingLeft = `${TUNE_W}px`;
  return el;
}

export function startTune(app: App, el: HTMLElement, params: URLSearchParams): void {
  const cls = (params.get('cls') ?? 'assault') as ClassId;
  let stage = Math.max(0, Math.min(7, Number(params.get('stage') ?? 0)));
  const game = () => (app.top instanceof GameScene ? app.top : null);
  const focusGame = () => (document.getElementById('screen') as HTMLCanvasElement | null)?.focus();

  const start = (n: number) => {
    stage = n;
    const scene = new GameScene({ seed: 7, players: [{ cls }], startStage: n, meta: save.bonus(), unlocks: undefined });
    scene.onEnd = () => start(stage);
    app.set(scene);
    stageBtns.forEach((b, i) => b.classList.toggle('on', i === n));
    focusGame();
  };
  // Бессмертие и номер мира — следим постоянно (после перехода мир меняется сам).
  setInterval(() => {
    const s = game()?.sim;
    if (!s) return;
    for (const p of s.players) p.invulnT = Math.max(p.invulnT, 1e6);
    if (s.stageIdx !== stage) { stage = s.stageIdx; stageBtns.forEach((b, i) => b.classList.toggle('on', i === stage)); }
  }, 250);

  // Пересборка графики после правки — не чаще раза в кадр.
  let pend = false;
  onArtScale(() => {
    if (pend) return;
    pend = true;
    requestAnimationFrame(() => {
      pend = false;
      clearSprites();
      clearExtFrames();
      game()?.ground.rebake();
      refreshStatus();
    });
  });

  // --- Разметка
  el.innerHTML = '';
  const h = (tag: string, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    for (const k of kids) e.append(k);
    return e;
  };
  el.append(
    h('h1', { textContent: 'Масштаб графики' }),
    h('p', { className: 'hint', textContent: 'Справа — игра с картинками из ChatGPT. Ехать: WASD / стрелки. Бессмертие включено. Множители меняют только вид — хитбоксы и баланс прежние.' }),
  );

  // Миры
  el.append(h('h2', { textContent: 'Мир (уровень)' }));
  const stageBox = h('div');
  const stageBtns = STAGE_DEFS.map((s, i) => {
    const b = h('button', { textContent: `${i + 1}`, title: s.name, onclick: () => start(i) }) as HTMLButtonElement;
    stageBox.append(b);
    return b;
  });
  el.append(stageBox);

  // Переход
  el.append(h('h2', { textContent: 'Переход после босса' }));
  const grow = () => {
    const s = game()?.sim;
    if (!s || s.state !== 'play') return null;
    s.growE = s.stageIdx + 1;
    s.sizeTarget = TANK_BASE * Math.pow(STAGE_GROWTH, s.growE - s.stageIdx);
    s.size = s.sizeTarget;
    return s;
  };
  const callBoss = () => {
    const s = game()?.sim;
    if (s && !s.boss && s.state === 'play') s.stageTime = Math.max(s.stageTime, s.stage.bossAt - 0.1);
  };
  const killBoss = () => {
    const s = grow();
    if (!s) return;
    callBoss();
    // Босс появляется через кадр-другой — ждём и добиваем.
    let tries = 0;
    const iv = setInterval(() => {
      const sim = game()?.sim;
      if (!sim || ++tries > 60) { clearInterval(iv); return; }
      if (sim.boss && !sim.boss.dead) { killEnemy(sim, sim.boss, 0, '', false); clearInterval(iv); }
    }, 100);
    focusGame();
  };
  const speed = h('input', { type: 'range', min: '0.1', max: '2', step: '0.05', value: '1' }) as HTMLInputElement;
  const speedV = h('span', { textContent: '×1' });
  speed.oninput = () => { app.timeScale = Number(speed.value); speedV.textContent = '×' + speed.value; };
  speed.onchange = focusGame;
  el.append(
    h('div', {},
      h('button', { textContent: 'Танк вырос до босса', onclick: () => { grow(); focusGame(); } }),
      h('button', { textContent: 'Вызвать босса', onclick: () => { callBoss(); focusGame(); } }),
      h('button', { className: 'main', textContent: 'Убить босса → переход', onclick: killBoss }),
    ),
    h('div', { className: 'row' }, h('label', { textContent: 'Скорость игры' }), speed, speedV),
  );

  // Группы
  el.append(h('h2', { textContent: 'Размеры по группам' }));
  const groupRows = new Map<ArtGroup, (v: number) => void>();
  for (const g of ART_GROUPS) {
    const [row, set] = slider(g.name, artScales().groups[g.id] ?? 1, 0.25, 3, v => setGroupScale(g.id, v));
    groupRows.set(g.id, set);
    el.append(row);
  }

  // Каждая картинка
  el.append(h('h2', { textContent: 'Каждая картинка отдельно' }),
    h('p', { className: 'hint', textContent: 'Множитель картинки умножается на множитель группы. Кадры эффектов и детали врагов настраиваются вместе.' }));
  const search = h('input', { type: 'search', placeholder: 'Поиск: enemy_jeep, prop_, ground…' }) as HTMLInputElement;
  el.append(search);
  const byGroup = new Map<ArtGroup, string[]>();
  for (const k of extKeys()) {
    const g = artGroupOf(k);
    if (!g) continue;
    const sk = artScaleKey(k);
    const list = byGroup.get(g) ?? [];
    if (!list.includes(sk)) list.push(sk);
    byGroup.set(g, list);
  }
  const keyRows: { key: string; row: HTMLElement; set: (v: number) => void }[] = [];
  const sections: { det: HTMLDetailsElement; rows: typeof keyRows }[] = [];
  for (const g of ART_GROUPS) {
    const keys = (byGroup.get(g.id) ?? []).sort();
    if (!keys.length) continue;
    const det = h('details', {}, h('summary', { textContent: `${g.name} (${keys.length})` })) as HTMLDetailsElement;
    const rows: typeof keyRows = [];
    det.addEventListener('toggle', () => {
      // Миниатюры — только при первом раскрытии.
      if (!det.open) return;
      for (const r of rows) {
        const th = r.row.querySelector('canvas.th') as HTMLCanvasElement | null;
        if (th && !th.dataset.done) {
          th.dataset.done = '1';
          const src = extIcon(iconKey(r.key), 64);
          if (src) th.getContext('2d')!.drawImage(src, 0, 0);
        }
      }
    });
    for (const k of keys) {
      const [row, set] = slider(k, artScales().keys[k] ?? 1, 0.25, 3, v => setKeyScale(k, v), true);
      const r = { key: k, row, set };
      rows.push(r);
      keyRows.push(r);
      det.append(row);
    }
    sections.push({ det, rows });
    el.append(det);
  }
  search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    for (const s of sections) {
      let any = false;
      for (const r of s.rows) { const ok = !q || r.key.includes(q); r.row.style.display = ok ? '' : 'none'; any ||= ok; }
      s.det.style.display = any ? '' : 'none';
      if (q && any && !s.det.open) s.det.open = true;
    }
  };

  // Сохранение
  el.append(h('h2', { textContent: 'Сохранить' }));
  const status = h('div', { className: 'status' });
  const canPost = location.protocol.startsWith('http');
  el.append(status, h('div', {},
    ...(canPost ? [h('button', { className: 'main', textContent: 'Сохранить в проект', onclick: saveToProject })] : []),
    h('button', { textContent: 'Скачать scales.json', onclick: download }),
    h('button', { textContent: 'Вернуть из файла', onclick: () => { resetToFile(); syncAll(); } }),
    h('button', { textContent: 'Всё = 1', onclick: () => { resetAll(); syncAll(); } }),
  ), h('p', { className: 'hint', textContent: canPost
    ? '«Сохранить в проект» записывает assets/sprites/scales.json — оттуда масштабы попадут в сборку игры.'
    : 'Открыто из файла: скачайте scales.json и положите в assets/sprites/, затем npm run build. Правки и так видны в этом браузере.' }));

  function refreshStatus(): void {
    const d = artScaleDirty();
    status.className = 'status ' + (d ? 'dirty' : 'clean');
    status.textContent = d ? 'Есть несохранённые в проект правки (в браузере они запомнены).' : 'Совпадает с файлом проекта.';
  }
  function syncAll(): void {
    const s = artScales();
    for (const g of ART_GROUPS) groupRows.get(g.id)?.(s.groups[g.id] ?? 1);
    for (const r of keyRows) r.set(s.keys[r.key] ?? 1);
    refreshStatus();
  }
  async function saveToProject(): Promise<void> {
    try {
      const r = await fetch('/__tk/scales', { method: 'POST', body: artScaleJson() });
      if (!r.ok) throw new Error(await r.text());
      status.className = 'status clean';
      status.textContent = 'Записано в assets/sprites/scales.json.';
    } catch (e) {
      status.className = 'status dirty';
      status.textContent = 'Не удалось записать: ' + String(e) + ' — используйте «Скачать».';
    }
  }
  function download(): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([artScaleJson()], { type: 'application/json' }));
    a.download = 'scales.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function slider(name: string, v0: number, min: number, max: number, onSet: (v: number) => void, thumb = false): [HTMLElement, (v: number) => void] {
    const row = h('div', { className: 'row' + (thumb ? ' k' : '') });
    const rng = h('input', { type: 'range', min: String(min), max: String(max), step: '0.01', value: String(v0) }) as HTMLInputElement;
    const num = h('input', { type: 'number', min: String(min), max: String(max), step: '0.05', value: v0.toFixed(2) }) as HTMLInputElement;
    const lab = h('label', { textContent: name, title: name + ' — двойной щелчок: сбросить в 1' });
    const set = (v: number) => { rng.value = String(v); num.value = v.toFixed(2); row.classList.toggle('changed', Math.abs(v - 1) > 1e-3); };
    rng.oninput = () => { const v = Number(rng.value); num.value = v.toFixed(2); row.classList.toggle('changed', Math.abs(v - 1) > 1e-3); onSet(v); };
    num.onchange = () => { const v = Math.max(min, Math.min(max, Number(num.value) || 1)); set(v); onSet(v); };
    rng.onchange = focusGame;
    lab.ondblclick = () => { set(1); onSet(1); };
    if (thumb) row.append(h('canvas', { className: 'th', width: 64, height: 64 }));
    row.append(lab, rng, num);
    set(v0);
    return [row, set];
  }

  refreshStatus();
  start(stage);
}

/** Картинка для миниатюры: у кадров эффектов — первый кадр. */
function iconKey(k: string): string {
  return extKeys().includes(k) ? k : `${k}_1`;
}
