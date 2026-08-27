// Construye data/pokemon.json a partir de PokeAPI.
// Uso: node tools/build-data.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'pokemon.json');
const LIMIT = 1025;
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

async function pool(items, fn, conc = CONC, label = '') {
  const out = new Array(items.length);
  let idx = 0, done = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
      done++;
      if (done % 50 === 0) process.stdout.write(`  ${label} ${done}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  return out;
}

(async () => {
  console.log('1/4 Lista de especies...');
  const list = await getJSON(`https://pokeapi.co/api/v2/pokemon-species?limit=${LIMIT}`);
  const urls = list.results.map(r => r.url);
  console.log('   ' + urls.length + ' especies');

  console.log('2/4 Datos de cada especie...');
  const species = await pool(urls, async (u) => {
    const s = await getJSON(u);
    const es = (s.names || []).find(n => n.language.name === 'es');
    const genus = (s.genera || []).find(g => g.language.name === 'es')
               || (s.genera || []).find(g => g.language.name === 'en');
    return {
      id: s.id,
      name: es ? es.name : s.name.charAt(0).toUpperCase() + s.name.slice(1),
      slug: s.name,
      genus: genus ? genus.genus : '',
      gen: romanToInt((s.generation?.name || 'generation-i').replace('generation-','')),
      legendary: !!s.is_legendary,
      mythical: !!s.is_mythical,
      baby: !!s.is_baby,
      capture: s.capture_rate,
      chain: s.evolution_chain ? parseInt(s.evolution_chain.url.match(/\/(\d+)\/?$/)[1], 10) : null,
      from: s.evolves_from_species ? s.evolves_from_species.name : null,
      color: s.color?.name || 'gray'
    };
  }, CONC, 'especies');

  const bySlug = {};
  species.forEach(s => { bySlug[s.slug] = s; });

  console.log('3/4 Cadenas evolutivas...');
  const chainIds = [...new Set(species.map(s => s.chain).filter(Boolean))];
  const chains = await pool(chainIds, id => getJSON(`https://pokeapi.co/api/v2/evolution-chain/${id}/`), CONC, 'cadenas');

  const evo = {}; // slug -> { stage, to:[slugs], cond:{} }
  for (const c of chains) {
    if (!c || !c.chain) continue;
    (function walk(node, stage) {
      const slug = node.species.name;
      const kids = (node.evolves_to || []).map(k => k.species.name);
      evo[slug] = { stage, to: kids };
      (node.evolves_to || []).forEach(k => {
        const d = (k.evolution_details || [])[0] || {};
        const child = k.species.name;
        evo[child] = evo[child] || {};
        evo[child].how = d.trigger?.name || 'level-up';
        evo[child].item = d.item?.name || d.held_item?.name || null;
        walk(k, stage + 1);
      });
    })(c.chain, 0);
  }

  console.log('4/4 Escribiendo JSON...');
  const dex = species.sort((a, b) => a.id - b.id).map(s => {
    const e = evo[s.slug] || { stage: 0, to: [] };
    const to = (e.to || []).map(sl => bySlug[sl]?.id).filter(Boolean);
    let rarity;
    if (s.mythical) rarity = 5;
    else if (s.legendary) rarity = 4;
    else if (s.capture <= 45) rarity = 3;
    else if (s.capture <= 90) rarity = 2;
    else if (s.capture <= 150) rarity = 1;
    else rarity = 0;
    return {
      i: s.id,
      n: s.name,
      g: s.genus,
      gen: s.gen,
      st: e.stage || 0,
      to,
      r: rarity,
      c: s.color
    };
  });

  fs.writeFileSync(OUT, JSON.stringify(dex));
  console.log('OK -> ' + OUT + '  (' + dex.length + ' pokemon, ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
  const bases = dex.filter(p => p.st === 0).length;
  console.log('Formas base (capturables): ' + bases + ' | evolucionables: ' + (dex.length - bases));
})();

function romanToInt(r) {
  const m = { i: 1, v: 5, x: 10 };
  r = r.toLowerCase(); let t = 0;
  for (let i = 0; i < r.length; i++) {
    const c = m[r[i]], n = m[r[i + 1]];
    t += (n && c < n) ? -c : c;
  }
  return t;
}
