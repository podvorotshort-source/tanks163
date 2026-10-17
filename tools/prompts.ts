// Раскладывает готовые промты из docs/ART_PROMPTS.md по файлам art/prompts/<имя картинки>.txt
// (открыл файл → Ctrl+A → Ctrl+C → вставил в ChatGPT) и сверяет число объектов с tools/sheets.ts.
//   npx tsx tools/prompts.ts
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { SHEETS } from './sheets';

const md = readFileSync('docs/ART_PROMPTS.md', 'utf8').replace(/\r\n/g, '\n');
const re = /### `([^`]+)\.png`[^\n]*\n+```\n([\s\S]*?)\n```/g;
mkdirSync('art/prompts', { recursive: true });
for (const f of readdirSync('art/prompts')) if (f.endsWith('.txt')) unlinkSync('art/prompts/' + f);
let n = 0, bad = 0;
for (const m of md.matchAll(re)) {
  const [, name, text] = m;
  writeFileSync(`art/prompts/${name}.txt`, text.trim() + '\n', 'utf8');
  n++;
  const sheet = SHEETS[name];
  if (!sheet) { console.log(`⚠ ${name}: нет раскладки в tools/sheets.ts`); bad++; continue; }
  // Сверка: «Что нарисовать: N …» в промте = число ключей в раскладке нарезки.
  const declared = Number(/Что нарисовать: (\d+)/.exec(text)?.[1] ?? 0);
  if (declared && declared !== sheet.keys.length) { console.log(`⚠ ${name}: в промте ${declared} объектов, в раскладке ${sheet.keys.length}`); bad++; }
}
const missing = Object.keys(SHEETS).filter(k => !md.includes('`' + k + '.png`'));
for (const k of missing) { console.log(`⚠ нет промта для ${k}`); bad++; }
console.log(`промтов: ${n} → art/prompts/*.txt${bad ? `, предупреждений: ${bad}` : ', всё сходится с раскладкой'}`);
