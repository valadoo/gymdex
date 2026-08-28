// Añade el peso de cada Pokémon a data/pokemon.json (campo w, en hectogramos).
// PokeAPI da el peso en hectogramos: w:2350 son 235,0 kg.
// Uso: node tools/add-weights.js
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'pokemon.json');
const CONC = 16;

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(res => setTimeout(res, 600 * (i + 1)));
    }
  }
}

(async () => {
  const dex = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(dex.length + ' Pokémon. Descargando pesos...');

  const pendientes = dex.filter(p => p.w === undefined);
  if (!pendientes.length) { console.log('Ya tienen peso todos. Nada que hacer.'); return; }

  let idx = 0, hechos = 0;
  const fallos = [];
  async function worker() {
    while (idx < pendientes.length) {
      const p = pendientes[idx++];
      try {
        const d = await getJSON(`https://pokeapi.co/api/v2/pokemon/${p.i}/`);
        p.w = d.weight;                       // hectogramos
      } catch (e) {
        fallos.push(p.i);
      }
      hechos++;
      if (hechos % 100 === 0) process.stdout.write(`  ${hechos}/${pendientes.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  const sinPeso = dex.filter(p => p.w === undefined);
  if (sinPeso.length) {
    console.log('AVISO: sin peso ' + sinPeso.length + ' -> ' + sinPeso.map(p => p.i).join(', '));
  }

  fs.writeFileSync(FILE, JSON.stringify(dex));
  const kb = (fs.statSync(FILE).size / 1024).toFixed(0);
  console.log(`OK. ${dex.length - sinPeso.length} con peso. Fichero: ${kb} KB`);

  const conPeso = dex.filter(p => p.w !== undefined).sort((a, b) => a.w - b.w);
  console.log('Mas ligero: ' + conPeso[0].n + ' ' + (conPeso[0].w / 10) + ' kg');
  console.log('Mas pesado: ' + conPeso[conPeso.length - 1].n + ' ' +
    (conPeso[conPeso.length - 1].w / 10) + ' kg');
  const cerca = conPeso.filter(p => Math.abs(p.w / 10 - 80) < 3);
  console.log('Cerca de 80 kg: ' + cerca.length + ' -> ' +
    cerca.slice(0, 8).map(p => `${p.n} ${(p.w / 10)}kg`).join(', '));
})();
