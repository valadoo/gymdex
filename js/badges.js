/* ==========================================================================
   GYMDEX — medallas de gimnasio para las fotos de perfil
   72 medallas de las 9 generaciones, dibujadas como SVG (sin imágenes).
   Expone: BADGES, badgeById(), randomBadge(), badgeLabel(), badgeSVG()
   ========================================================================== */
'use strict';

/* Siluetas exteriores, en un lienzo de 100x100 */
const B_SHAPES = {
  oct:    'M31 8H69L92 31V69L69 92H31L8 69V31Z',
  circ:   'M50 6A44 44 0 1 0 50 94A44 44 0 1 0 50 6Z',
  hex:    'M50 5L89 27V73L50 95L11 73V27Z',
  drop:   'M50 5C72 32 88 47 88 62A38 38 0 0 1 12 62C12 47 28 32 50 5Z',
  star:   'M50 4L62 36L96 38L69 59L78 93L50 74L22 93L31 59L4 38L38 36Z',
  shield: 'M50 5L90 18V52C90 74 72 89 50 95C28 89 10 74 10 52V18Z',
  flame:  'M50 3C58 26 82 34 82 58A32 32 0 0 1 18 58C18 44 28 40 32 30C34 45 44 45 44 34C44 24 42 14 50 3Z',
  leaf:   'M90 10C90 58 62 92 14 92C14 44 42 10 90 10Z',
  heart:  'M50 93C9 62 7 37 21 23C33 11 46 15 50 27C54 15 67 11 79 23C93 37 91 62 50 93Z',
  wing:   'M7 59C29 26 59 9 95 9C89 47 58 78 21 86Z',
  gem:    'M50 4L85 31L69 93H31L15 31Z',
  zc:     'M50 3L88 50L50 97L12 50Z',
  snow:   'M50 4L61 20L79 15L74 33L92 38L78 50L92 62L74 67L79 85L61 80L50 96L39 80L21 85L26 67L8 62L22 50L8 38L26 33L21 15L39 20Z',
  cres:   'M64 6A44 44 0 1 0 64 94A36 36 0 1 1 64 6Z',
  hive:   'M50 4L74 18V32L88 40V66L64 80L50 72L36 80L12 66V40L26 32V18Z',
  gear:   'M43 5H57L60 17L71 12L80 21L75 32L87 35V49L75 52L80 63L71 72L60 67L57 79H43L40 67L29 72L20 63L25 52L13 49V35L25 32L20 21L29 12L40 17Z'
};

/* Emblemas interiores */
const B_ACCENTS = {
  dot:    { d: 'M50 34A16 16 0 1 0 50 66A16 16 0 1 0 50 34Z' },
  ring:   { d: 'M50 22A28 28 0 1 0 50 78A28 28 0 1 0 50 22ZM50 36A14 14 0 1 1 50 64A14 14 0 1 1 50 36Z', rule: true },
  bolt:   { d: 'M57 18L28 57H46L41 84L73 43H54Z' },
  wave:   { d: 'M14 52C24 42 32 42 42 52S60 62 70 52S86 42 86 42V62C76 62 70 72 60 62S42 52 32 62S14 72 14 72Z' },
  star:   { d: 'M50 22L57 42L78 43L61 55L67 76L50 64L33 76L39 55L22 43L43 42Z' },
  snow:   { d: 'M46 18H54V44L74 32L78 39L58 51L78 63L74 70L54 58V84H46V58L26 70L22 63L42 51L22 39L26 32L46 44Z' },
  spiral: { d: 'M50 20A30 30 0 1 1 26 68A22 22 0 1 0 66 46A14 14 0 0 0 42 56L34 50A24 24 0 0 1 76 62A32 32 0 1 1 50 20Z' },
  vein:   { d: 'M74 24C56 34 40 52 30 76L36 80C46 58 60 42 78 32ZM48 44C44 52 42 58 40 66C48 62 56 56 62 48Z' },
  fire:   { d: 'M50 26C56 42 70 46 70 60A20 20 0 0 1 30 60C30 52 36 48 39 42C41 52 47 52 47 45C47 38 46 32 50 26Z' },
  drip:   { d: 'M50 28C62 44 70 52 70 60A20 20 0 0 1 30 60C30 52 38 44 50 28Z' },
  moon:   { d: 'M62 20A30 30 0 1 0 62 80A24 24 0 1 1 62 20Z' },
  cells:  { d: 'M50 22L62 29V43L50 50L38 43V29ZM28 46L40 53V67L28 74L16 67V53ZM72 46L84 53V67L72 74L60 67V53Z' }
};

/* id · nombre · región · generación · silueta · emblema · [color base, color emblema] */
const BADGES = [
  // ---- Kanto ----
  { id: 'k1',  n: 'Roca',       r: 'Kanto', g: 1, s: 'oct',    a: 'dot',    c: ['#9aa7b4', '#5d6b7a'] },
  { id: 'k2',  n: 'Cascada',    r: 'Kanto', g: 1, s: 'drop',   a: 'drip',   c: ['#57b6f0', '#1f6fb0'] },
  { id: 'k3',  n: 'Trueno',     r: 'Kanto', g: 1, s: 'circ',   a: 'bolt',   c: ['#f6b93b', '#e05a1c'] },
  { id: 'k4',  n: 'Arcoíris',   r: 'Kanto', g: 1, s: 'star',   a: 'dot',    c: ['#7ec96a', '#e06fa8'] },
  { id: 'k5',  n: 'Alma',       r: 'Kanto', g: 1, s: 'heart',  a: 'dot',    c: ['#f07fb0', '#b03a6e'] },
  { id: 'k6',  n: 'Pantano',    r: 'Kanto', g: 1, s: 'circ',   a: 'ring',   c: ['#e8c25a', '#8a6a1e'] },
  { id: 'k7',  n: 'Volcán',     r: 'Kanto', g: 1, s: 'flame',  a: 'fire',   c: ['#ef6b3a', '#a01f1f'] },
  { id: 'k8',  n: 'Tierra',     r: 'Kanto', g: 1, s: 'leaf',   a: 'vein',   c: ['#6fbf5a', '#2e7a34'] },
  // ---- Johto ----
  { id: 'j1',  n: 'Céfiro',     r: 'Johto', g: 2, s: 'wing',   a: 'star',   c: ['#cdd8e6', '#5d7fae'] },
  { id: 'j2',  n: 'Colmena',    r: 'Johto', g: 2, s: 'hive',   a: 'cells',  c: ['#f0c33c', '#8a5a12'] },
  { id: 'j3',  n: 'Llanura',    r: 'Johto', g: 2, s: 'circ',   a: 'ring',   c: ['#c99a5e', '#7a4d21'] },
  { id: 'j4',  n: 'Niebla',     r: 'Johto', g: 2, s: 'cres',   a: 'dot',    c: ['#a98fd6', '#5b3f96'] },
  { id: 'j5',  n: 'Tormenta',   r: 'Johto', g: 2, s: 'circ',   a: 'spiral', c: ['#f0913c', '#a34a12'] },
  { id: 'j6',  n: 'Mineral',    r: 'Johto', g: 2, s: 'gem',    a: 'dot',    c: ['#9fb4c6', '#4a6480'] },
  { id: 'j7',  n: 'Glaciar',    r: 'Johto', g: 2, s: 'drop',   a: 'snow',   c: ['#7fd4ea', '#2a7fa8'] },
  { id: 'j8',  n: 'Alba',       r: 'Johto', g: 2, s: 'star',   a: 'dot',    c: ['#ef7b4a', '#a8321f'] },
  // ---- Hoenn ----
  { id: 'h1',  n: 'Piedra',     r: 'Hoenn', g: 3, s: 'oct',    a: 'dot',    c: ['#c2a072', '#7a5a2e'] },
  { id: 'h2',  n: 'Puño',       r: 'Hoenn', g: 3, s: 'shield', a: 'dot',    c: ['#ef8a3a', '#9e3f12'] },
  { id: 'h3',  n: 'Dinamo',     r: 'Hoenn', g: 3, s: 'gem',    a: 'bolt',   c: ['#f2d048', '#a8761a'] },
  { id: 'h4',  n: 'Calor',      r: 'Hoenn', g: 3, s: 'flame',  a: 'fire',   c: ['#ee5f4a', '#93201f'] },
  { id: 'h5',  n: 'Equilibrio', r: 'Hoenn', g: 3, s: 'shield', a: 'ring',   c: ['#79c07a', '#2f7a45'] },
  { id: 'h6',  n: 'Pluma',      r: 'Hoenn', g: 3, s: 'wing',   a: 'dot',    c: ['#8fd8e8', '#2f7f9e'] },
  { id: 'h7',  n: 'Mente',      r: 'Hoenn', g: 3, s: 'circ',   a: 'ring',   c: ['#c98ad8', '#6a2f96'] },
  { id: 'h8',  n: 'Lluvia',     r: 'Hoenn', g: 3, s: 'drop',   a: 'wave',   c: ['#5aa8e8', '#1f5f9e'] },
  // ---- Sinnoh ----
  { id: 's1',  n: 'Carbón',     r: 'Sinnoh', g: 4, s: 'oct',   a: 'dot',    c: ['#7d8794', '#3b444f'] },
  { id: 's2',  n: 'Bosque',     r: 'Sinnoh', g: 4, s: 'leaf',  a: 'vein',   c: ['#63bb63', '#256b30'] },
  { id: 's3',  n: 'Adoquín',    r: 'Sinnoh', g: 4, s: 'hex',   a: 'dot',    c: ['#e8913c', '#944a12'] },
  { id: 's4',  n: 'Ciénaga',    r: 'Sinnoh', g: 4, s: 'drop',  a: 'wave',   c: ['#5fbfae', '#1f7a70'] },
  { id: 's5',  n: 'Reliquia',   r: 'Sinnoh', g: 4, s: 'gem',   a: 'star',   c: ['#b389e0', '#5c2f96'] },
  { id: 's6',  n: 'Mina',       r: 'Sinnoh', g: 4, s: 'gear',  a: 'dot',    c: ['#a8b4c0', '#4f5f70'] },
  { id: 's7',  n: 'Carámbano',  r: 'Sinnoh', g: 4, s: 'snow',  a: 'dot',    c: ['#8fdcee', '#2a7fa8'] },
  { id: 's8',  n: 'Faro',       r: 'Sinnoh', g: 4, s: 'star',  a: 'bolt',   c: ['#f2cf4a', '#a3761a'] },
  // ---- Teselia ----
  { id: 'u1',  n: 'Trío',       r: 'Teselia', g: 5, s: 'hive',   a: 'cells',  c: ['#7fc46a', '#2f7a3a'] },
  { id: 'u2',  n: 'Base',       r: 'Teselia', g: 5, s: 'shield', a: 'dot',    c: ['#c9a06a', '#7a5222'] },
  { id: 'u3',  n: 'Insecto',    r: 'Teselia', g: 5, s: 'hive',   a: 'cells',  c: ['#b6d24a', '#5f7a12'] },
  { id: 'u4',  n: 'Rayo',       r: 'Teselia', g: 5, s: 'gem',    a: 'bolt',   c: ['#f2d84a', '#a37a1a'] },
  { id: 'u5',  n: 'Temblor',    r: 'Teselia', g: 5, s: 'hex',    a: 'spiral', c: ['#c98f5a', '#7a4a1e'] },
  { id: 'u6',  n: 'Jet',        r: 'Teselia', g: 5, s: 'wing',   a: 'dot',    c: ['#8fc4ee', '#2f6faa'] },
  { id: 'u7',  n: 'Hielo',      r: 'Teselia', g: 5, s: 'snow',   a: 'dot',    c: ['#a8e4f2', '#3a8fb0'] },
  { id: 'u8',  n: 'Leyenda',    r: 'Teselia', g: 5, s: 'star',   a: 'dot',    c: ['#f0d24a', '#8a6a12'] },
  { id: 'u9',  n: 'Tóxica',     r: 'Teselia', g: 5, s: 'gem',    a: 'dot',    c: ['#b06fd0', '#5f1f8a'] },
  { id: 'u10', n: 'Ola',        r: 'Teselia', g: 5, s: 'drop',   a: 'wave',   c: ['#4fa8e8', '#1a5f9e'] },
  // ---- Kalos ----
  { id: 'x1',  n: 'Bicho',      r: 'Kalos', g: 6, s: 'hive',   a: 'cells',  c: ['#a8c44a', '#5f7a12'] },
  { id: 'x2',  n: 'Acantilado', r: 'Kalos', g: 6, s: 'oct',    a: 'dot',    c: ['#b8945e', '#6f4a1e'] },
  { id: 'x3',  n: 'Lucha',      r: 'Kalos', g: 6, s: 'shield', a: 'dot',    c: ['#e0603a', '#93231f'] },
  { id: 'x4',  n: 'Planta',     r: 'Kalos', g: 6, s: 'leaf',   a: 'vein',   c: ['#6fc46a', '#2f7a3a'] },
  { id: 'x5',  n: 'Voltaje',    r: 'Kalos', g: 6, s: 'circ',   a: 'bolt',   c: ['#f2d048', '#a3761a'] },
  { id: 'x6',  n: 'Hada',       r: 'Kalos', g: 6, s: 'star',   a: 'star',   c: ['#f0a0c8', '#b03a7e'] },
  { id: 'x7',  n: 'Psique',     r: 'Kalos', g: 6, s: 'gem',    a: 'ring',   c: ['#e07fc8', '#8a1f7a'] },
  { id: 'x8',  n: 'Iceberg',    r: 'Kalos', g: 6, s: 'snow',   a: 'dot',    c: ['#9fe0f0', '#2f80a8'] },
  // ---- Alola (Cristales Z de las pruebas insulares) ----
  { id: 'a1',  n: 'Melemele',   r: 'Alola', g: 7, s: 'zc', a: 'dot',  c: ['#f2d048', '#a3761a'] },
  { id: 'a2',  n: 'Akala',      r: 'Alola', g: 7, s: 'zc', a: 'dot',  c: ['#f28fb8', '#a82f6a'] },
  { id: 'a3',  n: 'Ula-Ula',    r: 'Alola', g: 7, s: 'zc', a: 'fire', c: ['#ef6b4a', '#9e2320'] },
  { id: 'a4',  n: 'Poni',       r: 'Alola', g: 7, s: 'zc', a: 'moon', c: ['#a88fe0', '#4f2f96'] },
  // ---- Galar (todas hexagonales, cambia el tipo) ----
  { id: 'g1',  n: 'Hierba',     r: 'Galar', g: 8, s: 'hex', a: 'vein', c: ['#6fc46a', '#2f7a3a'] },
  { id: 'g2',  n: 'Agua',       r: 'Galar', g: 8, s: 'hex', a: 'wave', c: ['#5aa8e8', '#1f5f9e'] },
  { id: 'g3',  n: 'Fuego',      r: 'Galar', g: 8, s: 'hex', a: 'fire', c: ['#ef8a3a', '#9e3f12'] },
  { id: 'g4',  n: 'Lucha',      r: 'Galar', g: 8, s: 'hex', a: 'dot',  c: ['#e05a4a', '#8a2020'] },
  { id: 'g5',  n: 'Fantasma',   r: 'Galar', g: 8, s: 'hex', a: 'moon', c: ['#9a7fd0', '#4a2f8a'] },
  { id: 'g6',  n: 'Hada',       r: 'Galar', g: 8, s: 'hex', a: 'star', c: ['#f0a0c8', '#b03a7e'] },
  { id: 'g7',  n: 'Roca',       r: 'Galar', g: 8, s: 'hex', a: 'dot',  c: ['#c2a072', '#7a5a2e'] },
  { id: 'g8',  n: 'Hielo',      r: 'Galar', g: 8, s: 'hex', a: 'snow', c: ['#9fe0f0', '#2f80a8'] },
  { id: 'g9',  n: 'Siniestro',  r: 'Galar', g: 8, s: 'hex', a: 'moon', c: ['#7a7f94', '#2f3444'] },
  { id: 'g10', n: 'Dragón',     r: 'Galar', g: 8, s: 'hex', a: 'bolt', c: ['#8f8fe0', '#3f3f96'] },
  // ---- Paldea ----
  { id: 'p1',  n: 'Bicho',      r: 'Paldea', g: 9, s: 'circ', a: 'cells', c: ['#a8c44a', '#5f7a12'] },
  { id: 'p2',  n: 'Planta',     r: 'Paldea', g: 9, s: 'circ', a: 'vein',  c: ['#6fc46a', '#2f7a3a'] },
  { id: 'p3',  n: 'Eléctrico',  r: 'Paldea', g: 9, s: 'circ', a: 'bolt',  c: ['#f2d048', '#a3761a'] },
  { id: 'p4',  n: 'Agua',       r: 'Paldea', g: 9, s: 'circ', a: 'wave',  c: ['#5aa8e8', '#1f5f9e'] },
  { id: 'p5',  n: 'Normal',     r: 'Paldea', g: 9, s: 'circ', a: 'ring',  c: ['#d8cdb4', '#8a7f5f'] },
  { id: 'p6',  n: 'Fantasma',   r: 'Paldea', g: 9, s: 'circ', a: 'moon',  c: ['#9a7fd0', '#4a2f8a'] },
  { id: 'p7',  n: 'Psíquico',   r: 'Paldea', g: 9, s: 'circ', a: 'star',  c: ['#f08fc0', '#a82f7a'] },
  { id: 'p8',  n: 'Hielo',      r: 'Paldea', g: 9, s: 'circ', a: 'snow',  c: ['#9fe0f0', '#2f80a8'] }
];

const BADGE_BY_ID = {};
BADGES.forEach(b => { BADGE_BY_ID[b.id] = b; });

function badgeById(id) { return BADGE_BY_ID[id] || BADGES[0]; }
function randomBadge() { return BADGES[Math.floor(Math.random() * BADGES.length)]; }
function badgeLabel(b) { return `Medalla ${b.n} · ${b.r}`; }

let badgeUid = 0;

/* Dibuja la medalla como SVG. size en píxeles. */
function badgeSVG(badge, size) {
  const b = typeof badge === 'string' ? badgeById(badge) : badge;
  const shape = B_SHAPES[b.s] || B_SHAPES.circ;
  const acc = B_ACCENTS[b.a];
  const gid = 'bgr' + (++badgeUid);

  return `<svg class="badge-svg" viewBox="0 0 100 100" width="${size}" height="${size}" ` +
    `role="img" aria-label="${badgeLabel(b)}">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${lighten(b.c[0], 0.3)}"/>` +
    `<stop offset="1" stop-color="${b.c[0]}"/></linearGradient></defs>` +
    `<path d="${shape}" fill="url(#${gid})" stroke="#0b0f1a" stroke-width="5" stroke-linejoin="round"/>` +
    (acc
      ? `<path d="${acc.d}" fill="${b.c[1]}"${acc.rule ? ' fill-rule="evenodd"' : ''} ` +
        'stroke="#0b0f1a" stroke-width="2.5" stroke-linejoin="round"/>'
      : '') +
    '<ellipse cx="36" cy="26" rx="14" ry="8" fill="#ffffff" opacity=".22" ' +
    'transform="rotate(-28 36 26)"/>' +
    '</svg>';
}

function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => Math.round(v + (255 - v) * amount).toString(16).padStart(2, '0'))
    .join('');
}
