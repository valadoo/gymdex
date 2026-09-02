/* ==========================================================================
   GYMDEX — objetivos diarios con temática Pokémon
   Datos: data/pokemon.json  ·  Guardado: localStorage["gymdex_v1"]
   ========================================================================== */
'use strict';

/* ---------------------------- CONFIGURACIÓN ---------------------------- */

const TASKS = [
  { n: 'Entreno de fuerza',     ic: '💪', ty: 'Lucha',    c: '#f08030' },
  { n: 'Entreno de carrera',    ic: '🏃', ty: 'Volador',  c: '#8fb8f2' },
  { n: 'Entreno de natación',   ic: '🏊', ty: 'Agua',     c: '#4a90e2' },
  { n: 'Comer bien',            ic: '🥗', ty: 'Planta',   c: '#5ec46b' },
  { n: 'Tomar suplementación',  ic: '💊', ty: 'Veneno',   c: '#b45ac4' },
  { n: 'Dormir +7 horas',       ic: '😴', ty: 'Psíquico', c: '#f06fa0' },
  { n: '+10.000 pasos',         ic: '👟', ty: 'Tierra',   c: '#c9a06a' }
];

const RANKS = [
  { k: 'none',       n: 'SIN RANGO',   c: '#39456b' },
  { k: 'pokeball',   n: 'POKÉ BALL',   c: '#ee4b4b' },
  { k: 'superball',  n: 'SUPER BALL',  c: '#3f7ee8' },
  { k: 'ultraball',  n: 'ULTRA BALL',  c: '#f2c53d' },
  { k: 'masterball', n: 'MASTER BALL', c: '#9b5cf6' }
];

/* Probabilidad de rareza (0 común … 5 mítico) según la ball del día */
const WEIGHTS = {
  1: [72, 20,  6,  2,  0, 0],
  2: [45, 25, 18, 12,  0, 0],
  3: [20, 22, 22, 32,  4, 0],
  4: [ 5, 10, 18, 45, 18, 4]
};
/* 1 entre N de que salga shiny */
const SHINY_ODDS = { 1: 350, 2: 220, 3: 130, 4: 60 };
/* Caramelos que da un repetido, según su rareza */
const DUPE_CANDY = [3, 5, 8, 12, 30, 50];
const RARITY_NAME = ['Común', 'Poco común', 'Rara', 'Muy rara', 'Legendario', 'Mítico'];

const K_ACCOUNTS = 'gymdex_accounts';
const K_SESSION = 'gymdex_session';
const K_SAVE = 'gymdex_save_';     // + id de cuenta
const K_LEGACY = 'gymdex_v1';      // guardado anterior a las cuentas
const PAGE = 120;

/* ------------------------------- ESTADO -------------------------------- */

let DEX = [];                        // array crudo del JSON
const BY_ID = {};                    // id -> pokemon
const POOL = [[], [], [], [], [], []]; // formas base agrupadas por rareza
let S = null;                        // estado guardado

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function blankState() {
  return {
    v: 1, days: {}, box: [], dex: {}, candy: 0, uid: 1, monstersTotal: 0,
    weights: [],      // [{ d:'2026-08-27', kg:78.5 }] una entrada por día
    nextWeigh: 0      // marca de tiempo del próximo aviso de pesarse
  };
}

/* ------------------------------ CUENTAS -------------------------------- */

let ACCOUNTS = [];
let ME = null;

function loadAccounts() {
  try { ACCOUNTS = JSON.parse(localStorage.getItem(K_ACCOUNTS)) || []; }
  catch (e) { ACCOUNTS = []; }
  if (!Array.isArray(ACCOUNTS)) ACCOUNTS = [];

  // si había una partida anterior a las cuentas, se convierte en la primera cuenta
  const viejo = localStorage.getItem(K_LEGACY);
  if (viejo && !ACCOUNTS.length) {
    const acc = createAccount('Entrenador', randomBadge().id, null);
    localStorage.setItem(K_SAVE + acc.id, viejo);
    localStorage.removeItem(K_LEGACY);
    localStorage.setItem(K_SESSION, acc.id);
  }
}

function saveAccounts() {
  try { localStorage.setItem(K_ACCOUNTS, JSON.stringify(ACCOUNTS)); }
  catch (e) { toast('No se pudo guardar la cuenta'); }
}

function createAccount(name, badgeId, pinHash) {
  const acc = {
    id: 'ac_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    badge: badgeId,
    pin: pinHash || null,
    created: todayKey()
  };
  ACCOUNTS.push(acc);
  saveAccounts();
  return acc;
}

function accountSummary(id) {
  try {
    const d = JSON.parse(localStorage.getItem(K_SAVE + id));
    if (!d) return 'Cuenta nueva';
    const dex = Object.keys(d.dex || {}).length;
    const dias = Object.values(d.days || {})
      .filter(x => (x.t || []).some(Boolean)).length;
    if (!dex && !dias) return 'Cuenta nueva';
    const td = `${dias} día${dias === 1 ? '' : 's'} entrenando`;
    return dex ? `${dex} en la Pokédex · ${td}` : td;
  } catch (e) { return 'Cuenta nueva'; }
}

/* El PIN es un cierre local, no una contraseña de verdad: protege de miradas,
   no de alguien con acceso al navegador. */
async function hashPin(pin) {
  if (!pin) return null;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gymdex:' + pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'p:' + pin;
  }
}

/* --------------------------- GUARDADO DE PARTIDA ----------------------- */

function saveKey() { return K_SAVE + (ME ? ME.id : 'nadie'); }

function load() {
  try {
    const raw = localStorage.getItem(saveKey());
    S = raw ? JSON.parse(raw) : blankState();
  } catch (e) {
    S = blankState();
  }
  const def = blankState();
  for (const k in def) if (S[k] === undefined) S[k] = def[k];
}

let saveTimer = null;

function writeSave() {
  saveTimer = null;
  try { localStorage.setItem(saveKey(), JSON.stringify(S)); }
  catch (e) { toast('No se pudo guardar: almacenamiento lleno'); }
}

function save() {
  if (!ME) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeSave, 120);
}

/* Si el móvil se bloquea o se cierra la pestaña justo después de marcar algo,
   el guardado retrasado no llegaría a ejecutarse: se fuerza aquí. */
function flushSave() {
  if (!ME || saveTimer === null) return;
  clearTimeout(saveTimer);
  writeSave();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});
window.addEventListener('pagehide', flushSave);

/* ------------------------------- FECHAS -------------------------------- */

const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dkey(new Date());
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function longDate(k) {
  const d = parseKey(k);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/* -------------------------------- DÍAS --------------------------------- */

function day(k) {
  if (!S.days[k]) S.days[k] = { t: [0, 0, 0, 0, 0, 0, 0], m: 0, cl: 0 };
  const d = S.days[k];
  // días guardados antes de añadir un objetivo nuevo vienen con menos casillas
  while (d.t.length < TASKS.length) d.t.push(0);
  return d;
}
function peek(k) { return S.days[k] || null; }
function doneCount(k) { const d = peek(k); return d ? d.t.reduce((a, b) => a + b, 0) : 0; }
/* 1-2 Poké · 3-4 Super · 5 Ultra · 6-7 Master */
const RANK_MIN = [0, 1, 3, 5, 6];
function rankOf(n) {
  for (let r = 4; r >= 1; r--) if (n >= RANK_MIN[r]) return r;
  return 0;
}

function streak() {
  let n = 0;
  const d = new Date();
  if (doneCount(todayKey()) === 0) d.setDate(d.getDate() - 1);
  while (doneCount(dkey(d)) > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function candyFor(count, strk) {
  const mult = strk >= 30 ? 2 : strk >= 7 ? 1.5 : 1;
  let c = Math.round(count * 5 * mult);
  if (rankOf(count) === 4) c += 10;   // bonus solo en día Master Ball
  return c;
}

function pendingDays() {
  const t = todayKey();
  return Object.keys(S.days)
    .filter(k => k < t && !S.days[k].cl && doneCount(k) > 0)
    .sort();
}

/* -------------------------------- BALLS -------------------------------- */

function ballInner(kind) {
  if (kind === 'ultraball') return '<i class="stripe"></i><i class="btn"></i>';
  if (kind === 'masterball') return '<i class="m">M</i><i class="p1"></i><i class="p2"></i><i class="btn"></i>';
  if (kind === 'none') return '';
  return '<i class="btn"></i>';
}
function ballHTML(kind, cls) {
  return `<div class="ball ${kind} ${cls || ''}">${ballInner(kind)}</div>`;
}
function paintBall(el, kind, extra) {
  el.className = 'ball ' + kind + (extra ? ' ' + extra : '');
  el.innerHTML = ballInner(kind);
}

/* ------------------------------- SPRITES ------------------------------- */

const sprite = (id, shiny) => `sprites/${shiny ? 'shiny' : 'normal'}/${id}.png`;

/* ------------------------------- CAPTURA ------------------------------- */

function rollEncounter(rank) {
  const w = WEIGHTS[rank];
  let total = 0;
  for (let r = 0; r < 6; r++) if (POOL[r].length) total += w[r];
  let pick = Math.random() * total;
  let rar = -1;
  for (let r = 0; r < 6; r++) {
    if (!POOL[r].length || !w[r]) continue;
    pick -= w[r];
    if (pick <= 0) { rar = r; break; }
  }
  if (rar < 0) rar = POOL.findIndex(p => p.length);
  const id = POOL[rar][Math.floor(Math.random() * POOL[rar].length)];
  const shiny = Math.random() < 1 / SHINY_ODDS[rank] ? 1 : 0;
  return { id, shiny };
}

function registerDex(id, shiny) {
  const e = S.dex[id] || { c: 0, s: 0 };
  const wasNew = shiny ? !e.s : !e.c;
  if (shiny) e.s = 1; else e.c = 1;
  S.dex[id] = e;
  return wasNew;
}

function dexCount() { return Object.keys(S.dex).length; }
function shinyCount() { return Object.values(S.dex).filter(e => e.s).length; }

/* -------------------------------- AVISOS ------------------------------- */

function toast(msg, cls) {
  const el = document.createElement('div');
  el.className = 'toast ' + (cls || '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function buzz(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { } } }

/* El nombre de la cuenta lo escribe el usuario y se inserta con innerHTML */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============================== VISTA: HOY ============================= */

function renderTop() {
  $('#statStreak').textContent = streak();
  $('#statCandy').textContent = S.candy;
  $('#statDex').textContent = dexCount();
}

function renderTasks(k, host, locked) {
  const d = day(k);
  host.innerHTML = '';
  TASKS.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'task' + (d.t[i] ? ' on' : '') + (locked ? ' locked' : '');
    b.style.setProperty('--tc', t.c);
    b.innerHTML =
      `<span class="tk-ic">${t.ic}</span>` +
      `<span class="tk-body"><span class="tk-name">${t.n}</span>` +
      `<span class="tk-type">Tipo ${t.ty}</span></span>` +
      '<span class="tk-check">✓</span>';
    if (!locked) {
      b.onclick = () => {
        d.t[i] = d.t[i] ? 0 : 1;
        save();
        buzz(12);
        if (k === todayKey()) renderHoy();
        if (sheetDay === k) renderDaySheet(k);
        renderCal();
      };
    }
    host.appendChild(b);
  });
}

function renderHoy() {
  const k = todayKey();
  const d = day(k);
  const n = doneCount(k);
  const r = rankOf(n);
  const rk = RANKS[r];

  $('#todayDate').textContent = longDate(k);
  paintBall($('#todayBall'), rk.k, 'ball-big');
  $('#todayRank').textContent = rk.n;
  $('#todayRank').style.color = r ? rk.c : 'var(--dim)';
  $('#todayCount').textContent = `${n} de 7 objetivos`;
  document.documentElement.style.setProperty('--rc', rk.c);

  $('#rankTrack').innerHTML = [1, 2, 3, 4]
    .map(i => `<div class="rt ${n >= RANK_MIN[i] ? 'on' : ''}" style="--rc:${RANKS[i].c}"></div>`)
    .join('');

  renderTasks(k, $('#taskList'), !!d.cl);

  $('#mVal').textContent = d.m;
  $('#mVal').className = 'st-val' + (d.m === 1 ? ' g' : d.m >= 2 ? ' r' : '');
  $('#monsterHint').textContent =
    d.m === 0 ? 'Ninguno. Bien ahí.' :
    d.m === 1 ? 'Uno. Punto verde en el calendario.' :
    `${d.m}. Punto rojo en el calendario.`;

  const btn = $('#claimBtn'), note = $('#claimNote');
  if (d.cl) {
    btn.disabled = true; btn.classList.remove('ready');
    btn.textContent = 'DÍA CERRADO';
    note.textContent = 'Ya lanzaste la Ball de hoy. Vuelve mañana.';
  } else if (n === 0) {
    btn.disabled = true; btn.classList.remove('ready');
    btn.textContent = 'CIERRA EL DÍA';
    note.textContent = 'Marca al menos 1 objetivo para conseguir una Ball.';
  } else {
    btn.disabled = false; btn.classList.add('ready');
    btn.textContent = 'LANZAR ' + rk.n;
    note.textContent = `Cerrarás el día y ganarás ${candyFor(n, streak())} caramelos.`;
  }

  renderPending();
  renderStats();
  renderTop();
}

function renderPending() {
  const list = pendingDays();
  const wrap = $('#pendingWrap');
  if (!list.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  $('#pendingList').innerHTML = list.map(k => {
    const r = rankOf(doneCount(k));
    return '<div class="pd">' + ballHTML(RANKS[r].k) +
      `<span class="pd-d">${longDate(k)}</span>` +
      `<button class="pd-b" data-claim="${k}">LANZAR</button></div>`;
  }).join('');
  $$('#pendingList .pd-b').forEach(b => { b.onclick = () => claimDay(b.dataset.claim); });
}

function renderStats() {
  const keys = Object.keys(S.days);
  const activos = keys.filter(k => doneCount(k) > 0).length;
  const master = keys.filter(k => rankOf(doneCount(k)) === 4).length;
  const total = keys.reduce((a, k) => a + doneCount(k), 0);

  let hit = 0;
  const d = new Date();
  for (let i = 0; i < 30; i++) { if (doneCount(dkey(d)) > 0) hit++; d.setDate(d.getDate() - 1); }

  const stats = [
    { v: activos, l: 'Días entrenados' },
    { v: master, l: 'Días Master Ball', c: 'var(--masterball)' },
    { v: Math.round(hit / 30 * 100) + '%', l: 'Consistencia 30 días', c: 'var(--ok)' },
    { v: total, l: 'Objetivos cumplidos' },
    { v: S.box.length, l: 'Pokémon en la caja' },
    { v: shinyCount(), l: 'Shinys', c: 'var(--gold)' },
    { v: S.monstersTotal, l: 'Monsters tomados', c: S.monstersTotal ? 'var(--bad)' : 'var(--ok)' },
    { v: dexCount() + '/' + (DEX.length || 1025), l: 'Pokédex' }
  ];
  $('#statsGrid').innerHTML = stats.map(s =>
    `<div class="stat"><div class="stat-v" style="--sc:${s.c || 'var(--txt)'}">${s.v}</div>` +
    `<div class="stat-l">${s.l}</div></div>`
  ).join('');
}

/* --------------------- cerrar el día y lanzar la ball ------------------ */

function claimDay(k) {
  const d = day(k);
  if (d.cl) return;
  const n = doneCount(k);
  if (n === 0) return;

  if (k === todayKey() && !confirm(
    `¿Cerrar el día con ${n} de 7 objetivos?\n\nRango: ${RANKS[rankOf(n)].n}\n` +
    'Después ya no podrás marcar más objetivos de hoy.'
  )) return;

  const rank = rankOf(n);
  const strk = streak();
  const gained = candyFor(n, strk);

  d.cl = 1;
  S.candy += gained;
  save();

  playCatch(rank, rollEncounter(rank), gained, strk);
}

function playCatch(rank, enc, gained, strk) {
  const scene = $('#catchScene'), ball = $('#catchBall'), res = $('#catchResult');

  scene.hidden = false;
  res.hidden = true;
  ball.hidden = false;
  ball.className = 'catch-ball ball ' + RANKS[rank].k;
  ball.innerHTML = ballInner(RANKS[rank].k);
  buzz(20);

  setTimeout(() => { ball.classList.add('shake'); buzz([40, 160, 40, 160, 40]); }, 1100);

  setTimeout(() => {
    ball.hidden = true;
    const p = BY_ID[enc.id];
    const isNew = registerDex(enc.id, enc.shiny);

    S.box.push({ u: S.uid++, i: enc.id, sh: enc.shiny, d: todayKey() });

    let extra = 0;
    if (!isNew) {
      extra = DUPE_CANDY[p.r] * (enc.shiny ? 3 : 1);
      S.candy += extra;
    }
    save();

    $('#crSprite').src = sprite(enc.id, enc.shiny);
    $('#crSprite').alt = p.n;
    $('#crShiny').hidden = !enc.shiny;
    $('#crName').textContent = p.n;
    $('#crName').style.color = enc.shiny ? 'var(--gold)' : 'var(--txt)';
    $('#crTag').innerHTML = [
      isNew ? '¡NUEVO EN LA POKÉDEX!' : `Repetido · +${extra} caramelos`,
      `Nº ${String(enc.id).padStart(4, '0')} · ${RARITY_NAME[p.r]}`,
      `+${gained} caramelos${strk >= 7 ? ` (racha x${strk >= 30 ? 2 : 1.5})` : ''}`
    ].join('<br>');

    res.hidden = false;
    buzz(enc.shiny ? [60, 60, 60, 60, 200] : 60);
  }, 2600);
}

$('#crOk').onclick = () => {
  $('#catchScene').hidden = true;
  renderHoy(); renderCal(); renderBox(); renderDex();
};

/* =========================== VISTA: CALENDARIO ========================= */

const calDate = new Date();

function renderCal() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  $('#calMonth').textContent = `${MESES[m]} ${y}`;

  const start = (new Date(y, m, 1).getDay() + 6) % 7;   // lunes = 0
  const days = new Date(y, m + 1, 0).getDate();
  const t = todayKey();

  let html = '';
  for (let i = 0; i < start; i++) html += '<div class="cd blank"></div>';

  const tally = [0, 0, 0, 0, 0];
  for (let n = 1; n <= days; n++) {
    const k = `${y}-${pad(m + 1)}-${pad(n)}`;
    const d = peek(k);
    const c = d ? d.t.reduce((a, b) => a + b, 0) : 0;
    const r = rankOf(c);
    if (r) tally[r]++;
    const cls = ['cd'];
    if (r) cls.push('r' + r, 'filled');
    if (k === t) cls.push('today');
    if (k > t) cls.push('future');
    const mdot = d && d.m ? `<div class="md ${d.m === 1 ? 'g' : 'r'}"></div>` : '';
    const un = (d && c > 0 && !d.cl && k <= t) ? '<span class="unclaimed">🎁</span>' : '';
    html += `<div class="${cls.join(' ')}" data-d="${k}"><span class="n">${n}</span>${mdot}${un}</div>`;
  }
  $('#calGrid').innerHTML = html;
  $$('#calGrid .cd[data-d]').forEach(el => { el.onclick = () => openDaySheet(el.dataset.d); });

  $('#monthSummary').innerHTML = [1, 2, 3, 4].map(r =>
    `<div class="ms">${ballHTML(RANKS[r].k)}<b>${tally[r]}</b><span>${RANKS[r].n}</span></div>`
  ).join('');
}

$('#calPrev').onclick = () => { calDate.setMonth(calDate.getMonth() - 1); renderCal(); };
$('#calNext').onclick = () => { calDate.setMonth(calDate.getMonth() + 1); renderCal(); };

/* ------------------------ hoja de detalle del día ---------------------- */

let sheetDay = null;

function openDaySheet(k) {
  sheetDay = k;
  openSheet();
  renderDaySheet(k);
}

function renderDaySheet(k) {
  const future = k > todayKey();
  const d = day(k);
  const n = doneCount(k);
  const r = rankOf(n);

  $('#sheetBody').innerHTML =
    '<div class="sh-grab"></div>' +
    '<div class="sh-hero">' + ballHTML(RANKS[r].k, 'ball-big') +
    `<div class="sh-name" style="color:${r ? RANKS[r].c : 'var(--dim)'}">${RANKS[r].n}</div>` +
    `<div class="sh-meta">${longDate(k)} · ${n} de 7 objetivos</div></div>` +
    (future
      ? '<div class="empty">Ese día aún no ha llegado.</div>'
      : '<div class="sh-sec">Objetivos</div><div class="daysheet-tasks" id="dsTasks"></div>' +
        '<div class="sh-sec">Monsters</div>' +
        '<div class="monster-card"><div class="mc-left"><div class="mc-title">Tomados ese día</div>' +
        `<div class="mc-sub">${d.m === 0 ? 'Ninguno' : d.m === 1 ? 'Punto verde' : 'Punto rojo'}</div></div>` +
        '<div class="stepper"><button class="st-btn" id="dsM">−</button>' +
        `<div class="st-val ${d.m === 1 ? 'g' : d.m >= 2 ? 'r' : ''}">${d.m}</div>` +
        '<button class="st-btn" id="dsP">+</button></div></div>' +
        (d.cl
          ? '<div class="claim-note" style="margin-top:14px">Día cerrado. Los objetivos ya no se pueden cambiar.</div>'
          : n > 0
            ? `<button class="sh-btn pri" style="width:100%;margin-top:14px" id="dsClaim">LANZAR ${RANKS[r].n}</button>`
            : '<div class="claim-note" style="margin-top:14px">Marca objetivos para conseguir una Ball.</div>')
    );

  if (future) return;

  renderTasks(k, $('#dsTasks'), !!d.cl);
  $('#dsM').onclick = () => {
    if (d.m > 0) {
      d.m--; S.monstersTotal = Math.max(0, S.monstersTotal - 1);
      save(); renderDaySheet(k); renderCal(); renderStats();
    }
  };
  $('#dsP').onclick = () => {
    d.m++; S.monstersTotal++;
    save(); renderDaySheet(k); renderCal(); renderStats();
  };
  const cb = $('#dsClaim');
  if (cb) cb.onclick = () => { closeSheet(); claimDay(k); };
}

/* ============================== VISTA: PESO ============================ */

/* Una vez por semana, en un día y una hora que cambian cada vez.
   Se pregunta la próxima vez que abras la app pasado ese momento: una web
   estática no puede avisarte con el móvil cerrado. */
function scheduleNextWeigh(desde) {
  const d = new Date(desde || Date.now());
  d.setDate(d.getDate() + 5 + Math.floor(Math.random() * 5));   // entre 5 y 9 días
  d.setHours(9 + Math.floor(Math.random() * 13),                // entre las 9 y las 21
    Math.floor(Math.random() * 60), 0, 0);
  return d.getTime();
}

function weightList() {
  return (S.weights || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
}

function currentWeight() {
  const l = weightList();
  return l.length ? l[l.length - 1].kg : null;
}

function recordWeight(kg) {
  const k = todayKey();
  const i = S.weights.findIndex(w => w.d === k);
  if (i >= 0) S.weights[i].kg = kg; else S.weights.push({ d: k, kg });
  S.nextWeigh = scheduleNextWeigh();
  save();
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* Pokémon de peso parecido. Rota cada día pero es estable dentro del mismo día. */
function pokemonLikeMe(kg, fecha) {
  const cands = DEX
    .filter(p => typeof p.w === 'number' && p.w > 0)
    .map(p => ({ p, dif: Math.abs(p.w / 10 - kg) }))
    .sort((a, b) => a.dif - b.dif)
    .slice(0, 25);
  if (!cands.length) return null;
  return cands[hashStr(fecha) % cands.length].p;
}

const kg1 = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');

function weightChart(list) {
  const W = 320, H = 168, L = 40, R = 12, T = 14, B = 26;
  const kgs = list.map(p => p.kg);
  let min = Math.min(...kgs), max = Math.max(...kgs);
  if (max - min < 1.5) { const mid = (max + min) / 2; min = mid - 0.75; max = mid + 0.75; }
  const margen = (max - min) * 0.18;
  min -= margen; max += margen;

  const ts = list.map(p => parseKey(p.d).getTime());
  const t0 = ts[0], t1 = ts[ts.length - 1];
  const span = Math.max(t1 - t0, 1);
  const uno = list.length === 1;
  const px = (t) => uno ? (L + W - R) / 2 : L + (W - L - R) * (t - t0) / span;
  const py = (k) => T + (H - T - B) * (1 - (k - min) / (max - min));

  const pts = list.map((p, i) => [px(ts[i]), py(p.kg)]);
  const linea = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${L},${H - B} ${linea} ${pts[pts.length - 1][0].toFixed(1)},${H - B}`;

  const rejilla = [0, 0.5, 1].map(f => {
    const k = min + (max - min) * f;
    const y = py(k);
    return `<line x1="${L}" y1="${y.toFixed(1)}" x2="${W - R}" y2="${y.toFixed(1)}" ` +
      'stroke="#26334f" stroke-width="1"/>' +
      `<text x="${L - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" ` +
      `fill="#8b9ac0" font-weight="700">${kg1(k)}</text>`;
  }).join('');

  const dias = (k) => { const d = parseKey(k); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const ejeX = uno
    ? `<text x="${((L + W - R) / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" ` +
      `fill="#8b9ac0" font-weight="700">${dias(list[0].d)}</text>`
    : `<text x="${L}" y="${H - 8}" text-anchor="start" font-size="9" fill="#8b9ac0" ` +
      `font-weight="700">${dias(list[0].d)}</text>` +
      `<text x="${W - R}" y="${H - 8}" text-anchor="end" font-size="9" fill="#8b9ac0" ` +
      `font-weight="700">${dias(list[list.length - 1].d)}</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de tu peso">` +
    '<defs><linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#3f7ee8" stop-opacity=".45"/>' +
    '<stop offset="1" stop-color="#3f7ee8" stop-opacity="0"/></linearGradient></defs>' +
    rejilla +
    (uno ? '' : `<polygon points="${area}" fill="url(#wgrad)"/>`) +
    (uno ? '' : `<polyline points="${linea}" fill="none" stroke="#5c95f0" stroke-width="2.5" ` +
      'stroke-linejoin="round" stroke-linecap="round"/>') +
    pts.map((p, i) =>
      `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" ` +
      `r="${i === pts.length - 1 ? 5 : 3.2}" fill="${i === pts.length - 1 ? '#ffffff' : '#5c95f0'}" ` +
      'stroke="#0d1220" stroke-width="2"/>').join('') +
    ejeX + '</svg>';
}

function renderPeso() {
  const list = weightList();
  const kg = currentWeight();

  // ---- "Pesas como un ..." ----
  const hero = $('#likeHero');
  if (kg === null) {
    hero.innerHTML =
      '<div class="lh-lead">Aún no te has pesado</div>' +
      '<div class="lh-note" style="margin-top:10px">Anota tu peso y te digo a qué Pokémon<br>' +
      'te pareces. Cambia cada día.</div>';
    hero.style.removeProperty('--lhc');
  } else {
    const p = pokemonLikeMe(kg, todayKey());
    hero.innerHTML =
      '<div class="lh-lead">Pesas como un</div>' +
      `<img class="lh-sprite" src="${sprite(p.i, false)}" alt="${p.n}">` +
      `<div class="lh-name">${p.n}</div>` +
      `<div class="lh-kg">Pesa ${kg1(p.w / 10)} kg · tú ${kg1(kg)} kg</div>` +
      '<div class="lh-note">Cambia cada día</div>';
    const col = { red:'238,75,75', blue:'63,126,232', yellow:'242,197,61', green:'47,213,126',
      purple:'155,92,246', pink:'240,143,192', brown:'201,154,94', black:'120,130,150',
      white:'200,210,230', gray:'139,154,192' }[p.c] || '63,126,232';
    hero.style.setProperty('--lhc', `rgba(${col},.26)`);
  }

  // ---- gráfica ----
  const chart = $('#wChart'), foot = $('#wFoot'), delta = $('#wDelta');
  const head = chart.parentElement.querySelector('.chart-title');
  if (!list.length) {
    chart.innerHTML = '<div class="chart-empty">Sin datos todavía.<br>' +
      '<small>La gráfica aparece con el primer peso.</small></div>';
    delta.textContent = '';
    delta.className = 'chart-delta';
    foot.textContent = '';
    head.innerHTML = 'Tu peso';
  } else {
    chart.innerHTML = weightChart(list);
    head.innerHTML = `Tu peso<div class="w-now">${kg1(kg)} kg</div>`;
    if (list.length > 1) {
      const dif = kg - list[list.length - 2].kg;
      const total = kg - list[0].kg;
      delta.textContent = (dif > 0 ? '+' : dif < 0 ? '−' : '') + kg1(Math.abs(dif)) + ' kg';
      delta.className = 'chart-delta ' + (dif < 0 ? 'down' : dif > 0 ? 'up' : '');
      foot.textContent = `${list.length} registros · ` +
        (total === 0 ? 'igual que al empezar'
          : `${total < 0 ? '−' : '+'}${kg1(Math.abs(total))} kg desde el principio`);
    } else {
      delta.textContent = 'primer registro';
      delta.className = 'chart-delta';
      foot.textContent = 'Con dos registros ya verás la línea.';
    }
  }

  // ---- próximo aviso ----
  const n = $('#wNext');
  if (!S.nextWeigh) {
    n.textContent = '';
  } else {
    const d = new Date(S.nextWeigh);
    n.textContent = S.nextWeigh <= Date.now()
      ? 'Toca pesarse.'
      : `Te lo volveré a pedir el ${DIAS[d.getDay()].toLowerCase()} ${d.getDate()} ` +
        `de ${MESES[d.getMonth()].toLowerCase()} sobre las ${d.getHours()}:` +
        String(d.getMinutes()).padStart(2, '0') + '.';
  }

  // ---- historial ----
  const wl = $('#wList');
  if (!list.length) {
    wl.innerHTML = '<div class="claim-note" style="text-align:left">Todavía no hay registros.</div>';
    return;
  }
  wl.innerHTML = list.slice().reverse().map((w, idx, arr) => {
    const prev = arr[idx + 1];
    const dif = prev ? w.kg - prev.kg : null;
    const cls = dif === null || dif === 0 ? '' : dif < 0 ? 'down' : 'up';
    const txt = dif === null ? '—'
      : (dif > 0 ? '+' : dif < 0 ? '−' : '') + kg1(Math.abs(dif));
    return '<div class="wrec">' +
      `<span class="wrec-k">${kg1(w.kg)}</span>` +
      `<span class="wrec-d">${longDate(w.d)}</span>` +
      `<span class="wrec-v ${cls}">${txt}</span>` +
      `<button class="wrec-x" data-wdel="${w.d}" aria-label="Borrar">×</button></div>`;
  }).join('');

  $$('#wList [data-wdel]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.wdel;
      const w = S.weights.find(x => x.d === k);
      if (!confirm(`¿Borrar el registro de ${kg1(w.kg)} kg del ${longDate(k)}?`)) return;
      S.weights = S.weights.filter(x => x.d !== k);
      save();
      renderPeso();
    };
  });
}

/* ------------------------ hoja de anotar el peso ----------------------- */

function openWeighSheet(primeraVez) {
  // si la cierras sin guardar, se reintenta dentro de 3 horas
  S.nextWeigh = Date.now() + 3 * 3600 * 1000;
  save();

  const ultimo = currentWeight();
  openSheet();
  $('#sheetBody').innerHTML =
    '<div class="sh-grab"></div>' +
    '<div class="weigh-in">' +
    `<div class="sh-name">${primeraVez ? '¿Cuánto pesas?' : 'Toca pesarse'}</div>` +
    '<div class="sh-meta">' +
    (primeraVez
      ? 'Para arrancar la gráfica y decirte a qué Pokémon te pareces.'
      : ultimo !== null
        ? `La última vez fueron ${kg1(ultimo)} kg.`
        : 'Anota tu peso para empezar la gráfica.') +
    '</div>' +
    `<input class="weigh-big" id="wIn" type="number" inputmode="decimal" step="0.1" ` +
    `min="20" max="400" placeholder="0,0"${ultimo !== null ? ` value="${ultimo}"` : ''}>` +
    '<div class="weigh-unit">kilogramos</div>' +
    '<div class="sh-row">' +
    '<button class="sh-btn" id="wLater">Ahora no</button>' +
    '<button class="sh-btn pri" id="wSave">GUARDAR</button></div></div>';

  const inp = $('#wIn');
  setTimeout(() => { inp.focus(); inp.select(); }, 150);

  $('#wSave').onclick = () => {
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (!isFinite(v) || v < 20 || v > 400) {
      toast('Pon un peso entre 20 y 400 kg');
      inp.focus();
      return;
    }
    const antes = currentWeight();
    recordWeight(Math.round(v * 10) / 10);
    closeSheet();
    const p = pokemonLikeMe(v, todayKey());
    if (antes !== null && Math.abs(v - antes) >= 0.05) {
      const dif = v - antes;
      toast(`${dif < 0 ? '−' : '+'}${kg1(Math.abs(dif))} kg`, dif < 0 ? 'good' : '');
    } else {
      toast(p ? `Pesas como un ${p.n}` : 'Peso guardado', 'good');
    }
    go('peso');
  };

  $('#wLater').onclick = () => {
    closeSheet();
    toast('Vale, te lo pregunto más tarde');
  };
}

/* ¿toca pesarse? se llama al entrar en una cuenta */
function checkWeighDue() {
  if (!ME) return;
  if (!S.weights.length) {                    // primera vez que entra la cuenta
    setTimeout(() => openWeighSheet(true), 700);
    return;
  }
  if (!S.nextWeigh) { S.nextWeigh = scheduleNextWeigh(); save(); return; }
  if (Date.now() >= S.nextWeigh) setTimeout(() => openWeighSheet(false), 700);
}

$('#wAdd').onclick = () => openWeighSheet(false);

/* ============================== VISTA: CAJA ============================ */

let boxFilter = 'all';
let boxQuery = '';
let boxShown = 0;

function boxList() {
  let arr = S.box.slice().reverse();        // lo más reciente primero
  if (boxFilter === 'shiny') arr = arr.filter(b => b.sh);
  if (boxFilter === 'evo') arr = arr.filter(b => (BY_ID[b.i].to || []).length > 0);
  if (boxFilter === 'recent') arr = arr.slice(0, 60);
  if (boxQuery) {
    const q = boxQuery.toLowerCase();
    arr = arr.filter(b => BY_ID[b.i].n.toLowerCase().includes(q) || String(b.i) === q);
  }
  return arr;
}

function renderBox(reset) {
  if (reset !== false) reset = true;
  const arr = boxList();
  const grid = $('#boxGrid');
  $('#boxCount').textContent = S.box.length;
  $('#boxEmpty').hidden = arr.length > 0;

  if (reset) { grid.innerHTML = ''; boxShown = 0; }
  const slice = arr.slice(boxShown, boxShown + PAGE);
  const frag = document.createDocumentFragment();

  slice.forEach(b => {
    const p = BY_ID[b.i];
    const evos = p.to || [];
    const canEvo = evos.length > 0 && evos.some(id => S.candy >= evoCost(id));
    const el = document.createElement('button');
    el.className = 'mon' + (b.sh ? ' sh' : '');
    el.innerHTML =
      (b.sh ? '<span class="star">✨</span>' : '') +
      (canEvo ? '<span class="evo-rdy">⬆️</span>' : '') +
      `<img loading="lazy" decoding="async" src="${sprite(b.i, b.sh)}" alt="${p.n}">` +
      `<div class="nm">${p.n}</div><div class="id">Nº ${String(b.i).padStart(4, '0')}</div>`;
    el.onclick = () => openMonSheet(b.u);
    frag.appendChild(el);
  });

  grid.appendChild(frag);
  boxShown += slice.length;

  if (boxShown < arr.length) {
    const more = document.createElement('button');
    more.className = 'f-btn';
    more.style.cssText = 'grid-column:1/-1;padding:12px;margin-top:6px';
    more.textContent = `Ver más (${arr.length - boxShown} restantes)`;
    more.onclick = () => { more.remove(); renderBox(false); };
    grid.appendChild(more);
  }
}

$$('#boxFilters .f-btn').forEach(b => {
  b.onclick = () => {
    $$('#boxFilters .f-btn').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    boxFilter = b.dataset.f;
    renderBox();
  };
});
$('#boxSearch').oninput = (e) => { boxQuery = e.target.value.trim(); renderBox(); };

/* ------------------------- hoja de un Pokémon -------------------------- */

function evoCost(targetId) {
  const p = BY_ID[targetId];
  if (!p) return Infinity;
  let base = p.st >= 2 ? 100 : 25;
  if (p.r >= 4) base *= 3;
  return base;
}

let evoPick = null;

function openMonSheet(uid) {
  const b = S.box.find(x => x.u === uid);
  if (!b) return;
  evoPick = (BY_ID[b.i].to || [])[0] || null;
  openSheet();
  renderMonSheet(uid);
}

function renderMonSheet(uid) {
  const b = S.box.find(x => x.u === uid);
  if (!b) { closeSheet(); return; }
  const p = BY_ID[b.i];
  const evos = p.to || [];
  const cost = evoPick ? evoCost(evoPick) : 0;
  const canPay = evoPick !== null && S.candy >= cost;
  const dupCandy = DUPE_CANDY[p.r] * (b.sh ? 3 : 1);

  let html =
    '<div class="sh-grab"></div>' +
    `<div class="sh-hero"><img src="${sprite(b.i, b.sh)}" alt="${p.n}">` +
    `<div class="sh-name" style="color:${b.sh ? 'var(--gold)' : 'var(--txt)'}">${p.n}${b.sh ? ' ✨' : ''}</div>` +
    `<div class="sh-meta">Nº ${String(b.i).padStart(4, '0')} · ${p.g || '—'}<br>` +
    `Gen ${p.gen} · ${RARITY_NAME[p.r]} · capturado el ${longDate(b.d)}</div></div>`;

  if (evos.length) {
    html += '<div class="sh-sec">Evolución' +
      (evos.length > 1 ? ` · elige una de ${evos.length}` : '') + '</div>';
    html += '<div class="evo-opts">' + evos.map(id =>
      `<button class="evo-op ${id === evoPick ? 'sel' : ''}" data-evo="${id}">` +
      `<img loading="lazy" src="${sprite(id, b.sh)}" alt="${BY_ID[id].n}">` +
      `<div class="nm">${BY_ID[id].n}</div>` +
      `<div class="nm" style="color:${S.candy >= evoCost(id) ? 'var(--ok)' : 'var(--dim)'}">` +
      `${evoCost(id)} 🍬</div></button>`
    ).join('') + '</div>';
    html += `<button class="sh-btn pri" style="width:100%;margin-top:12px" id="doEvo"` +
      (canPay ? '' : ' disabled') + '>' +
      (canPay ? `EVOLUCIONAR · ${cost} caramelos` : `TE FALTAN ${cost - S.candy} CARAMELOS`) +
      '</button>';
    if (b.sh) html += '<div class="claim-note">Al evolucionar conserva el shiny.</div>';
  } else {
    html += '<div class="sh-sec">Evolución</div>' +
      '<div class="claim-note" style="text-align:left">Este Pokémon no evoluciona.</div>';
  }

  html += '<div class="sh-row">' +
    `<button class="sh-btn dan" id="doTransfer">Transferir · +${dupCandy} 🍬</button>` +
    '<button class="sh-btn" id="doClose">Cerrar</button></div>';

  $('#sheetBody').innerHTML = html;

  $$('#sheetBody [data-evo]').forEach(el => {
    el.onclick = () => { evoPick = Number(el.dataset.evo); renderMonSheet(uid); };
  });
  const de = $('#doEvo');
  if (de) de.onclick = () => doEvolve(uid);

  $('#doTransfer').onclick = () => {
    if (!confirm(`¿Transferir a ${p.n}?\n\nDesaparece de la caja (sigue registrado en la Pokédex) ` +
      `y recibes ${dupCandy} caramelos.`)) return;
    S.box = S.box.filter(x => x.u !== uid);
    S.candy += dupCandy;
    save(); closeSheet();
    toast(`+${dupCandy} caramelos`, 'good');
    renderBox(); renderTop(); renderStats();
  };
  $('#doClose').onclick = closeSheet;
}

function doEvolve(uid) {
  const b = S.box.find(x => x.u === uid);
  if (!b || evoPick === null) return;
  const cost = evoCost(evoPick);
  if (S.candy < cost) return;

  const from = BY_ID[b.i], to = BY_ID[evoPick];
  S.candy -= cost;
  b.i = evoPick;
  const isNew = registerDex(evoPick, b.sh);
  save();

  closeSheet();
  const scene = $('#catchScene'), ball = $('#catchBall'), res = $('#catchResult');
  scene.hidden = false; res.hidden = true; ball.hidden = true;

  setTimeout(() => {
    $('#crSprite').src = sprite(b.i, b.sh);
    $('#crSprite').alt = to.n;
    $('#crShiny').hidden = !b.sh;
    $('#crName').textContent = to.n;
    $('#crName').style.color = b.sh ? 'var(--gold)' : 'var(--txt)';
    $('#crTag').innerHTML =
      `¡${from.n} evolucionó a ${to.n}!<br>` +
      (isNew ? '¡NUEVO EN LA POKÉDEX!<br>' : '') +
      `−${cost} caramelos · te quedan ${S.candy}`;
    res.hidden = false;
    buzz([40, 80, 120]);
  }, 120);
}

/* ============================ VISTA: POKÉDEX =========================== */

let dexGen = 0;
let dexQuery = '';
let dexShown = 0;

function dexList() {
  let arr = DEX;
  if (dexGen) arr = arr.filter(p => p.gen === dexGen);
  if (dexQuery) {
    const q = dexQuery.toLowerCase();
    arr = arr.filter(p => p.n.toLowerCase().includes(q) || String(p.i) === q);
  }
  return arr;
}

function renderDex(reset) {
  if (reset !== false) reset = true;
  const got = dexCount();
  const tot = DEX.length || 1025;
  $('#dexCount').textContent = `${got}/${tot}`;
  $('#dexBar').style.width = (got / tot * 100) + '%';

  const arr = dexList();
  const grid = $('#dexGrid');
  if (reset) { grid.innerHTML = ''; dexShown = 0; }

  const slice = arr.slice(dexShown, dexShown + PAGE);
  const frag = document.createDocumentFragment();

  slice.forEach(p => {
    const e = S.dex[p.i];
    const have = !!e;
    const onlyShiny = have && e.s && !e.c;
    const el = document.createElement('button');
    el.className = 'dx' + (have ? '' : ' locked') + (have && e.s ? ' gold' : '');
    el.innerHTML =
      `<img loading="lazy" decoding="async" src="${sprite(p.i, onlyShiny)}" alt="${have ? p.n : '???'}">` +
      `<div class="nm">${have ? p.n : '???'}</div>`;
    el.onclick = () => openDexSheet(p.i);
    frag.appendChild(el);
  });

  grid.appendChild(frag);
  dexShown += slice.length;

  if (dexShown < arr.length) {
    const more = document.createElement('button');
    more.className = 'f-btn';
    more.style.cssText = 'grid-column:1/-1;padding:12px;margin-top:6px';
    more.textContent = `Ver más (${arr.length - dexShown} restantes)`;
    more.onclick = () => { more.remove(); renderDex(false); };
    grid.appendChild(more);
  }
}

function openDexSheet(id) {
  const p = BY_ID[id];
  const e = S.dex[id];
  const have = !!e;
  const onlyShiny = have && e.s && !e.c;
  const evos = p.to || [];

  openSheet();
  $('#sheetBody').innerHTML =
    '<div class="sh-grab"></div>' +
    `<div class="sh-hero"><img src="${sprite(id, onlyShiny)}" alt="" ` +
    `style="${have ? '' : 'filter:brightness(0) invert(.2)'}">` +
    `<div class="sh-name">${have ? p.n : '???'}</div>` +
    `<div class="sh-meta">Nº ${String(id).padStart(4, '0')} · Gen ${p.gen}<br>` +
    (have ? `${p.g || '—'} · ${RARITY_NAME[p.r]}` : 'Aún no lo has conseguido') +
    (have && e.s ? '<br><span style="color:var(--gold)">✨ Shiny conseguido</span>' : '') +
    (onlyShiny ? '<br><span style="color:var(--dim)">Te falta la versión normal</span>' : '') +
    '</div></div>' +
    '<div class="claim-note" style="text-align:left">' +
    (p.st === 0
      ? 'Forma base: puede aparecer al lanzar una Ball.'
      : 'Solo se consigue evolucionando a su preevolución.') +
    '</div>' +
    (evos.length
      ? '<div class="sh-sec">Evoluciona a</div><div class="evo-opts">' +
        evos.map(x =>
          '<div class="evo-op">' +
          `<img loading="lazy" src="${sprite(x, false)}" alt="" ` +
          `style="${S.dex[x] ? '' : 'filter:brightness(0) invert(.2)'}">` +
          `<div class="nm">${S.dex[x] ? BY_ID[x].n : '???'}</div></div>`
        ).join('') + '</div>'
      : '') +
    '<div class="sh-row"><button class="sh-btn" id="doClose">Cerrar</button></div>';

  $('#doClose').onclick = closeSheet;
}

$('#dexSearch').oninput = (e) => { dexQuery = e.target.value.trim(); renderDex(); };

function buildGenFilters() {
  const gens = [...new Set(DEX.map(p => p.gen))].sort((a, b) => a - b);
  $('#genFilters').innerHTML =
    '<button class="f-btn on" data-g="0">Todas</button>' +
    gens.map(g => `<button class="f-btn" data-g="${g}">Gen ${g}</button>`).join('');
  $$('#genFilters .f-btn').forEach(b => {
    b.onclick = () => {
      $$('#genFilters .f-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      dexGen = Number(b.dataset.g);
      renderDex();
    };
  });
}

/* ================================ SHEET =============================== */

function openSheet() { $('#sheet').hidden = false; }
function closeSheet() { $('#sheet').hidden = true; sheetDay = null; }
$('#sheet').querySelector('.sheet-bg').onclick = closeSheet;

/* ============================= NAVEGACIÓN ============================== */

function go(v) {
  $$('.view').forEach(s => { s.hidden = s.id !== 'view-' + v; });
  $$('#nav .nb').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  window.scrollTo(0, 0);
  if (v === 'hoy') renderHoy();
  if (v === 'cal') renderCal();
  if (v === 'peso') renderPeso();
  if (v === 'caja') renderBox();
  if (v === 'dex') renderDex();
}
$$('#nav .nb').forEach(b => { b.onclick = () => go(b.dataset.v); });

/* ============================= MONSTERS HOY ============================ */

$('#mPlus').onclick = () => {
  const d = day(todayKey());
  d.m++; S.monstersTotal++;
  save(); buzz(12); renderHoy(); renderCal();
};
$('#mMinus').onclick = () => {
  const d = day(todayKey());
  if (d.m > 0) {
    d.m--; S.monstersTotal = Math.max(0, S.monstersTotal - 1);
    save(); buzz(12); renderHoy(); renderCal();
  }
};
$('#claimBtn').onclick = () => claimDay(todayKey());

/* ======================= PANTALLA DE ACCESO / CUENTAS =================== */

let gateBadge = null;   // medalla que se está proponiendo al crear cuenta

function showGate(modo) {
  document.body.classList.add('locked');
  $('#gate').hidden = false;
  renderGate(modo || (ACCOUNTS.length ? 'list' : 'create'));
}

function hideGate() {
  document.body.classList.remove('locked');
  $('#gate').hidden = true;
}

function renderGate(modo) {
  if (modo === 'create') return renderGateCreate();
  const g = $('#gateBody');
  g.innerHTML =
    '<div class="gate-logo">GYMDEX</div>' +
    '<div class="gate-sub">¿Quién entrena hoy?</div>' +
    '<div class="gate-sec">Cuentas en este dispositivo</div>' +
    ACCOUNTS.map(a =>
      `<button class="acct" data-acc="${a.id}">` +
      `<span class="acct-av">${badgeSVG(badgeById(a.badge), 48)}</span>` +
      `<span class="acct-body"><span class="acct-name">${esc(a.name)}</span>` +
      `<span class="acct-meta">${accountSummary(a.id)}</span></span>` +
      (a.pin ? '<span class="acct-lock">🔒</span>' : '') +
      '<span class="acct-go">›</span></button>'
    ).join('') +
    '<button class="gate-btn pri" id="gNew" style="margin-top:14px">CREAR CUENTA</button>';

  $$('#gateBody [data-acc]').forEach(el => {
    el.onclick = () => {
      const acc = ACCOUNTS.find(a => a.id === el.dataset.acc);
      if (!acc) return;
      if (acc.pin) renderPinGate(acc); else enterAccount(acc);
    };
  });
  $('#gNew').onclick = () => renderGate('create');
}

function renderGateCreate() {
  if (!gateBadge) gateBadge = randomBadge();
  const g = $('#gateBody');
  g.innerHTML =
    '<div class="gate-logo">GYMDEX</div>' +
    '<div class="gate-sub">Tu medalla de entrenador sale al azar<br>' +
    `entre las ${BADGES.length} de las 9 generaciones.</div>` +
    '<div class="avatar-pick">' +
    `<div class="avatar-big" id="avBig">${badgeSVG(gateBadge, 132)}</div>` +
    `<div class="avatar-name" id="avName">Medalla ${esc(gateBadge.n)}</div>` +
    `<div class="gen-tag" id="avGen">${esc(gateBadge.r)} · Gen ${gateBadge.g}</div><br>` +
    '<button class="reroll" id="avRoll">🎲 Otra medalla</button></div>' +
    '<input class="gate-input" id="acName" placeholder="Tu nombre de entrenador" ' +
    'maxlength="18" autocomplete="off">' +
    '<input class="gate-input" id="acPin" inputmode="numeric" maxlength="4" ' +
    'placeholder="PIN de 4 dígitos (opcional)" autocomplete="off">' +
    '<button class="gate-btn pri" id="acGo">EMPEZAR</button>' +
    (ACCOUNTS.length ? '<button class="gate-link" id="acBack">Volver a las cuentas</button>' : '');

  $('#avRoll').onclick = () => {
    let nb = randomBadge();
    while (nb.id === gateBadge.id && BADGES.length > 1) nb = randomBadge();
    gateBadge = nb;
    $('#avBig').innerHTML = badgeSVG(gateBadge, 132);
    $('#avBig').style.animation = 'none';
    void $('#avBig').offsetWidth;
    $('#avBig').style.animation = '';
    $('#avName').textContent = 'Medalla ' + gateBadge.n;
    $('#avGen').textContent = `${gateBadge.r} · Gen ${gateBadge.g}`;
    buzz(12);
  };

  $('#acPin').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, ''); };

  $('#acGo').onclick = async () => {
    const nombre = $('#acName').value.trim();
    if (!nombre) { toast('Ponte un nombre'); $('#acName').focus(); return; }
    const pin = $('#acPin').value.trim();
    if (pin && pin.length !== 4) { toast('El PIN tiene que ser de 4 dígitos'); return; }
    const acc = createAccount(nombre, gateBadge.id, await hashPin(pin));
    gateBadge = null;
    enterAccount(acc);
    toast(`¡Bienvenido, ${nombre}!`, 'good');
  };

  const back = $('#acBack');
  if (back) back.onclick = () => { gateBadge = null; renderGate('list'); };
}

/* ------------------------------ PIN ------------------------------------ */

let pinBuf = '';

function renderPinGate(acc) {
  pinBuf = '';
  const g = $('#gateBody');
  g.innerHTML =
    '<div class="avatar-pick" style="margin-bottom:10px">' +
    `<div class="avatar-big" style="width:96px;height:96px">${badgeSVG(badgeById(acc.badge), 96)}</div>` +
    `<div class="avatar-name">${esc(acc.name)}</div></div>` +
    '<div class="gate-sub" style="margin:6px 0 0">Introduce tu PIN</div>' +
    '<div class="pinbox" id="pinBox">' +
    '<i class="pin-dot"></i><i class="pin-dot"></i><i class="pin-dot"></i><i class="pin-dot"></i></div>' +
    '<div class="pin-err" id="pinErr"></div>' +
    '<div class="keypad" id="keypad">' +
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}">${n}</button>`).join('') +
    '<button class="key wide" data-k="back">Volver</button>' +
    '<button class="key" data-k="0">0</button>' +
    '<button class="key wide" data-k="del">Borrar</button>' +
    '</div>';

  const pintar = (err) => {
    $$('#pinBox .pin-dot').forEach((d, i) => {
      d.classList.toggle('on', i < pinBuf.length && !err);
      d.classList.toggle('err', !!err);
    });
  };

  $$('#keypad .key').forEach(k => {
    k.onclick = async () => {
      const v = k.dataset.k;
      if (v === 'back') { renderGate('list'); return; }
      if (v === 'del') { pinBuf = pinBuf.slice(0, -1); pintar(); return; }
      if (pinBuf.length >= 4) return;
      pinBuf += v;
      buzz(10);
      pintar();
      if (pinBuf.length === 4) {
        const h = await hashPin(pinBuf);
        if (h === acc.pin) { enterAccount(acc); }
        else {
          pintar(true);
          $('#pinErr').textContent = 'PIN incorrecto';
          buzz([60, 60, 60]);
          setTimeout(() => { pinBuf = ''; pintar(); $('#pinErr').textContent = ''; }, 700);
        }
      }
    };
  });
}

/* ------------------------ entrar / salir / perfil ---------------------- */

function enterAccount(acc) {
  ME = acc;
  localStorage.setItem(K_SESSION, acc.id);   // aquí es donde se guarda la sesión
  load();
  hideGate();
  renderProfileChip();
  go('hoy');
  checkWeighDue();
}

function logout() {
  localStorage.removeItem(K_SESSION);
  ME = null;
  S = blankState();
  closeSheet();
  showGate('list');
}

function renderProfileChip() {
  if (!ME) return;
  $('#tbAvatar').innerHTML = badgeSVG(badgeById(ME.badge), 32);
  $('#tbName').textContent = ME.name;
}

function openProfile() {
  if (!ME) return;
  const b = badgeById(ME.badge);
  openSheet();
  $('#sheetBody').innerHTML =
    '<div class="sh-grab"></div>' +
    '<div class="prof-hero">' +
    `<div class="prof-av">${badgeSVG(b, 104)}</div>` +
    `<div class="sh-name">${esc(ME.name)}</div>` +
    `<div class="sh-meta">${badgeLabel(b)} · Gen ${b.g}<br>` +
    `Entrenando desde el ${longDate(ME.created)}</div></div>` +
    '<div class="sh-row"><button class="sh-btn" id="pfRoll">🎲 Cambiar medalla</button>' +
    '<button class="sh-btn" id="pfName">Cambiar nombre</button></div>' +
    '<div class="sh-sec">Copia de seguridad</div>' +
    '<div class="claim-note" style="text-align:left;margin:0 0 9px">' +
    'Los datos viven solo en este navegador. Guarda una copia de vez en cuando.</div>' +
    '<div class="sh-row" style="margin-top:0">' +
    '<button class="sh-btn" id="pfExport">Exportar</button>' +
    '<button class="sh-btn" id="pfImport">Importar</button></div>' +
    '<div class="sh-sec">Cuenta</div>' +
    '<div class="sh-row" style="margin-top:0">' +
    '<button class="sh-btn" id="pfSwitch">Cambiar de cuenta</button>' +
    '<button class="sh-btn dan" id="pfOut">Cerrar sesión</button></div>' +
    '<button class="gate-link" id="pfDel" style="color:#ff8b8b">Eliminar esta cuenta</button>';

  $('#pfRoll').onclick = () => {
    let nb = randomBadge();
    while (nb.id === ME.badge && BADGES.length > 1) nb = randomBadge();
    ME.badge = nb.id;
    saveAccounts();
    renderProfileChip();
    openProfile();
    toast('Medalla ' + nb.n, 'good');
  };

  $('#pfName').onclick = () => {
    const n = prompt('Nombre de entrenador:', ME.name);
    if (n === null) return;
    const t = n.trim().slice(0, 18);
    if (!t) return;
    ME.name = t;
    saveAccounts();
    renderProfileChip();
    openProfile();
  };

  $('#pfExport').onclick = doExport;
  $('#pfImport').onclick = () => $('#fileImport').click();
  $('#pfSwitch').onclick = () => { closeSheet(); showGate('list'); };
  $('#pfOut').onclick = () => {
    if (confirm('¿Cerrar sesión?\n\nTus datos siguen guardados en este dispositivo.')) logout();
  };
  $('#pfDel').onclick = () => {
    if (!confirm(`¿Eliminar la cuenta de ${ME.name}?\n\n` +
      'Se borran su Pokédex, su caja y su calendario. Esto NO se puede deshacer.')) return;
    if (!confirm('Última confirmación: se borra para siempre.')) return;
    localStorage.removeItem(K_SAVE + ME.id);
    ACCOUNTS = ACCOUNTS.filter(a => a.id !== ME.id);
    saveAccounts();
    logout();
  };
}

$('#tbProfile').onclick = openProfile;

/* =========================== COPIA DE SEGURIDAD ======================== */

function doExport() {
  const paquete = { app: 'gymdex', cuenta: { name: ME.name, badge: ME.badge }, datos: S };
  const blob = new Blob([JSON.stringify(paquete)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gymdex-${ME.name.replace(/\W+/g, '-').toLowerCase()}-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Copia descargada', 'good');
}

$('#fileImport').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    let raw;
    try { raw = JSON.parse(rd.result); }
    catch (err) { toast('Ese archivo no es una copia válida'); return; }
    // formato nuevo {app, cuenta, datos} y también el plano de antes
    const data = raw && raw.datos ? raw.datos : raw;
    if (!data || typeof data !== 'object' || !data.days || !Array.isArray(data.box)) {
      toast('Ese archivo no es una copia de GYMDEX');
      return;
    }
    const dias = Object.keys(data.days).length;
    if (!confirm(`Vas a sustituir tus datos actuales por la copia.\n\n` +
      `La copia tiene ${dias} días, ${data.box.length} Pokémon en la caja ` +
      `y ${Object.keys(data.dex || {}).length} en la Pokédex.\n\nEsto no se puede deshacer.`)) return;
    S = Object.assign(blankState(), data);
    save();
    toast('Copia restaurada', 'good');
    go('hoy');
  };
  rd.readAsText(f);
  e.target.value = '';
};

/* =============================== ARRANQUE ============================== */

async function boot() {
  S = blankState();
  try {
    const r = await fetch('data/pokemon.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    DEX = await r.json();
  } catch (e) {
    document.body.classList.remove('locked');
    $('#gate').hidden = false;
    $('#gateBody').innerHTML =
      '<div class="empty">No se pudo cargar <b>data/pokemon.json</b>.<br>' +
      '<small>Abre la web desde un servidor (o GitHub Pages),<br>' +
      'no con doble clic sobre el archivo.</small></div>';
    return;
  }

  DEX.forEach(p => {
    BY_ID[p.i] = p;
    if (p.st === 0) POOL[p.r].push(p.i);
  });

  buildGenFilters();

  // sesión guardada: si la hay, se entra directo sin volver a identificarse
  loadAccounts();
  const sesion = localStorage.getItem(K_SESSION);
  const acc = ACCOUNTS.find(a => a.id === sesion);
  if (acc) {
    ME = acc;
    load();
    hideGate();
    renderProfileChip();
    go('hoy');
    checkWeighDue();
  } else {
    showGate();
  }

  // si cambia el día con la app abierta, se refresca sola
  let last = todayKey();
  setInterval(() => {
    if (!ME) return;
    const t = todayKey();
    if (t !== last) { last = t; renderHoy(); renderCal(); }
  }, 60000);
}

boot();
