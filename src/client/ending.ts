// Финальная сцена: планета оказывается глобусом на детском столе (изометрический пиксель-арт, как вся игра).
// Мир рисует 3D-вывод (src/iso/ending.ts), здесь — камера, затемнение и подписи поверх.

import { clamp, easeInOutCubic } from '../core/math';
import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import type { Sim } from '../sim/sim';
import type { IsoWorld } from '../iso/world';
import { buildEnding, type EndingScene } from '../iso/ending';
import { Camera, ISO_H, ISO_Y } from './camera';

export class Ending {
  t = 0;
  private scene: EndingScene | null = null;
  private cam = new Camera();

  constructor(private sim: Sim, private iso: IsoWorld) {}

  /** Собрать сцену заранее (пока экран затемнён). */
  prepare(_budgetMs: number): void {
    if (!this.scene) this.scene = buildEnding(this.sim.players.map(p => ({ classId: p.classId, idx: p.idx })), this.iso.r.litMat, this.iso.r.glowMat);
  }

  /** 3D-кадр: от планеты во весь экран — к столу целиком. */
  renderWorld(W: number, H: number): void {
    this.prepare(0);
    const sc = this.scene!, t = this.t, cam = this.cam;
    cam.setScreen(W, H);
    sc.globe.rotation.y = t * 0.22;
    const u = easeInOutCubic(clamp((t - 0.6) / 5.4, 0, 1));
    const z0 = (H * 0.62) / sc.radius, z1 = Math.min(W / 760, H / 470);
    cam.zoom = z0 * Math.pow(z1 / z0, u);
    // точка взгляда на земле, в проекции совпадающая с центром глобуса; к концу — чуть ниже, на стол
    const k = (sc.center.y * ISO_H) / (2 * ISO_Y) * (1 - u * 0.75);
    cam.x = sc.center.x - k + 20 * u; cam.y = sc.center.z - k + 40 * u;
    cam.snap();
    this.iso.renderScene(sc.group, cam);
  }

  /** Подписи и затемнение. Возвращает true, когда сцена закончилась. */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number): boolean {
    this.t += dt;
    const t = this.t;
    const f = clamp(1 - t / 0.9, 0, 1);
    if (f > 0) { ctx.globalAlpha = f; ctx.fillStyle = '#07060b'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    const a = clamp((t - 6.3) / 0.8, 0, 1);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(7,6,11,0.55)';
      ctx.fillRect(0, 8, W, 66);
      drawText(ctx, 'ПОБЕДА!', W / 2, 14, { align: 'center', color: UI.gold, scale: 3 });
      drawText(ctx, 'Целый мир оказался игрушечным глобусом на детском столе…', W / 2, 42, { align: 'center', color: UI.text });
      drawText(ctx, '…а ваш танк прошёл путь от игрушки до титана-мегаполиса.', W / 2, 54, { align: 'center', color: UI.dim });
      ctx.globalAlpha = 1;
    }
    this.credits(ctx, W, H, t - 9.5);
    if (t > 12) drawText(ctx, 'ПРОБЕЛ / ENTER / ✕ — ДАЛЕЕ', W / 2, H - 14, { align: 'center', color: UI.faint });
    return t > CREDITS_END;
  }

  /** Титры: выплывают снизу и уходят вверх под надписью «Победа». */
  private credits(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    if (t <= 0) return;
    const top = 84, bot = H - 26;
    const y0 = bot - t * 22;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, W, bot - top); ctx.clip();
    ctx.fillStyle = 'rgba(7,6,11,0.5)';
    ctx.fillRect(Math.round(W / 2 - 150), top, 300, bot - top);
    let y = y0;
    for (const [text, kind] of CREDITS) {
      if (kind === 'gap') { y += 16; continue; }
      const scale = kind === 'title' ? 3 : kind === 'name' ? 2 : 1;
      const color = kind === 'title' ? UI.gold : kind === 'name' ? UI.text : kind === 'role' ? UI.gold : UI.dim;
      if (y > top - 40 && y < bot + 10) drawText(ctx, text, W / 2, Math.round(y), { align: 'center', color, scale });
      y += 10 * scale + 6;
    }
    ctx.restore();
  }
}

/** Титры (пользователь добавит остальных позже). */
const CREDITS: [string, 'title' | 'role' | 'name' | 'text' | 'gap'][] = [
  ['ТАНКОРОСТ', 'title'],
  ['', 'gap'],
  ['ГЕНЕРАЛЬНЫЙ АРТ-ДИЗАЙНЕР', 'role'],
  ['РОМАН ЯНИН', 'name'],
  ['', 'gap'],
  ['', 'gap'],
  ['Спасибо за игру!', 'text'],
  ['От игрушечного полигона — до планет.', 'text'],
];
/** Когда финал заканчивается сам: титры успевают пройти. */
const CREDITS_END = 26;
