// Итоговая стоимость мастерской и открытий (для оценки длины прокачки): npx tsx tools/workshop-cost.ts
import { WORKSHOP, ARSENAL, RESEARCH, GARAGE } from '../src/meta/meta';
let t = 0;
for (const w of WORKSHOP) { const s = w.costs.reduce((a, b) => a + b, 0); t += s; console.log(w.id.padEnd(9), w.costs.join(','), '=', s); }
const u = [...ARSENAL, ...RESEARCH, ...GARAGE].reduce((a, b) => a + b.cost, 0);
console.log('мастерская', t, '· открытия', u, '· всего', t + u);
