// .glb → glTF-JSON со встроенным буфером (*.json) — для страниц-артефактов, которые не отдают .glb.
// node .claude/skills/lowpoly-3d/scripts/glb2json.mjs <папка или файлы .glb...> [--out <папка>] [--rm]
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? args.splice(oi, 2)[1] : null;
const rm = args.includes('--rm');
const files = args.filter(a => a !== '--rm').flatMap(a => statSync(a).isDirectory()
  ? readdirSync(a).filter(f => f.endsWith('.glb')).map(f => join(a, f)) : [a]);
for (const f of files) {
  const b = readFileSync(f);
  let o = 12, json = null, bin = null;
  while (o < b.length) {
    const len = b.readUInt32LE(o), type = b.readUInt32LE(o + 4), d = b.subarray(o + 8, o + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(d.toString('utf8')); else if (type === 0x004E4942) bin = d;
    o += 8 + len;
  }
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + bin.toString('base64');
  const dir = out || dirname(f);
  mkdirSync(dir, { recursive: true });
  const dst = join(dir, basename(f, '.glb') + '.json');
  writeFileSync(dst, JSON.stringify(json));
  if (rm) unlinkSync(f);
  console.log(dst);
}
