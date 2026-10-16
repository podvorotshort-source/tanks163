// Подробный журнал забега по времени: npx tsx tools/analyze.ts [класс] [сид]
import { Sim } from '../src/sim/sim';
import { botCommand, botChoose } from '../src/sim/bot';
import type { ClassId } from '../src/sim/types';
const cls = (process.argv[2] ?? 'assault') as ClassId;
const sim = new Sim({ seed: Number(process.argv[3] ?? 90), players: [{ cls }] });
sim.dmgLog = new Map();
let hits = 0, lastDmg = new Map<string, number>();
for (let i = 0; i < 60 * 420; i++) {
  if (sim.state === 'levelup') botChoose(sim, { skill: 0.8 });
  sim.step(sim.players.map(p => botCommand(sim, p, { skill: 0.8 })));
  for (const e of sim.events) if (e.t === 'hurt') hits++;
  if (i % (60 * 30) === 0) {
    const by: Record<string, number> = {};
    for (const e of sim.enemies) by[e.def.behavior] = (by[e.def.behavior] ?? 0) + 1;
    const p = sim.players[0];
    const d = [...sim.dmgLog!.entries()].map(([k, v]) => [k, v - (lastDmg.get(k) ?? 0)] as [string, number]).filter(([, v]) => v > 0.05).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' ');
    lastDmg = new Map(sim.dmgLog!);
    console.log(`t=${sim.stageTime.toFixed(0)} ур=${sim.level} размер=${sim.size.toFixed(0)} hp=${(p.hp / p.maxHp * 100).toFixed(0)}% жизни=${p.lives} ${p.state} врагов=${sim.enemies.length} ${JSON.stringify(by)} попаданий=${hits} | ${d}`);
    console.log('   оружие:', p.weapons.map(w => `${w.id}${w.level}:dps${(w.dmgDealt / Math.max(1, sim.time) / sim.tankPower()).toFixed(1)}`).join(' '));
    hits = 0;
  }
  if (sim.state === 'gameover') { console.log('gameover', sim.time.toFixed(0)); break; }
}
