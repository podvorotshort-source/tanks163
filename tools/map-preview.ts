// Схема препятствий ступени сверху (PNG): npx tsx tools/map-preview.ts [ступень]
// Кирпич — рыжий, сталь — серая, кусты — зелёные, вода — синяя, прочее — бежевое, старт — белый круг.
import { Sheet } from './png';
import { STAGE_DEFS } from '../src/sim/content/stages';
import { Rng } from '../src/core/rng';

const n = Number(process.argv[2] ?? 0);
const st = STAGE_DEFS[n];
const k = 0.5;
const sh = new Sheet(Math.ceil(st.w * k), Math.ceil(st.h * k), 0xff1d2a24);
const COL: Record<string, number> = { brick: 0xff2f5fc9, steel: 0xffa09890, bush: 0xff2f9a3a, water: 0xffc06a2a };
const props = st.props(new Rng(1234), st);
for (const p of props) sh.fill(Math.round((p.x - p.w / 2) * k), Math.round((p.y - p.h / 2) * k), Math.max(1, Math.round(p.w * k)), Math.max(1, Math.round(p.h * k)), COL[p.mat] ?? 0xff8fb7d6);
const cx = st.w / 2 * k, cy = st.h / 2 * k;
for (let a = 0; a < 64; a++) sh.fill(Math.round(cx + Math.cos(a / 10) * 14), Math.round(cy + Math.sin(a / 10) * 14), 2, 2, 0xffffffff);
const cnt: Record<string, number> = {};
for (const p of props) cnt[p.mat] = (cnt[p.mat] ?? 0) + p.w * p.h;
sh.save(`tools/out/map-${n}.png`);
console.log(`tools/out/map-${n}.png`, Object.entries(cnt).map(([m, a]) => `${m} ${Math.round(a / 100)}`).join(', '), `· препятствий ${props.length}`);
