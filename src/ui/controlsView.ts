// Экран-подсказка с управлением (меню и пауза).

import { drawText } from '../gfx/font';
import { UI } from '../gfx/palette';
import { input } from '../input/input';

export function drawControls(ctx: CanvasRenderingContext2D, W: number, H: number, y0 = 40): void {
  const colW = Math.min(200, Math.floor((W - 30) / 3));
  const x0 = Math.round(W / 2 - (colW * 3 + 20) / 2);
  const cols: { title: string; col: string; rows: [string, string][] }[] = [
    { title: '1P КЛАВИАТУРА', col: UI.p1, rows: [['Движение', 'W A S D'], ['Способность 1', 'ПРОБЕЛ'], ['Способность 2', 'E'], ['Способность 3', 'Q'], ['Пауза', 'ESC / P']] },
    { title: '2P КЛАВИАТУРА', col: UI.p2, rows: [['Движение', 'СТРЕЛКИ'], ['Способность 1', 'NUM0 / ENTER'], ['Способность 2', 'NUM1 / /'], ['Способность 3', 'NUM2 / .'], ['Пауза', 'ESC / P']] },
    { title: 'ГЕЙМПАД', col: UI.blue, rows: [['Движение', 'СТИК / КРЕСТ.'], ['Способность 1', '✕ / R2'], ['Способность 2', '□ / R1'], ['Способность 3', '○ / L1 L2'], ['Пауза', 'OPTIONS']] },
  ];
  cols.forEach((c, i) => {
    const x = x0 + i * (colW + 10);
    ctx.fillStyle = 'rgba(21,19,32,0.9)';
    ctx.fillRect(x, y0, colW, 92);
    drawText(ctx, c.title, x + colW / 2, y0 + 5, { align: 'center', color: c.col });
    c.rows.forEach(([a, b], j) => {
      drawText(ctx, a, x + 6, y0 + 20 + j * 13, { color: UI.dim });
      drawText(ctx, b, x + colW - 6, y0 + 20 + j * 13, { color: UI.text, align: 'right' });
    });
  });
  const y = y0 + 102;
  const lines = [
    'Всё оружие наводится и стреляет само — ваша задача ездить, уклоняться и вовремя жать способности.',
    'Опыт команды общий: когда шкала заполнится — оба игрока выбирают СВОЁ улучшение.',
    'Подбитого напарника спасают, постояв рядом с ним 3 секунды. Это не тратит жизнь.',
    'Бонусы (звезда, часы, каска, граната, лопата, танк) действуют на всю команду.',
    'Мелкие враги и препятствия, которых вы переросли, можно просто давить гусеницами.',
    'В меню улучшений: способность 1 — взять, 2 — перебросить, 3 — исключить карту.',
  ];
  lines.forEach((l, i) => drawText(ctx, '• ' + l, Math.round(W / 2), y + i * 11, { align: 'center', color: UI.text }));
  const pads = input.connectedPads();
  const pt = pads.length ? 'Геймпады: ' + pads.map(p => `${p.name}${input.solo ? '' : input.padOf[0] === p.index ? ' → 1P' : input.padOf[1] === p.index ? ' → 2P' : ' (нажмите кнопку)'}`).join(', ') : 'Геймпады не подключены — нажмите любую кнопку на геймпаде';
  drawText(ctx, pt, Math.round(W / 2), y + lines.length * 11 + 8, { align: 'center', color: UI.dim });
  void H;
}
