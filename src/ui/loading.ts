// Экран загрузки перед боем: рисуется земля ступени и строятся модели (танки, враги ступени, босс,
// препятствия) — по кусочку в кадр, с полосой прогресса и советами. Без него первые секунды боя дёргаются.

import { app, type Scene } from '../app';
import type { GameScene } from '../client/game';
import { sharedIso } from '../iso/shared';
import { model } from '../iso/models';
import { rosterOf } from '../sim/content/enemies';
import { BOSSES } from '../sim/bosses';
import { STAGE_DEFS } from '../sim/content/stages';
import { TIER_NAMES, TIER_ROMAN } from '../client/tiers';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { iconCanvas } from '../gfx/art/icons';

const TIPS = [
  'Оружие стреляет само — ваше дело манёвр и способности.',
  'Не берёте предложенное орудие — в следующий раз оно выпадет реже, а другие чаще.',
  'Слоты систем ограничены: каждый забег — свой билд. Позже можно переоснастить слабейшую систему.',
  'Поглотив босса, танк принимает его облик и забирает трофейную способность.',
  'Трофейное оружие босса навсегда открывается в мастерской.',
  'Бейте босса в слабое место — урон вдвое выше.',
  'Бочки со взрывчаткой рвутся цепочкой — заманивайте к ним врагов.',
  'Мелкие препятствия танк давит гусеницами, крупные — только снарядами.',
  'Вдвоём подбитого напарника можно спасти: подъедьте к нему.',
  'Каждая ступень вчетверо больше прежней: прежний мир оказывается игрушкой.',
];

type Job = () => void;

export class LoadingScene implements Scene {
  readonly id = 'loading';
  private jobs: Job[] = [];
  private total = 0;
  private t = 0;
  private tip: string;
  private paintDone = false;

  constructor(private next: GameScene) {
    this.tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    const sim = next.sim, s = sim.stageIdx, iso = sharedIso();
    iso.setSeed(sim.cfg.seed);
    iso.prebuild(s);
    const keys = new Set<string>();
    for (const p of sim.players) { keys.add(`tank:${p.classId}:${s}:${p.idx}`); keys.add(`wreck:${p.classId}:${s}`); }
    for (const e of rosterOf(s)) keys.add(`e:${e.art}`);
    const boss = BOSSES[sim.stage.boss];
    if (boss) keys.add(`boss:${boss.art}`);
    for (const p of sim.props.props) if (p.kind !== 'water') keys.add(`prop:${p.kind}:${p.v}`);
    for (const k of keys) this.jobs.push(() => { try { model(k); } catch (e) { console.warn('модель', k, e); } });
    this.total = this.jobs.length + 40;   // 40 «долей» — земля
  }

  update(dt: number): void {
    this.t += dt;
    const iso = sharedIso();
    const end = performance.now() + 14;
    if (!this.paintDone) {
      iso.pump(10);
      if (!iso.busy()) this.paintDone = true;
    }
    while (this.jobs.length && performance.now() < end) this.jobs.shift()!();
    if (this.paintDone && !this.jobs.length && this.t > 0.9) app.set(this.next);
  }

  private progress(): number {
    const done = this.total - this.jobs.length - (this.paintDone ? 0 : 40);
    return Math.max(0, Math.min(1, done / this.total));
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w: W, h: H } = app.screen;
    ctx.fillStyle = UI.bg;
    ctx.fillRect(0, 0, W, H);
    const sim = this.next.sim, st = STAGE_DEFS[sim.stageIdx];
    // звёздная пыль на фоне
    for (let i = 0; i < 60; i++) {
      const x = (i * 97.3 + this.t * (6 + (i % 5) * 3)) % W, y = (i * 53.7) % H;
      ctx.fillStyle = i % 7 ? '#1f1c2e' : '#3a3550';
      ctx.fillRect(Math.round(x), Math.round(y), 1 + (i % 3 === 0 ? 1 : 0), 1);
    }
    const cy = Math.round(H * 0.38);
    drawText(ctx, 'ТАНКОРОСТ', W / 2, cy - 46, { align: 'center', color: UI.gold, scale: 3 });
    drawText(ctx, `${st.title} · ${st.subtitle.toUpperCase()}`, W / 2, cy - 8, { align: 'center', color: UI.text, scale: 1 });
    drawText(ctx, `Модель ${TIER_ROMAN[sim.stageIdx]}: ${TIER_NAMES[sim.stageIdx]}`, W / 2, cy + 6, { align: 'center', color: UI.dim });
    // полоса из сегментов, по ней едет танк
    const bw = Math.min(W - 60, 300), bx = Math.round(W / 2 - bw / 2), by = cy + 34, seg = 10;
    const k = this.progress();
    ctx.fillStyle = '#272336'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = UI.bg; ctx.fillRect(bx - 1, by - 1, bw + 2, 10);
    const n = Math.floor(bw / seg), lit = Math.floor(n * k);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i < lit ? (i % 2 ? UI.gold : '#df981c') : '#151320';
      ctx.fillRect(bx + i * seg + 1, by + 1, seg - 2, 6);
    }
    const icon = iconCanvas('c_' + sim.players[0].classId);
    const tx = Math.round(bx + bw * k - 8), bob = Math.floor(this.t * 8) % 2;
    ctx.drawImage(icon, tx, by - 18 - bob);
    drawText(ctx, `${Math.round(k * 100)}%`, W / 2, by + 14, { align: 'center', color: UI.dim });
    drawText(ctx, 'Совет: ' + this.tip, W / 2, H - 28, { align: 'center', color: UI.faint });
  }
}
