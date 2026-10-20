// Предметы игрока и «правда» о I ступени: противотанковая мина-игрушка, ЛЕГО-кирпичики (во что превращаются
// кирпичные и стальные блоки, когда мир отъезжает) и пластмассовое деревце (бывший куст).
// Плотность как везде: 1 воксель ≈ 1 пиксель кадра при обычном размере.
import { Vox, type ModelDef } from '../vox';

/** Мина: тёмно-стальной диск с рифлёным краем, полосатый пояс цвета хозяина (1P жёлтый, 2P зелёный),
 *  нажимная крышка с крестом и колпачок-огонёк сверху (lit — горит). */
export function mine(owner: number, lit: boolean): ModelDef {
  const n = 24, c = 12, v = new Vox(n, 8, n);
  const stripe = owner ? 'green_l' : 'yel';
  v.cylY(c, c, 11, 0, 1, 'gun_d', 11.5);
  v.cylY(c, c, 11.5, 1, 4, 'gun');
  // пояс: косые полосы по окружности (хозяин / чёрный)
  v.paint((x, y, z) => {
    if (y < 1.5 || y > 3.5) return undefined;
    const a = Math.atan2(z - c, x - c), s = Math.floor((a * 11.5 + y * 1.4) / 3.2);
    return s % 2 ? stripe : 'black';
  }, 0, n, 0, 8, 0, n);
  v.paint((x, y) => (y > 3 ? 'gun_l' : undefined), 0, n, 3, 4, 0, n);
  // верх: кольцо с рёбрами
  v.cylY(c, c, 10.4, 4, 5, 'gun');
  v.paint((x, y, z) => {
    const r2 = (x - c) ** 2 + (z - c) ** 2;
    if (r2 < 8 * 8) return undefined;
    return Math.floor((Math.atan2(z - c, x - c) + Math.PI) / (Math.PI / 10)) % 2 ? 'gun_d' : 'gun_l';
  }, 0, n, 4, 5, 0, n);
  // нажимная крышка с крестом
  v.cylY(c, c, 6.6, 5, 6, 'steel');
  v.paint((x, y, z) => (Math.abs(x - c) < 0.6 || Math.abs(z - c) < 0.6 ? 'steel_d' : (x - c) ** 2 + (z - c) ** 2 > 5.6 ** 2 ? 'steel_l' : undefined), 0, n, 5, 6, 0, n);
  // колпачок и огонёк
  v.cylY(c, c, 2.4, 6, 7, 'steel_l');
  v.box(c - 1, c + 1, 7, 8, c - 1, c + 1, lit ? 'glow_r' : 'red_d');
  return { size: n, parts: [{ name: 'body', vox: v }], foot: [n, n] };
}

/** ЛЕГО-кирпичик 2×(2·len): v = len·10 + цвет (0 — оранжевый, 1 — серый). Блок стены I ступени
 *  (45 ед.) после роста вчетверо — 11,25 ед. = 12 вокселей = два шипа. Высота кирпичика как у стены. */
export function lego(v: number): ModelDef {
  const len = Math.max(1, Math.floor(v / 10)), grey = v % 10 === 1;
  const [base, light, dark] = grey ? ['lego_g', 'lego_gl', 'lego_gd'] : ['lego_o', 'lego_ol', 'lego_od'];
  const L = len * 12, W = 12, H = 7, b = new Vox(L, H + 2, W);
  b.box(0, L, 0, H, 0, W, base);
  b.paint(() => dark, 0, L, 0, 1, 0, W);                                            // тёмная кромка у пола
  b.paint((x, y, z) => (x < 1 || z < 1 ? light : undefined), 0, L, H - 1, H, 0, W);   // светлая фаска крыши
  for (let i = 0; i < len * 2; i++) for (let j = 0; j < 2; j++) {
    const cx = i * 6 + 3, cz = j * 6 + 3;
    b.cylY(cx, cz, 1.8, H, H + 2, base);
    b.paint(() => light, cx - 2, cx + 2, H + 1, H + 2, cz - 2, cz + 2);            // светлая шляпка шипа
    b.set(cx - 2, H + 1, cz - 1, 'shine');                                          // блик пластика
  }
  return { size: L, parts: [{ name: 'body', vox: b }], foot: [L, W] };
}

/** Пластмассовое деревце на подставке (бывший куст I ступени). */
export function toyTree(v: number): ModelDef {
  const n = 18, c = 9, b = new Vox(n, 20, n);
  b.cylY(c, c, 6, 0, 1, 'green_d', 5.4);
  b.cylY(c, c, 1.6, 1, 9, 'wood_d');
  const r = 6.4 + (v % 3) * 0.4;
  b.sphere(c, 12.5, c, r, 'toy_g');
  b.paint((x, y, z) => (y < 10 ? 'green_d' : (x - c + 2) ** 2 + (y - 15) ** 2 + (z - c + 2) ** 2 < 6 ? 'grass_ll' : undefined), 0, n, 0, 20, 0, n);
  b.set(c - 3, 16, c - 2, 'shine');
  return { size: n, parts: [{ name: 'body', vox: b }], foot: [n, n] };
}
