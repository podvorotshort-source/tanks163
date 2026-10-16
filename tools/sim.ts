// Балансный прогон без графики: npx tsx tools/sim.ts --runs 3 --classes assault,heavy --skill 0.7 --max 4200
import { Sim, type RunConfig } from '../src/sim/sim';
import { botCommand, botChoose } from '../src/sim/bot';
import type { ClassId } from '../src/sim/types';
import { WEAPONS } from '../src/sim/content/weapons';

const args = process.argv.slice(2);
const get = (k: string, d: string) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const runs = Number(get('runs', '1'));
const classes = get('classes', 'assault').split(',') as ClassId[];
const skill = Number(get('skill', '0.7'));
const maxSec = Number(get('max', '4200'));
const seed0 = Number(get('seed', '1'));
const verbose = args.includes('-v');
const startStage = Number(get('stage', '0'));

interface Result { seed: number; stage: number; time: number; level: number; kills: number; win: boolean; deaths: number; stages: string[]; build: string[] }
const results: Result[] = [];

for (let r = 0; r < runs; r++) {
  const seed = seed0 + r;
  const cfg: RunConfig = { seed, players: classes.map(c => ({ cls: c })), startStage };
  const sim = new Sim(cfg);
  sim.dmgLog = new Map();
  const t0 = Date.now();
  let deaths = 0;
  const stageLog: string[] = [];
  let lastStage = sim.stageIdx;
  let stageStart = 0;
  let bossSpawnT = -1;
  const ticks = maxSec * 60;
  for (let i = 0; i < ticks; i++) {
    if (sim.state === 'levelup') botChoose(sim, { skill });
    const cmds = sim.players.map(p => botCommand(sim, p, { skill }));
    sim.step(cmds);
    for (const e of sim.events) {
      if (e.t === 'down' || e.t === 'lifeLost') deaths += e.t === 'lifeLost' ? 1 : 0;
      if (e.t === 'bossSpawn') bossSpawnT = sim.time;
      if (verbose && (e.t === 'bossSpawn' || e.t === 'bossDead' || e.t === 'lifeLost' || e.t === 'out' || e.t === 'event')) console.log(`  [${sim.time.toFixed(0)}s st${sim.stageIdx}] ${e.t} ${'text' in e ? e.text : ''}${'name' in e ? e.name : ''}`);
    }
    if (sim.stageIdx !== lastStage) {
      stageLog.push(`S${lastStage + 1}: ${(sim.time - stageStart).toFixed(0)}s (boss ${bossSpawnT > 0 ? (sim.time - bossSpawnT - 3).toFixed(0) : '?'}s) lvl ${sim.level}`);
      lastStage = sim.stageIdx; stageStart = sim.time; bossSpawnT = -1;
    }
    if (sim.state === 'gameover' || sim.state === 'victory') break;
  }
  const res: Result = {
    seed, stage: sim.stageIdx + 1, time: Math.round(sim.time), level: sim.level, kills: sim.kills, win: sim.state === 'victory', deaths,
    stages: stageLog,
    build: sim.players.map(p => `${p.classId}: ` + p.weapons.map(w => `${WEAPONS[w.id].name.split(' ')[0]} ${w.level}`).join(', ') + ' | ' + [...p.mods].join(',')),
  };
  results.push(res);
  console.log(`run ${r} seed ${seed}: ${res.win ? 'ПОБЕДА' : sim.state === 'gameover' ? 'поражение' : 'лимит времени'} ступень ${res.stage}, ${res.time}s, ур ${res.level}, убийств ${res.kills}, потерь жизней ${deaths}, ${(Date.now() - t0) / 1000}s CPU`);
  for (const s of stageLog) console.log('   ', s);
  for (const b of res.build) console.log('   ', b);
  console.log('    урон по источникам (в макс. прочностях):', [...sim.dmgLog!.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', '));
}
