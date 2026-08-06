// Verifica la sintaxis de todos los .js de public/js con `node --check`.
// Uso: npm run check
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../public/js', import.meta.url).pathname;
let files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) files.push(p);
  }
})(root);

let ok = 0, fail = 0;
for (const f of files) {
  try { execFileSync('node', ['--check', f]); ok++; }
  catch (e) { fail++; console.error('✗', f, '\n', e.stderr?.toString() || e.message); }
}
console.log(`\n${ok} archivos OK, ${fail} con errores.`);
process.exit(fail ? 1 : 0);
