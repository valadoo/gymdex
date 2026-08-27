// Descarga los sprites normales y shiny de los 1025 Pokemon.
// Uso: node tools/get-sprites.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'sprites');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const LIMIT = 1025;
const CONC = 24;

async function grab(url, dest, tries = 4) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 200) return 'skip';
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return '404';
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(dest, buf);
      return 'ok';
    } catch (e) {
      if (i === tries - 1) return 'fail';
      await new Promise(res => setTimeout(res, 500 * (i + 1)));
    }
  }
}

(async () => {
  const jobs = [];
  for (let id = 1; id <= LIMIT; id++) {
    jobs.push({ url: `${BASE}/${id}.png`, dest: path.join(ROOT, 'normal', id + '.png'), id });
    jobs.push({ url: `${BASE}/shiny/${id}.png`, dest: path.join(ROOT, 'shiny', id + '.png'), id });
  }
  let done = 0, ok = 0, skip = 0, miss = [];
  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const j = jobs[idx++];
      const r = await grab(j.url, j.dest);
      done++;
      if (r === 'ok') ok++; else if (r === 'skip') skip++; else miss.push(j.url);
      if (done % 200 === 0) process.stdout.write(`  ${done}/${jobs.length} (ok ${ok}, ya estaban ${skip}, fallos ${miss.length})\n`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`FIN: ${done} archivos | descargados ${ok} | ya estaban ${skip} | fallos ${miss.length}`);
  if (miss.length) console.log('Fallos:\n' + miss.slice(0, 30).join('\n'));
  const n = fs.readdirSync(path.join(ROOT, 'normal')).length;
  const s = fs.readdirSync(path.join(ROOT, 'shiny')).length;
  console.log(`normal/: ${n} archivos | shiny/: ${s} archivos`);
})();
