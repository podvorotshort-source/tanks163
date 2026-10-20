// Итоги забега: награда, статистика, трофеи, открытия.

import type { Scene } from '../app';
import { app } from '../app';
import type { Sim } from '../sim/sim';
import { drawText, textWidth, wrapText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { panel, VMenu, menuBackground } from './widgets';
import { save } from '../meta/save';
import type { VariantDef } from '../meta/meta';
import { THREATS, WORKSHOP } from '../meta/meta';
import { WEAPONS } from '../sim/content/weapons';
import { STAGE_DEFS } from '../sim/content/stages';
import { BOSSES } from '../sim/bosses';
import { fmtTime } from '../core/math';
import { music } from '../audio/music';
import { audio } from '../audio/audio';
import { BaseScene } from './base';
import { TitleScene } from './title';
import { startRun } from './flow';
import { iconCanvas } from '../gfx/art/icons';

export class ResultsScene implements Scene {
  readonly id = 'results';
  t = 0;
  scrap: number;
  win: boolean;
  newRecord = false;
  newThreat = false;
  newTrophies: string[] = [];
  menu: VMenu;
  private shown = 0;
  /** Сколько рангов мастерской можно купить на имеющиеся детали (по самым дешёвым). */
  private affordable = 0;
  private tip = '';

  constructor(private sim: Sim, vs: VariantDef[], threat: number) {
    this.win = sim.state === 'victory';
    this.scrap = sim.scrapTotal();
    const d = save.data;
    d.scrap += this.scrap;
    d.totalScrap += this.scrap;
    d.stats.runs++;
    if (this.win) d.stats.wins++;
    if (sim.maxStage > d.stats.bestStage || (this.win && d.stats.wins === 1)) { this.newRecord = sim.maxStage > d.stats.bestStage; d.stats.bestStage = Math.max(d.stats.bestStage, sim.maxStage); }
    if (this.win && (!d.stats.bestTime || sim.time < d.stats.bestTime)) d.stats.bestTime = Math.round(sim.time);
    d.stats.kills += sim.kills;
    d.stats.bossKills += sim.bossesKilled;
    d.stats.playTime += sim.time;
    for (const b of sim.defeated) {
      if (!d.trophies[b]) this.newTrophies.push(b);
      d.trophies[b] = (d.trophies[b] ?? 0) + 1;
    }
    if (this.win && threat >= d.threatUnlocked && d.threatUnlocked < 5) { d.threatUnlocked++; this.newThreat = true; }
    save.save();
    const costs = WORKSHOP.map(w => w.costs[save.rank(w.id)]).filter((c): c is number => c !== undefined).sort((x, y) => x - y);
    let left = d.scrap;
    for (const c of costs) { if (c > left) break; left -= c; this.affordable++; }
    this.tip = TIPS[(d.stats.runs + sim.maxStage) % TIPS.length];
    this.menu = new VMenu([
      { label: 'В БАЗУ', sub: `Потратить детали: ${d.scrap}`, act: () => app.set(new BaseScene()) },
      { label: 'ЕЩЁ РАЗ', sub: 'Тот же состав и уровень угрозы', act: () => startRun(vs, threat) },
      { label: 'ГЛАВНОЕ МЕНЮ', act: () => app.set(new TitleScene()) },
    ]);
  }

  enter(): void {
    music.play(this.win ? 'victory' : 'menu');
  }

  update(dt: number): void {
    this.t += dt;
    const s = Math.floor(this.t * 6);
    if (s > this.shown && this.shown < 12) { this.shown = s; audio.play('click'); }
    if (this.t > 0.8) this.menu.update();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    const sim = this.sim;
    menuBackground(ctx, W, H, this.t, sim.maxStage);
    const title = this.win ? 'ПОБЕДА!' : sim.abandoned ? 'ЗАБЕГ ЗАВЕРШЁН' : 'ТАНК УНИЧТОЖЕН';
    drawText(ctx, title, W / 2, 10, { align: 'center', color: this.win ? UI.gold : UI.red, scale: 2 });
    drawText(ctx, `${THREATS[sim.threat]?.name ?? ''} · ${fmtTime(sim.time)} · уровень команды ${sim.level}`, W / 2, 30, { align: 'center', color: UI.dim });
    // Путь по ступеням.
    const pw = Math.min(W - 40, 480), px = Math.round(W / 2 - pw / 2), py = 44;
    for (let i = 0; i < STAGE_DEFS.length; i++) {
      const x = px + Math.round((i * pw) / (STAGE_DEFS.length - 1));
      const done = i < sim.maxStage || (i === sim.maxStage && this.win);
      const cur = i === sim.maxStage && !this.win;
      ctx.fillStyle = done ? UI.gold : cur ? UI.red : '#272336';
      ctx.fillRect(x - 3, py, 7, 7);
      if (i < STAGE_DEFS.length - 1) { ctx.fillStyle = i < sim.maxStage ? UI.gold : "#272336"; ctx.fillRect(x + 4, py + 3, Math.round(pw / (STAGE_DEFS.length - 1)) - 7, 1); }
      if (cur || (done && i === sim.maxStage)) {
        // подпись не вылезает за край экрана
        const name = STAGE_DEFS[i].name.toUpperCase(), hw = textWidth(name) / 2 + 4;
        drawText(ctx, name, Math.max(hw, Math.min(W - hw, x)), py + 11, { align: 'center', color: cur ? UI.red : UI.gold, font: 'main' });
      }
    }
    // Игроки.
    const n = sim.players.length;
    // телефон (невысокий экран): панели игроков слева, награда и меню — справа
    const side = H < 300;
    const cw = side ? Math.min(240, Math.floor((W - 30) / 2 / n)) : Math.min(260, Math.floor((W - 30) / n));
    sim.players.forEach((p, i) => {
      const x = side ? 10 + i * (cw + 6) : Math.round(W / 2 - (n * cw + (n - 1) * 10) / 2 + i * (cw + 10)), y = 70;
      panel(ctx, x, y, cw, 118, i ? UI.p2 : UI.p1);
      drawText(ctx, `${i ? '2P' : '1P'} · ${p.cls.name.toUpperCase()}`, x + 8, y + 6, { color: i ? UI.p2 : UI.p1 });
      const rows: [string, string][] = [
        ['Уничтожено', String(p.kills)], ['Раздавлено', String(p.crushed)], ['Спасено напарников', String(p.revivesDone)],
        ['Нанесено урона', fmtBig(p.damageDealt / sim.tankPower())], ['Получено урона', fmtBig(p.damageTaken / sim.tankPower())],
      ];
      rows.forEach(([a, b], k) => { if (k * 2 < this.shown) { drawText(ctx, a, x + 8, y + 20 + k * 10, { color: UI.dim }); drawText(ctx, b, x + cw - 8, y + 20 + k * 10, { color: UI.text, align: 'right' }); } });
      // Оружие по урону.
      const total = p.weapons.reduce((s, w) => s + w.dmgDealt, 0) || 1;
      p.weapons.slice().sort((a, b) => b.dmgDealt - a.dmgDealt).slice(0, 4).forEach((w, k) => {
        const yy = y + 74 + k * 10;
        ctx.drawImage(iconCanvas('w_' + w.id), x + 6, yy - 3, 10, 10);
        drawText(ctx, `${WEAPONS[w.id].name} ${w.level}`, x + 18, yy, { color: UI.text });
        drawText(ctx, `${Math.round((w.dmgDealt / total) * 100)}%`, x + cw - 8, yy, { color: UI.gold, align: 'right' });
      });
    });
    // Награда.
    const left = side ? 10 + n * (cw + 6) : 0, cx = side ? Math.round((left + W) / 2) : W / 2, colW = side ? W - left - 10 : W - 20;
    const ry = side ? 72 : 196;
    drawText(ctx, `+${this.scrap} ДЕТАЛЕЙ`, cx, ry, { align: 'center', color: UI.gold, scale: 2 });
    let ly = ry + 20;
    const line = (s: string, color: string) => { for (const l of wrapText(s, colW)) { drawText(ctx, l, cx, ly, { align: 'center', color }); ly += 11; } };
    if (this.newTrophies.length) line('НОВЫЕ ТРОФЕИ: ' + this.newTrophies.map(b => BOSSES[b]?.name ?? b).join(', '), UI.purple);
    if (this.newThreat) line(`ОТКРЫТ НОВЫЙ УРОВЕНЬ УГРОЗЫ: ${THREATS[save.data.threatUnlocked].name.toUpperCase()}`, UI.red);
    if (this.newRecord) line('НОВЫЙ РЕКОРД: ДАЛЬШЕ ВСЕГО!', UI.green);
    if (!this.win) {
      // Поражение — часть пути: подсказываем, что прокачать.
      if (this.affordable > 0) line(`В МАСТЕРСКОЙ ДОСТУПНО УЛУЧШЕНИЙ: ${this.affordable}`, UI.gold);
      line(this.tip, UI.dim);
    }
    if (side) this.menu.draw(ctx, cx, Math.max(ly + 8, H - 82), Math.min(200, colW), 22, this.t);
    else this.menu.draw(ctx, W / 2, Math.max(ly + 8, H - 80), 200, 20, this.t);
  }
}

const TIPS = [
  'Совет: прочность и калибровка в мастерской — основа победы',
  'Совет: победа над боссом открывает исследования синергий',
  'Совет: синергия двух систем сильнее, чем прокачка одной',
  'Совет: «Запасной экипаж» в мастерской — лишняя жизнь в каждом забеге',
  'Совет: переброс и исключение карт помогают собрать нужный билд',
  'Совет: в гараже есть варианты танков с другим стартовым оружием',
];

function fmtBig(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(Math.round(v));
}
