/* ============================================================
   SG H2Ku – Trainingskick-Statistik · App
   ============================================================ */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

const TODAY = new Date();
const THIS_MONTH = isoDate(TODAY).slice(0, 7);

const S = {
  tab: 'home',
  scope: ls.get('h2ku-scope', 'all'),
  month: THIS_MONTH,
  showAll: {},
  filter: '',
  pw: ls.get('h2ku-pw', null),
  draft: ls.get('h2ku-draft', null),
  mode: 'scorer',
  pending: null,
  voteSel: {}, voteOpen: {},        // Abstimmungen: je Art (potm / flop)
  articleVariant: 0,
  installEvt: null,
  open: new Set(),                 // aufgeklappte Spiele
  pview: 'kader',                  // Spieler-Tab: Kader oder Karten
  me: null, pin: null, guest: false,   // Anmeldung (siehe init)
  cmDraft: {}
};
const EMOJIS = ['🔥', '😂', '👏', '🤡'];   // nur für Reaktionen
/* Icons im Stil der Navigationsleiste (Linien, runde Enden) */
const svgI = (d, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const STAR_D = '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>';
const I = {
  crown: svgI('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/>', 'crown-i'),
  card: svgI('<path d="M6 2.5h12l1.5 3v12.5L12 22l-7.5-4V5.5z"/><path d="M8 7.5h2.5M8 10h2.5"/><circle cx="14.5" cy="9" r="2"/><path d="M8 15.5h8"/>'),
  star: svgI(STAR_D, 'star'),
  starOn: svgI(STAR_D, 'star on'),
  news: svgI('<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5z"/><path d="M17 9h3v10a2 2 0 0 1-2 2"/><path d="M7 9h7M7 13h7M7 17h4"/>'),
  flame: svgI('<path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.1 2.2-5.1 3.6-7.4.3 1.7 1.2 2.9 2.4 3.5C11 7.4 12.4 4.8 15 3c-.3 2.8.9 4.8 2.3 6.6 1 1.3 1.7 2.8 1.7 4.8 0 3.8-3.1 6.6-7 6.6z"/><path d="M12 21c-1.7 0-3-1.2-3-2.9 0-1.6 1.3-2.6 2.1-3.9.9 1.1 2 1.8 2.8 2.7.6.6 1.1 1.3 1.1 2.2 0 1-1.3 1.9-3 1.9z"/>', 'flame'),
  share: svgI('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  refresh: svgI('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  copy: svgI('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  lock: svgI('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  edit: svgI('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  trash: svgI('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  eye: svgI('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svgI('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.6-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  heart: svgI('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', 'heart'),
  heartOn: svgI('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', 'heart on'),
  send: svgI('<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>'),
  comment: svgI('<path d="M5 18l-1 3 4-2h9a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v9"/>'),
  ball: svgI('<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/>'),
  save: svgI('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="5" rx="1"/>')
};
let D = null; // Daten

/* ---------- Spieler & Bilder ---------- */
const byId = {};
function player(id) { return byId[id] || { id, name: id || '?', missing: true }; }
function initialsSvg(name) {
  const ini = String(name).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1d3f75"/><text x="50" y="62" font-family="Arial" font-weight="700" font-size="38" fill="#fff" text-anchor="middle">${ini}</text></svg>`);
}
const face = id => `img/f/${id}.jpg`;
const portrait = id => `img/p/${id}.jpg`;
const imgTag = (src, id, cls = '') => `<img src="${src}" alt="" data-fb="${esc(player(id).name)}" ${cls ? `class="${cls}"` : ''}>`;
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName === 'IMG' && t.dataset.fb && !t.dataset.done) { t.dataset.done = 1; t.src = initialsSvg(t.dataset.fb); }
}, true);
const short = id => { const n = player(id).name.split(' '); return n.length > 1 ? n[0] + ' ' + n.slice(1).join(' ')[0] + '.' : n[0]; };

/* ---------- Monate ---------- */
function monthLabel(m, withYear = true) { const [y, mm] = m.split('-').map(Number); return MONTHS[mm - 1] + (withYear ? ' ' + y : ''); }
function shiftMonth(m, n) { const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 1 + n, 1); return isoDate(d).slice(0, 7); }
function firstMonth() { return D.games.length ? D.games[0].date.slice(0, 7) : THIS_MONTH; }
function voteWindow(m) {
  const [y, mm] = m.split('-').map(Number);
  const close = new Date(y, mm, CONFIG.VOTE_DAYS_AFTER_MONTH, 23, 59, 59);
  return { open: TODAY >= new Date(y, mm - 1, 1) && TODAY <= close, closed: TODAY > close, close };
}

/* ---------- Statistik ---------- */
function gamesIn(scope, m) { return scope === 'all' ? D.games : D.games.filter(g => g.date.startsWith(m)); }
function computeStats(games) {
  const st = {};
  const get = id => st[id] || (st[id] = { id, g: 0, a: 0, gp: 0 });
  games.forEach(g => {
    const inGame = new Set();
    g.goals.forEach(x => { get(x.s).g++; inGame.add(x.s); if (x.a) { get(x.a).a++; inGame.add(x.a); } });
    inGame.forEach(id => get(id).gp++);
  });
  return st;
}
function ranked(st, key) {
  const val = s => key === 'p' ? s.g + s.a : s[key];
  const list = Object.values(st).filter(s => val(s) > 0 && byId[s.id])
    .sort((a, b) => val(b) - val(a) || (key === 'g' ? b.a - a.a : b.g - a.g) || player(a.id).name.localeCompare(player(b.id).name));
  let rank = 0, prev = null;
  return list.map((s, i) => { const v = val(s); if (v !== prev) { rank = i + 1; prev = v; } return { id: s.id, v, rank, s }; });
}
/* Serien: Spiele in Folge mit Tor (bzw. mit Scorerpunkt). Kein Training = Serie reißt. */
let _memo = { key: '', streak: {}, fifa: {} };
/* Teams: Alt gegen Jung. Spiele ohne Teams (z. B. Altdaten) zählen für alle als "dabei". */
const TEAMS = { alt: { name: 'Team Alt', short: 'Alt', ic: '' }, jung: { name: 'Team Jung', short: 'Jung', ic: '' } };
const hasTeams = g => !!(g.teams && ((g.teams.alt || []).length || (g.teams.jung || []).length));
const teamOf = (g, id) => !hasTeams(g) ? null : g.teams.alt.includes(id) ? 'alt' : g.teams.jung.includes(id) ? 'jung' : null;
const played = (g, id) => !hasTeams(g) || !!teamOf(g, id);
const winnerOf = g => g.result?.winner || null;
function liveScore(g) { const sc = { alt: 0, jung: 0 }; g.goals.forEach(x => { const t = teamOf(g, x.s); if (t) sc[t]++; }); return sc; }
function scoreOf(g) { return g.result ? { alt: g.result.alt, jung: g.result.jung } : hasTeams(g) ? liveScore(g) : null; }
function recordOf(id, games = D.games) {
  const r = { w: 0, d: 0, l: 0, n: 0, alt: 0, jung: 0 };
  games.forEach(g => { const t = teamOf(g, id), w = winnerOf(g); if (!t || !w) return; r.n++; r[t]++; if (w === 'draw') r.d++; else if (w === t) r.w++; else r.l++; });
  r.pct = r.n ? Math.round(r.w / r.n * 100) : 0;
  return r;
}
const resultTxt = g => { const w = winnerOf(g); return w === 'draw' ? 'Unentschieden' : w ? `Sieg ${TEAMS[w].short}` : ''; };
function memoKey() { return D.games.length + '|' + (D.games.at(-1)?.id || '') + '|' + D.games.reduce((n, g) => n + g.goals.length, 0) + '|' + D.players.length + '|' + D.games.filter(hasTeams).length + '|' + JSON.stringify(D.ratings?.agg || {}).length + '|' + D.players.map(p => p.base ? [p.base.tem, p.base.dri, p.base.abw].join(',') : '').join(';'); }
function memo() { const k = memoKey(); if (_memo.key !== k) _memo = { key: k, streak: {}, fifa: {} }; return _memo; }
function streakOf(id) {
  const m = memo(); if (m.streak[id]) return m.streak[id];
  let cur = 0, best = 0, curP = 0, bestP = 0;
  D.games.forEach(g => {
    if (!played(g, id)) return;              // nicht dabei → Serie reißt nicht
    const sc = g.goals.some(x => x.s === id), pt = sc || g.goals.some(x => x.a === id);
    cur = sc ? cur + 1 : 0; best = Math.max(best, cur);
    curP = pt ? curP + 1 : 0; bestP = Math.max(bestP, curP);
  });
  return (m.streak[id] = { cur, best, curP, bestP });
}
const fire = id => { const n = streakOf(id).cur; return n >= 3 ? ` <span class="fire" title="${n} Spiele in Folge mit Tor">${I.flame}${n}</span>` : ''; };
function formOf(id, n = 5) { return D.games.filter(g => played(g, id)).slice(-n).map(g => ({ date: g.date, g: g.goals.filter(x => x.s === id).length, a: g.goals.filter(x => x.a === id).length })); }
/* Alte Tore/Assists aus der Tabelle (Spalten "Tore vorher"/"Assists vorher") – nur für Gesamtzahlen, nie für Statistiken */
function withPrev(st) {
  const o = {};
  Object.values(st).forEach(x => o[x.id] = { ...x });
  D.players.forEach(p => { if (!p.prevG && !p.prevA) return; const x = o[p.id] || (o[p.id] = { id: p.id, g: 0, a: 0, gp: 0 }); x.g += p.prevG || 0; x.a += p.prevA || 0; });
  return o;
}

/* Spielerkarte: 3 Team-Werte. Startwert aus der Tabelle zählt wie BASE_WEIGHT Bewertungen, jede Bewertung der Mannschaft fließt sofort ein. */
const BASE_WEIGHT = 3;
function teamVals(id) {
  const p = player(id), a = D.ratings?.agg?.[id], b = p.base || {};
  const hasBase = b.tem != null || b.dri != null || b.abw != null;
  const start = k => b[k] != null ? b[k] : 50;
  const val = k => a && a.n ? Math.round((start(k) * BASE_WEIGHT + a[k] * a.n) / (BASE_WEIGHT + a.n)) : start(k);
  return { TEM: val('tem'), DRI: val('dri'), ABW: val('abw'), n: a?.n || 0, src: a?.n ? 'mix' : hasBase ? 'start' : 'none' };
}
function statRaw(games) {
  const st = computeStats(games), out = {};
  D.players.forEach(p => {
    const mine = games.filter(g => played(g, p.id)), n = mine.length, s = st[p.id] || { g: 0, a: 0 };
    const form = mine.slice(-5).reduce((t, g) => t + g.goals.filter(x => x.s === p.id).length + g.goals.filter(x => x.a === p.id).length, 0);
    out[p.id] = { n, TOR: n ? s.g / n : 0, VOR: n ? s.a / n : 0, FRM: form, totG: s.g + (p.prevG || 0), totA: s.a + (p.prevA || 0) };
  });
  return out;
}
function fifaOf(id, games = D.games) {
  const live = games === D.games, m = memo();
  if (live && m.fifa[id]) return m.fifa[id];
  const raw = live ? (m.raw ||= statRaw(games)) : statRaw(games);
  const minN = Math.min(3, Math.max(1, ...Object.values(raw).map(r => r.n)));
  const pool = Object.values(raw).filter(r => r.n >= minN), all = Object.values(raw);
  const me = raw[id] || { n: 0, TOR: 0, VOR: 0, FRM: 0, totG: 0, totA: 0 }, out = {};
  const rel = (v, list) => { const max = Math.max(0, ...list); return max > 0 ? Math.min(1, v / max) : 0; };
  const sc = x => Math.round(45 + 54 * Math.sqrt(x));
  // TOR/VOR: halb pro Spiel (nur App-Spiele), halb Gesamtmenge inkl. alter Tore/Assists
  out.TOR = sc(0.5 * rel(me.TOR, pool.map(r => r.TOR)) + 0.5 * rel(me.totG, all.map(r => r.totG)));
  out.VOR = sc(0.5 * rel(me.VOR, pool.map(r => r.VOR)) + 0.5 * rel(me.totA, all.map(r => r.totA)));
  out.FRM = sc(rel(me.FRM, pool.map(r => r.FRM)));
  const tv = teamVals(id);
  Object.assign(out, { TEM: tv.TEM, DRI: tv.DRI, ABW: tv.ABW, src: tv.src, votes: tv.n, games: me.n });
  out.OVR = Math.round((out.TEM + out.DRI + out.ABW + out.TOR + out.VOR + out.FRM) / 6);
  out.tier = out.OVR >= 80 ? 'gold' : out.OVR >= 65 ? 'silver' : 'bronze';
  if (live) m.fifa[id] = out;
  return out;
}
// Veränderung der Gesamtwertung gegenüber vor 7 Tagen
function trendOf(id) {
  const d = new Date(TODAY); d.setDate(d.getDate() - 7);
  const older = D.games.filter(g => g.date <= isoDate(d));
  if (!older.length || older.length === D.games.length || !older.some(g => played(g, id))) return 0;
  return fifaOf(id).OVR - fifaOf(id, older).OVR;
}
// Sonderkarten: Spieler des Monats > In Form (bester Scorer im letzten Spiel, ab 2 Punkten) > Traumtor (meiste Tore des Spiels)
function inFormIds() {
  const g = D.games.at(-1); if (!g) return [];
  const pts = {}; g.goals.forEach(x => { pts[x.s] = (pts[x.s] || 0) + 1; if (x.a) pts[x.a] = (pts[x.a] || 0) + 1; });
  const max = Math.max(0, ...Object.values(pts));
  return max >= 2 ? Object.keys(pts).filter(k => pts[k] === max) : [];
}
function dreamKing() {
  const c = {}, last = {};
  D.games.forEach((g, i) => g.goals.forEach(x => { if (x.best) { c[x.s] = (c[x.s] || 0) + 1; last[x.s] = i; } }));
  const ids = Object.keys(c).filter(k => byId[k]);
  return ids.length ? ids.sort((a, b) => c[b] - c[a] || last[b] - last[a])[0] : null;
}
function latestFlop() {
  for (let m = shiftMonth(THIS_MONTH, -1), i = 0; i < 24; i++, m = shiftMonth(m, -1)) { const f = flopOf(m); if (f) return f; }
  return null;
}
function specialOf(id) {
  const pm = latestPotm(); if (pm && pm.id === id) return 'potm';
  const fl = latestFlop(); if (fl && fl.id === id) return 'flop';
  if (inFormIds().includes(id)) return 'inform';
  if (dreamKing() === id) return 'dream';
  return null;
}
const CARD_STYLE = {
  gold:   { g: ['#f7e08a', '#c89b2c', '#7a5a10'], stroke: '#fff6d0', ink: '#2a1d00' },
  silver: { g: ['#f4f7fa', '#b7c1cc', '#6d7785'], stroke: '#ffffff', ink: '#1c232c' },
  bronze: { g: ['#f1c9a0', '#c07a45', '#6e3e1c'], stroke: '#ffe3c8', ink: '#2b1606' },
  inform: { g: ['#2c2614', '#15120a', '#0b0905'], stroke: '#d9ad55', ink: '#f7e08a', stripes: '#d9ad55', tag: 'In Form' },
  potm:   { g: ['#7b3fd1', '#3c1a6e', '#e10026'], stroke: '#e7d4ff', ink: '#ffffff', tag: 'Spieler des Monats' },
  dream:  { g: ['#5de0e6', '#1b6fb8', '#0b2350'], stroke: '#c8f6ff', ink: '#ffffff', tag: 'Traumtor' },
  flop:   { g: ['#b9e08f', '#5f8f3a', '#26401a'], stroke: '#e4f7cf', ink: '#ffffff', tag: 'Flop des Monats' },
  back:   { g: ['#0e3a78', '#0a2b5c', '#061a3a'], stroke: '#5db7ff', ink: '#ffffff' }
};
const SHIELD = 'M30 3H240L267 30V338L152 399Q135 408 118 399L3 338V30Z';   // flache, leicht abgerundete Spitze
const shieldUri = svg => `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;   // einfache Anführungszeichen – steht in style="…"
function shieldBg(c) {
  // weiche Lichtbahnen statt harter Streifen
  const stripes = c.stripes ? `<rect width="270" height="410" fill="url(#s)" clip-path="url(#c)"/>` : '';
  const sdef = c.stripes ? `<linearGradient id="s" x1="0" y1="0" x2="1" y2=".45"><stop offset="0" stop-color="${c.stripes}" stop-opacity="0"/><stop offset=".22" stop-color="${c.stripes}" stop-opacity=".16"/><stop offset=".4" stop-color="${c.stripes}" stop-opacity="0"/><stop offset=".62" stop-color="${c.stripes}" stop-opacity=".12"/><stop offset=".85" stop-color="${c.stripes}" stop-opacity="0"/></linearGradient>` : '';
  return shieldUri(`<svg xmlns="http://www.w3.org/2000/svg" width="270" height="410" viewBox="0 0 270 410"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.g[0]}"/><stop offset=".55" stop-color="${c.g[1]}"/><stop offset="1" stop-color="${c.g[2]}"/></linearGradient>${sdef}<clipPath id="c"><path d="${SHIELD}"/></clipPath></defs><path d="${SHIELD}" fill="url(#g)"/>${stripes}<path d="${SHIELD}" fill="none" stroke="${c.stroke}" stroke-opacity=".65" stroke-width="4"/></svg>`);
}
const SHIELD_MASK = shieldUri(`<svg xmlns="http://www.w3.org/2000/svg" width="270" height="410" viewBox="0 0 270 410"><path d="${SHIELD}" fill="#000"/></svg>`);
function cardHtml(id, opts = {}) {
  const p = player(id), f = fifaOf(id), sp = specialOf(id), type = sp || f.tier, c = CARD_STYLE[type];
  const last = p.name.split(' ').slice(1).join(' ') || p.name;
  const tr = opts.mini ? 0 : trendOf(id);
  const row = (a, b) => `<div><span>${a}</span><b>${f[a]}</b></div><div><span>${b}</span><b>${f[b]}</b></div>`;
  return `<div class="fc t-${type}" style="--ink:${c.ink};background-image:${shieldBg(c)}">
    ${c.tag ? `<span class="fc-tag">${c.tag}</span>` : ''}
    <div class="fc-top"><div class="fc-side"><div class="ovr">${f.OVR}</div><div class="pos">${esc(p.pos || (p.no != null ? '#' + p.no : p.role ? 'TR' : ''))}</div>
      ${tr ? `<div class="trend ${tr > 0 ? 'up' : 'down'}">${tr > 0 ? '▲' : '▼'} ${Math.abs(tr)}</div>` : ''}<img src="img/crest.png" alt="" class="crest"></div>
      <div class="fc-img" style="background-image:url('${portrait(id)}')"></div></div>
    <div class="fc-name">${esc(last)}</div>
    <div class="fc-stats">${row('TEM', 'TOR')}${row('DRI', 'VOR')}${row('ABW', 'FRM')}</div>
    <div class="fc-foot">${p.no != null && p.pos ? '#' + p.no + ' · ' : ''}H2Ku</div>
    <div class="fc-shine" style="-webkit-mask-image:${SHIELD_MASK};mask-image:${SHIELD_MASK}"></div>
  </div>`;
}
function cardBack(id) {
  const f = fifaOf(id), r = recordOf(id), sk = streakOf(id), tot = withPrev(computeStats(D.games))[id] || { g: 0, a: 0 };
  const tds = D.games.filter(g => g.goals.some(x => x.best && x.s === id)).length;
  const from = {}; D.games.forEach(g => g.goals.forEach(x => { if (x.s === id && x.a) from[x.a] = (from[x.a] || 0) + 1; }));
  const fav = Object.entries(from).sort((a, b) => b[1] - a[1])[0];
  const src = f.src === 'mix' ? `${f.src === 'mix' && player(id).base ? 'Start + ' : ''}${f.votes} Bewertung${f.votes === 1 ? '' : 'en'}` : f.src === 'start' ? 'Startwerte' : 'offen';
  const li = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
  return `<div class="fc t-back" style="--ink:#fff;background-image:${shieldBg(CARD_STYLE.back)}">
    <div class="fc-back-h">${esc(player(id).name)}</div>
    <div class="fc-back">
      ${li('Tore gesamt', tot.g)}${li('Assists gesamt', tot.a)}${li('Spiele dabei', f.games)}
      ${r.n ? li('Bilanz S-U-N', `${r.w}-${r.d}-${r.l} · ${r.pct} %`) : ''}
      ${li('Rekord-Serie', sk.best + ' Spiele')}${li('Tore des Spiels', tds)}
      ${fav ? li('Top-Vorlagengeber', esc(short(fav[0])) + ' (' + fav[1] + ')') : ''}
      ${li('Team-Werte', src)}
    </div>
    <div class="fc-foot">Tippen zum Umdrehen</div>
  </div>`;
}
function canRate(id) { const p = player(id); return !!S.me && S.me !== id && !p.guest && p.active !== false && !p.missing; }

function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'gerade eben'; if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`; if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const d = Math.floor(s / 86400); return d === 1 ? 'gestern' : d < 7 ? `vor ${d} Tagen` : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
function flopOf(m) {
  if (!voteWindow(m).closed) return null;
  const r = voteResult(m, 'flop');
  return r.winner && byId[r.winner.id] ? { id: r.winner.id, votes: r.winner.n, total: r.total, month: m } : null;
}

function voteResult(m, type = 'potm') {
  const votes = D.votes.filter(v => v.month === m && (v.type || 'potm') === type);
  const c = {};
  votes.filter(v => v.pick).forEach(v => c[v.pick] = (c[v.pick] || 0) + 1);
  const list = Object.entries(c).map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n);
  return { total: votes.length, list, winner: list[0] && (!list[1] || list[1].n < list[0].n) ? list[0] : list[0] };
}
function potmOf(m) {
  if (!voteWindow(m).closed) return null;
  const r = voteResult(m);
  return r.winner ? { id: r.winner.id, votes: r.winner.n, total: r.total, month: m } : null;
}
function latestPotm() {
  for (let m = shiftMonth(THIS_MONTH, -1), i = 0; i < 24; i++, m = shiftMonth(m, -1)) { const p = potmOf(m); if (p) return p; }
  return null;
}

/* ============================================================
   RENDER
   ============================================================ */
const views = { home: viewHome, players: viewPlayers, games: viewGames, month: viewMonth, admin: viewAdmin };
function render(anim = false) {
  const main = $('#main');
  main.innerHTML = `<div class="${anim ? 'view' : ''}">${views[S.tab]()}</div>`;
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  $('.save-bar')?.remove();
  if (S.tab === 'admin' && S.pw) renderSaveBar();
  afterRender(main);
}
function afterRender(root) {
  requestAnimationFrame(() => {
    root.querySelectorAll('[data-w]').forEach(el => el.style.width = el.dataset.w + '%');
    root.querySelectorAll('.seg').forEach(placeKnob);
    root.querySelectorAll('[data-count]').forEach(countUp);
  });
}
function placeKnob(seg) {
  const on = seg.querySelector('button.on'), k = seg.querySelector('.knob');
  if (!on || !k) return;
  k.style.width = on.offsetWidth + 'px';
  k.style.transform = `translateX(${on.offsetLeft - 4}px)`;
}
function countUp(el) {
  const to = parseFloat(el.dataset.count), dec = el.dataset.dec ? 1 : 0, t0 = performance.now(), dur = 700;
  const fmt = v => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  let done = false;
  const step = t => { if (done) return; const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); else done = true; };
  requestAnimationFrame(step);
  setTimeout(() => { done = true; el.textContent = fmt(to); }, dur + 150); // Endwert garantiert
}
const seg = (act, items, cur, cls = '') => `<div class="seg ${cls}"><span class="knob"></span>${items.map(([v, l]) => `<button data-act="${act}" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
function monthStepper() {
  const min = firstMonth();
  const games = gamesIn('month', S.month).length;
  return `<div class="month-step">
    <button data-act="month" data-v="-1" ${S.month <= min ? 'disabled' : ''} aria-label="Vormonat">‹</button>
    <div class="m">${monthLabel(S.month)}<small>${games} ${games === 1 ? 'Spiel' : 'Spiele'}</small></div>
    <button data-act="month" data-v="1" ${S.month >= THIS_MONTH ? 'disabled' : ''} aria-label="Nächster Monat">›</button></div>`;
}
const demoPill = () => D.demo && !Store.online ? `<div class="demo-pill">Prototyp mit Beispieldaten</div>` : '';

/* ---------- ÜBERSICHT ---------- */
function viewHome() {
  const games = gamesIn(S.scope, S.month);
  const st = S.scope === 'all' ? withPrev(computeStats(games)) : computeStats(games);
  const goals = games.reduce((s, g) => s + g.goals.length, 0);
  const assisted = games.reduce((s, g) => s + g.goals.filter(x => x.a).length, 0);
  const potm = S.scope === 'month' ? potmOf(S.month) : latestPotm();
  let html = demoPill() + `<div class="card" style="padding:12px">${seg('scope', [['all', 'Gesamt'], ['month', 'Monat']], S.scope)}${S.scope === 'month' ? monthStepper() : ''}</div>`;
  if (potm) html += `<div class="card potm" data-act="profile" data-id="${potm.id}">${imgTag(face(potm.id), potm.id)}<div><div class="lbl">Spieler des Monats · ${monthLabel(potm.month, false)}</div><div class="nm">${esc(player(potm.id).name)}</div><div class="sm">${potm.votes} von ${potm.total} Stimmen</div></div></div>`;
  html += `<div class="kpis">
    <div class="kpi"><b data-count="${games.length}">0</b><span>Spiele</span></div>
    <div class="kpi"><b data-count="${goals + (S.scope === 'all' ? D.players.reduce((n, p) => n + (p.prevG || 0), 0) : 0)}">0</b><span>Tore</span></div>
    <div class="kpi"><b data-count="${games.length ? (goals / games.length).toFixed(1) : 0}" data-dec="1">0</b><span>Tore/Spiel</span></div>
    <div class="kpi"><b>${goals ? Math.round(assisted / goals * 100) : 0}%</b><span>mit Assist</span></div></div>`;
  if (!games.length) return html + `<div class="card"><div class="empty" style="text-align:center;padding:30px 0">Noch keine Spiele ${S.scope === 'month' ? 'in diesem Monat' : ''} eingetragen.<br>Tore werden über <b>Eintragen</b> erfasst.</div></div>`;
  html += leaderCard('g', '', 'Torjäger', st, 'Tore', 'var(--red)');
  html += leaderCard('a', '', 'Vorlagenkönige', st, 'Assists', 'var(--sky)');
  html += duelCard(games);
  html += highlights(games, st);
  html += installHint();
  return html;
}
function leaderCard(key, ic, title, st, unit, color) {
  const list = ranked(st, key);
  const top = list.slice(0, 3);
  const pod = (e, cls) => e ? `<div class="pod ${cls} pop" data-act="profile" data-id="${e.id}" style="animation-delay:${cls === 'p1' ? .05 : cls === 'p2' ? .15 : .25}s">
      <div class="face">${cls === 'p1' ? `<span class="crown">${I.crown}</span>` : ''}${imgTag(face(e.id), e.id)}<span class="rk">${e.rank}</span></div>
      <div class="nm">${esc(player(e.id).name)}${fire(e.id)}</div><div class="val">${e.v}<small>${unit}</small></div><div class="block"></div></div>` : `<div class="pod ${cls} empty"></div>`;
  const rest = list.slice(3);
  const open = S.showAll[key];
  const shown = open ? rest : rest.slice(0, 5);
  const max = list[0]?.v || 1;
  return `<div class="card"><div class="card-h"><h2>${ic ? `<span class="ic">${ic}</span>` : ''}${title}</h2><span class="meta">${list.length} Spieler</span></div>
    <div class="podium">${pod(top[1], 'p2')}${pod(top[0], 'p1')}${pod(top[2], 'p3')}</div>
    ${shown.length ? `<ul class="rank" style="--bc:${color}">${shown.map(e => `<li data-act="profile" data-id="${e.id}"><span class="n">${e.rank}</span>${imgTag(face(e.id), e.id)}<div class="who"><b>${esc(player(e.id).name)}${fire(e.id)}</b><div class="bar"><i data-w="${Math.round(e.v / max * 100)}"></i></div></div><span class="v">${e.v}</span></li>`).join('')}</ul>` : ''}
    ${rest.length > 5 ? `<button class="more-btn" data-act="more" data-v="${key}">${open ? 'Weniger anzeigen ▲' : `Alle ${list.length} anzeigen ▼`}</button>` : ''}</div>`;
}
function duelCard(games) {
  const tg = games.filter(winnerOf);
  if (!tg.length) return '';
  const d = { alt: 0, jung: 0, draw: 0 }, goals = { alt: 0, jung: 0 };
  tg.forEach(g => { d[winnerOf(g)]++; const sc = scoreOf(g); goals.alt += sc.alt; goals.jung += sc.jung; });
  const lead = d.alt > d.jung ? 'alt' : d.jung > d.alt ? 'jung' : null;
  const min = Math.min(3, tg.length);
  const types = D.players.map(p => ({ id: p.id, r: recordOf(p.id, games) })).filter(x => x.r.n >= min && x.r.w > 0)
    .sort((a, b) => b.r.pct - a.r.pct || b.r.w - a.r.w || a.r.l - b.r.l).slice(0, 5);
  const chip = g => { const w = winnerOf(g), sc = scoreOf(g); return `<span class="rchip ${w}" title="${new Date(g.date + 'T12:00').toLocaleDateString('de-DE')}">${w === 'draw' ? 'U' : TEAMS[w].short[0]}<small>${sc.alt}:${sc.jung}</small></span>`; };
  return `<div class="card"><div class="card-h"><h2>Alt gegen Jung</h2><span class="meta">${tg.length} Spiele</span></div>
    <div class="duel">
      <div class="dt alt ${lead === 'alt' ? 'lead' : ''}"><b>${d.alt}</b><small>Siege Alt</small></div>
      <div class="dm"><b>${d.draw}</b><small>Unentsch.</small></div>
      <div class="dt jung ${lead === 'jung' ? 'lead' : ''}"><b>${d.jung}</b><small>Siege Jung</small></div>
    </div>
    <div class="duel-bar"><i class="alt" style="flex:${d.alt || .001}"></i><i class="draw" style="flex:${d.draw || .001}"></i><i class="jung" style="flex:${d.jung || .001}"></i></div>
    <div class="duel-sub">Tore: <b>${goals.alt}</b> Alt · <b>${goals.jung}</b> Jung · Letzte Spiele: ${tg.slice(-6).map(chip).join('')}</div>
    ${types.length ? `<div class="sec-title" style="margin:14px 0 4px">Siegertypen</div><ul class="rank" style="--bc:var(--gold)">${types.map((x, i) => `<li data-act="profile" data-id="${x.id}"><span class="n">${i + 1}</span>${imgTag(face(x.id), x.id)}<div class="who"><b>${esc(player(x.id).name)}</b><div class="bar"><i data-w="${x.r.pct}"></i></div></div><span class="v" style="font-size:18px">${x.r.pct}%<small style="display:block;font:500 10px var(--font);color:var(--muted)">${x.r.w}-${x.r.d}-${x.r.l}</small></span></li>`).join('')}</ul>
      <div class="empty">Siegquote = gewonnene Spiele, in denen man dabei war (S-U-N). Ab ${min} Spielen mit Team.</div>` : ''}
  </div>`;
}
function highlights(games, st) {
  const pairs = {};
  games.forEach(g => g.goals.forEach(x => { if (x.a) { const k = x.a + '>' + x.s; pairs[k] = (pairs[k] || 0) + 1; } }));
  const duo = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
  let best = null;
  games.forEach(g => { const c = {}; g.goals.forEach(x => c[x.s] = (c[x.s] || 0) + 1); Object.entries(c).forEach(([id, n]) => { if (!best || n > best.n) best = { id, n, date: g.date }; }); });
  const pts = ranked(st, 'p')[0];
  const last = D.games[D.games.length - 1];
  const lastTop = last && Object.entries(last.goals.reduce((c, x) => (c[x.s] = (c[x.s] || 0) + 1, c), {})).sort((a, b) => b[1] - a[1])[0];
  const dd = iso => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  let h = `<div class="card"><div class="card-h"><h2>Highlights</h2></div><div class="hl-grid">`;
  if (duo) { const [a, s] = duo[0].split('>'); h += `<div class="hl" data-act="profile" data-id="${s}"><div class="lbl">Top-Duo</div><div class="duo">${imgTag(face(a), a)}${imgTag(face(s), s)}</div><div class="big">${duo[1]}×</div><div class="sm">${esc(short(a))} → ${esc(short(s))}</div></div>`; }
  if (pts) h += `<div class="hl" data-act="profile" data-id="${pts.id}"><div class="lbl">Scorer-König</div><div class="duo">${imgTag(face(pts.id), pts.id)}</div><div class="big">${pts.v} Pkt.</div><div class="sm">${esc(short(pts.id))} · ${pts.s.g} T + ${pts.s.a} A</div></div>`;
  if (best) h += `<div class="hl" data-act="profile" data-id="${best.id}"><div class="lbl">Bestes Einzelspiel</div><div class="duo">${imgTag(face(best.id), best.id)}</div><div class="big">${best.n} Tore</div><div class="sm">${esc(short(best.id))} · ${dd(best.date)}</div></div>`;
  const hot = D.players.map(p => ({ id: p.id, ...streakOf(p.id) })).filter(x => x.cur >= 2).sort((a, b) => b.cur - a.cur)[0];
  const rec = D.players.map(p => ({ id: p.id, ...streakOf(p.id) })).filter(x => x.best >= 2).sort((a, b) => b.best - a.best)[0];
  if (hot) h += `<div class="hl" data-act="profile" data-id="${hot.id}"><div class="lbl">Heißeste Serie</div><div class="duo">${imgTag(face(hot.id), hot.id)}</div><div class="big">${I.flame} ${hot.cur} Spiele</div><div class="sm">${esc(short(hot.id))} trifft und trifft</div></div>`;
  if (rec && (!hot || rec.id !== hot.id || rec.best > hot.cur)) h += `<div class="hl" data-act="profile" data-id="${rec.id}"><div class="lbl">Rekord-Serie</div><div class="duo">${imgTag(face(rec.id), rec.id)}</div><div class="big">${rec.best} in Folge</div><div class="sm">${esc(short(rec.id))} · Spiele mit Tor</div></div>`;
  const lastBest = D.games.slice().reverse().map(g => ({ g, x: g.goals.find(x => x.best) })).find(o => o.x);
  if (lastBest) h += `<div class="hl" data-act="open-game" data-id="${lastBest.g.id}"><div class="lbl">${I.starOn} Tor des Spiels</div><div class="duo">${imgTag(face(lastBest.x.s), lastBest.x.s)}</div><div class="big" style="font-size:19px">${esc(short(lastBest.x.s))}</div><div class="sm">${lastBest.x.note ? '„' + esc(lastBest.x.note) + '“' : new Date(lastBest.g.date + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div></div>`;
  if (last) h += `<div class="hl" data-act="open-game" data-id="${last.id}"><div class="lbl">Letztes Spiel</div><div class="big" style="margin-top:8px">${winnerOf(last) ? `${scoreOf(last).alt} : ${scoreOf(last).jung}` : last.goals.length + ' Tore'}</div><div class="sm">${new Date(last.date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}${lastTop ? ` · Top: ${esc(short(lastTop[0]))} (${lastTop[1]})` : ''}</div></div>`;
  return h + `</div></div>`;
}
function installHint() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone || ls.get('h2ku-install-hide', false)) return '';
  return `<div class="card install"><img src="img/icon-192.png" alt=""><div class="t"><b>Als App aufs Handy</b>Schneller Zugriff vom Homescreen, im Vollbild.</div><button class="btn sm gold" style="width:auto" data-act="install">Zeigen</button></div>`;
}

/* ---------- SPIELER ---------- */
function viewPlayers() {
  const st = withPrev(computeStats(D.games));
  const q = S.filter.toLowerCase();
  const match = p => p.active && (!q || p.name.toLowerCase().includes(q) || String(p.no ?? '') === q || (p.pos || '').toLowerCase().includes(q));
  const card = p => { const s = st[p.id] || { g: 0, a: 0 }; return `<div class="pcard" data-act="profile" data-id="${p.id}">${imgTag(portrait(p.id), p.id)}${p.role ? `<span class="no tr">${esc(p.role.replace('-Trainer', ''))}</span>` : p.no != null ? `<span class="no">${p.no}</span>` : ''}<div class="ov"><b>${esc(p.name)}</b>${q && p.pos ? `<em class="pp">${esc(p.pos)}</em>` : ''}<span>${s.g} T · ${s.a} A${streakOf(p.id).cur >= 3 ? ' · ' + I.flame + streakOf(p.id).cur : ''}</span></div></div>`; };
  const pl = D.players.filter(p => !p.role && !p.guest && match(p)).sort((a, b) => (a.no ?? 999) - (b.no ?? 999) || a.name.localeCompare(b.name));
  const tr = D.players.filter(p => p.role && !p.guest && match(p));
  const gs = D.players.filter(p => p.guest && match(p));
  const head = `<div class="card" style="padding:12px;margin-bottom:12px">${seg('pview', [['kader', 'Kader'], ['karten', 'Karten']], S.pview)}</div>`;
  if (S.pview === 'karten') {
    const ids = D.players.filter(p => match(p) && !p.guest).map(p => p.id).sort((a, b) => fifaOf(b).OVR - fifaOf(a).OVR || player(a).name.localeCompare(player(b).name));
    return head + `<input class="search" type="search" placeholder="Name, Nummer oder Position suchen" value="${esc(S.filter)}" data-input="filter">
      <div class="gallery">${ids.map(id => `<div class="mini" data-act="fifa" data-id="${id}">${cardHtml(id, { mini: true })}</div>`).join('') || '<div class="empty">Niemand gefunden.</div>'}</div>
      <div class="empty" style="text-align:center;margin-top:8px">Sortiert nach Gesamtwertung. Antippen öffnet die Karte.</div>`;
  }
  return head + `<input class="search" type="search" placeholder="Name, Nummer oder Position suchen" value="${esc(S.filter)}" data-input="filter">
    <div class="pgrid">${pl.map(card).join('')}</div>
    ${tr.length ? `<div class="sec-title">Trainerteam</div><div class="pgrid">${tr.map(card).join('')}</div>` : ''}
    ${gs.length ? `<div class="sec-title">Gäste</div><div class="pgrid">${gs.map(card).join('')}</div>` : ''}
    ${!pl.length && !tr.length && !gs.length ? '<div class="empty">Niemand gefunden.</div>' : ''}
    <div class="sec-title">Mannschaft 2026/27</div><div class="card" style="padding:0;overflow:hidden"><img src="img/team.jpg" alt="Mannschaftsfoto 1. Männer 2026/27" style="width:100%"></div>`;
}

function openProfile(id, dir) {
  const p = player(id);
  const all = withPrev(computeStats(D.games)), s = all[id] || { g: 0, a: 0, gp: 0 };
  const mon = computeStats(gamesIn('month', S.month))[id] || { g: 0, a: 0 };
  const rk = key => { const e = ranked(all, key).find(x => x.id === id); return e ? `#${e.rank} im Team` : ''; };
  const order = D.players.filter(x => x.active).map(x => x.id);
  const i = order.indexOf(id);
  const prev = order[(i - 1 + order.length) % order.length], next = order[(i + 1) % order.length];

  // Partner
  const from = {}, to = {};
  D.games.forEach(g => g.goals.forEach(x => { if (x.s === id && x.a) from[x.a] = (from[x.a] || 0) + 1; if (x.a === id) to[x.s] = (to[x.s] || 0) + 1; }));
  const plist = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pid, n]) => `<div class="partner" data-act="profile" data-id="${pid}">${imgTag(face(pid), pid)}<span>${esc(player(pid).name)}</span><b>${n}</b></div>`).join('') || '<div class="empty">Noch keine</div>';

  // Badges
  const badges = [];
  const months = [...new Set(D.games.map(g => g.date.slice(0, 7)))];
  months.forEach(m => {
    const r = ranked(computeStats(gamesIn('month', m)), 'g');
    if (r[0] && r[0].id === id) badges.push(`Torjäger ${monthLabel(m, false)}`);
    const pm = potmOf(m); if (pm && pm.id === id) badges.push(`Spieler des Monats ${monthLabel(m, false)}`);
  });
  const perGame = D.games.map(g => ({ g, n: g.goals.filter(x => x.s === id).length, a: g.goals.filter(x => x.a === id).length }));
  const hat = perGame.filter(x => x.n >= 3).length;
  if (hat) badges.push(`${hat}× Dreierpack`);
  const tds = D.games.filter(g => g.goals.some(x => x.best && x.s === id)).length;
  if (tds) badges.push(`${tds}× Tor des Spiels`);
  const sk = streakOf(id);
  if (sk.best >= 3) badges.push(`Rekord: ${sk.best} Spiele in Folge`);
  months.forEach(m => { const f = flopOf(m); if (f && f.id === id) badges.push(`Flop ${monthLabel(m, false)}`); });
  const bestGames = perGame.filter(x => x.n + x.a > 0).sort((a, b) => (b.n + b.a) - (a.n + a.a) || b.g.date.localeCompare(a.g.date)).slice(0, 3);

  const body = `<div class="prof-hero">${imgTag(portrait(id), id)}
      <button class="prof-nav l" data-act="profile" data-id="${prev}" data-dir="l" aria-label="Vorheriger">‹</button>
      <button class="prof-nav r" data-act="profile" data-id="${next}" data-dir="r" aria-label="Nächster">›</button>
      <div class="info">${p.no != null ? `<div class="no">#${p.no}</div>` : ''}<h2>${esc(p.name)}</h2><div class="role">${esc(p.guest ? 'Gastspieler' : (p.pos || p.role || 'Spieler') + ' · 1. Männer')}</div></div></div>
    <div class="sheet-body">
      <div class="stat4">
        <div><b data-count="${s.g}">0</b><span>Tore</span><em>${rk('g')}</em></div>
        <div><b data-count="${s.a}">0</b><span>Assists</span><em>${rk('a')}</em></div>
        <div><b data-count="${s.g + s.a}">0</b><span>Punkte</span><em>${rk('p')}</em></div>
        <div><b data-count="${s.gp}">0</b><span>Spiele mit Punkt</span><em>${D.games.length ? Math.round(s.gp / D.games.length * 100) + '%' : ''}</em></div>
      </div>
      <div class="sm" style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${monthLabel(S.month)}: <b style="color:#fff">${mon.g} Tore · ${mon.a} Assists</b></div>
      <div class="btn-row" style="margin-bottom:12px"><button class="btn gold" data-act="fifa" data-id="${id}">${I.card} Spielerkarte</button>${canRate(id) ? `<button class="btn ghost" data-act="rate-open" data-id="${id}" style="flex:.6">Bewerten</button>` : ''}</div>
      <div class="streaks">
        <div class="${sk.cur >= 3 ? 'hot' : ''}"><b>${sk.cur >= 3 ? I.flame + ' ' : ''}${sk.cur}</b><span>Aktuelle Tor-Serie</span></div>
        <div><b>${sk.best}</b><span>Rekord-Serie</span></div>
        <div><b>${sk.curP}</b><span>Serie mit Scorerpunkt</span></div>
      </div>
      ${badges.length ? `<div class="badges">${badges.map(b => `<span class="badge">${esc(b)}</span>`).join('')}</div>` : ''}
      ${(() => { const r = recordOf(id); if (!r.n) return ''; const main = r.alt >= r.jung ? 'alt' : 'jung';
        return `<div class="card rec-card"><div class="card-h"><h2>Bilanz</h2><span class="meta">${r.n} Spiele mit Team</span></div>
          <div class="streaks"><div class="${r.w > r.l ? 'hot' : ''}"><b>${r.w}</b><span>Siege</span></div><div><b>${r.d}</b><span>Unentschieden</span></div><div><b>${r.l}</b><span>Niederlagen</span></div></div>
          <div class="rec-line"><b>${r.pct} %</b> Siegquote · meist ${TEAMS[main].name} (${r[main]}×)</div></div>`; })()}
      <div class="card"><div class="card-h"><h2>Formkurve</h2><span class="meta">letzte ${Math.min(5, D.games.length)} Spiele</span></div>${formChart(id)}</div>
      <div class="card"><div class="card-h"><h2>Verlauf</h2><span class="meta">pro Monat</span></div>${monthChart(id)}</div>
      <div class="card"><div class="partners"><div><h4>Vorlagen von</h4>${plist(from)}</div><div><h4>Legt auf für</h4>${plist(to)}</div></div></div>
      <div class="card"><div class="card-h"><h2>Beste Spiele</h2></div>${bestGames.length ? bestGames.map(x => `<div class="partner"><span>${new Date(x.g.date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}</span><b style="font-size:15px">${x.n} T · ${x.a} A</b></div>`).join('') : '<div class="empty">Noch keine Scorerpunkte</div>'}</div>
    </div>`;
  openSheet(body, 'profile', dir);
}

function formChart(id) {
  const data = formOf(id);
  if (!data.length) return '<div class="empty">Noch keine Spiele.</div>';
  const pts = data.reduce((t, x) => t + x.g + x.a, 0), rating = fifaOf(id).FRM;
  const label = rating >= 90 ? 'Top-Form' : rating >= 75 ? 'Gute Form' : rating >= 60 ? 'Durchwachsen' : 'Eiskalt';
  const max = Math.max(1, ...data.map(x => x.g + x.a));
  const W = 340, H = 130, base = 104, top = 16, gw = W / data.length, bw = Math.min(34, gw * .5);
  const y = v => base - (v / max) * (base - top);
  const bars = data.map((d, i) => {
    const x = gw * i + (gw - bw) / 2, yg = y(d.g), ya = y(d.g + d.a), tot = d.g + d.a;
    const dt = new Date(d.date + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return `<g class="cg" data-tip="${dt}: ${d.g} Tore · ${d.a} Assists" data-x="${x + bw / 2}"><rect x="${gw * i}" y="0" width="${gw}" height="${H}" fill="transparent"/>
      ${d.g ? `<rect x="${x}" y="${yg}" width="${bw}" height="${base - yg}" rx="4" fill="var(--red)"/>` : ''}
      ${d.a ? `<rect x="${x}" y="${ya}" width="${bw}" height="${Math.max(2, yg - ya - (d.g ? 2 : 0))}" rx="4" fill="var(--sky)"/>` : ''}
      ${tot ? `<text x="${x + bw / 2}" y="${ya - 5}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${tot}</text>` : `<circle cx="${x + bw / 2}" cy="${base - 4}" r="3" fill="var(--faint)"/>`}
      <text x="${x + bw / 2}" y="${base + 18}" text-anchor="middle" font-size="11" fill="var(--muted)">${dt}</text></g>`;
  }).join('');
  return `<div class="form-head"><span class="form-lbl">${label}</span><span class="meta">${pts} Punkte · Formwert ${rating}</span></div>
    <div class="chart"><div class="legend"><span><i style="background:var(--red)"></i>Tore</span><span><i style="background:var(--sky)"></i>Assists</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Punkte in den letzten Spielen"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="rgba(255,255,255,.15)"/>${bars}</svg></div>`;
}
function openFifa(id) {
  const f = fifaOf(id);
  openSheet(`<div class="sheet-body" style="padding-top:18px">
    <div class="fc-scene"><div class="fc-flip" data-act="flip">
      <div class="fc-face front" id="fifa">${cardHtml(id)}</div>
      <div class="fc-face back">${cardBack(id)}</div>
    </div></div>
    <p class="empty" style="text-align:center;margin:4px 0 12px">Tippe auf die Karte, um sie umzudrehen.</p>
    <div class="btn-row"><button class="btn gold" data-act="fifa-share" data-id="${id}">${I.share} Teilen</button>${canRate(id) ? `<button class="btn ghost" data-act="rate-open" data-id="${id}">Bewerten</button>` : ''}</div>
    <p class="empty" style="text-align:center;margin-top:12px">TEM, DRI, ABW: ${f.votes ? `Startwert plus ${f.votes} Bewertung${f.votes === 1 ? '' : 'en'} der Mannschaft` : f.src === 'start' ? 'Startwerte' : 'noch keine Werte (50)'} – jede Bewertung fließt ein, der Startwert zählt wie ${BASE_WEIGHT} Bewertungen.<br>TOR, VOR: halb pro Spiel, halb Gesamtzahl inkl. früherer Tore/Assists · FRM: Punkte der letzten 5 Spiele. Der Beste im Team bekommt 99. Gesamt = Durchschnitt aller sechs Werte.</p>
  </div>`, 'fifa');
  startShine();
}
function openRate(id) {
  const cur = D.ratings.mine[id] || teamVals(id);
  const v = { tem: cur.tem ?? cur.TEM, dri: cur.dri ?? cur.DRI, abw: cur.abw ?? cur.ABW };
  const sl = (k, l) => `<div class="rate-row"><label>${l}<b id="rv-${k}">${v[k]}</b></label><input type="range" min="1" max="99" step="1" value="${v[k]}" data-input="rate" data-k="${k}"></div>`;
  openSheet(`<div class="sheet-body" style="padding-top:8px"><h2 style="font:800 26px var(--display);text-transform:uppercase;margin:0 0 4px">${esc(player(id).name)}</h2>
    <p style="color:var(--muted);margin:0 0 14px;font-size:14px">Wie schätzt du ihn ein? Deine Bewertung fließt sofort in seine Karte ein – zusammen mit dem Startwert und den Bewertungen der anderen. Wer wie bewertet hat, sieht niemand. Du kannst sie jederzeit ändern.</p>
    ${sl('tem', 'Tempo')}${sl('dri', 'Dribbling')}${sl('abw', 'Abwehr')}
    <button class="btn gold" data-act="rate-save" data-id="${id}" style="margin-top:8px">${D.ratings.mine[id] ? 'Bewertung ändern' : 'Bewertung speichern'}</button></div>`, 'rate');
}
// Glanz: folgt der Handy-Neigung (oder dem Finger/Mauszeiger), sonst läuft er langsam von selbst
let shineOn = false;
function setShine(x) { document.documentElement.style.setProperty('--gx', Math.max(0, Math.min(100, x)) + '%'); document.querySelectorAll('.fc-shine').forEach(e => e.classList.add('live')); }
function startShine() {
  if (shineOn) return; shineOn = true;
  window.addEventListener('deviceorientation', e => { if (e.gamma != null) setShine((e.gamma + 40) / 80 * 100); });
  document.addEventListener('pointermove', e => { const c = e.target.closest?.('.fc-scene'); if (!c) return; const r = c.getBoundingClientRect(); setShine((e.clientX - r.left) / r.width * 100); });
}
function askMotion() { try { if (window.DeviceOrientationEvent?.requestPermission && !S.motionAsked) { S.motionAsked = true; DeviceOrientationEvent.requestPermission().catch(() => {}); } } catch {} }

function monthChart(id) {
  const months = [];
  for (let m = firstMonth(); m <= THIS_MONTH; m = shiftMonth(m, 1)) months.push(m);
  const data = months.slice(-6).map(m => { const s = computeStats(gamesIn('month', m))[id] || { g: 0, a: 0 }; return { m, g: s.g, a: s.a }; });
  const max = Math.max(1, ...data.map(d => Math.max(d.g, d.a)));
  const W = 340, H = 150, base = 124, top = 16, gw = W / data.length, bw = Math.min(22, gw / 3.2);
  const y = v => base - (v / max) * (base - top);
  const bar = (x, v, c) => v > 0 ? `<path d="M${x},${base} V${y(v) + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${base} Z" fill="${c}"/><text x="${x + bw / 2}" y="${y(v) - 5}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${v}</text>` : '';
  const groups = data.map((d, i) => {
    const cx = gw * i + gw / 2, x1 = cx - bw - 1, x2 = cx + 1;
    return `<g class="cg" data-tip="${monthLabel(d.m)}: ${d.g} Tore · ${d.a} Assists" data-x="${cx}">
      <rect x="${gw * i}" y="0" width="${gw}" height="${H}" fill="transparent"/>
      ${bar(x1, d.g, 'var(--red)')}${bar(x2, d.a, 'var(--sky)')}
      <text x="${cx}" y="${base + 18}" text-anchor="middle" font-size="11" fill="var(--muted)">${MONTHS[+d.m.slice(5) - 1].slice(0, 3)}</text></g>`;
  }).join('');
  return `<div class="chart"><div class="legend"><span><i style="background:var(--red)"></i>Tore</span><span><i style="background:var(--sky)"></i>Assists</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tore und Assists pro Monat"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="rgba(255,255,255,.15)"/>${groups}</svg></div>`;
}

/* ---------- SPIELE ---------- */
function viewGames() {
  if (!D.games.length) return demoPill() + `<div class="card"><div class="empty" style="text-align:center;padding:30px 0">Noch keine Spiele.</div></div>`;
  const byMonth = {};
  D.games.slice().reverse().forEach(g => (byMonth[g.date.slice(0, 7)] ||= []).push(g));
  return demoPill() + Object.entries(byMonth).map(([m, gs]) => `<div class="sec-title">${monthLabel(m)} · ${gs.length} Spiele · ${gs.reduce((s, g) => s + g.goals.length, 0)} Tore</div>` + gs.map(gameCard).join('')).join('');
}
function gameCard(g) {
  const d = new Date(g.date + 'T12:00');
  const c = {}; g.goals.forEach(x => c[x.s] = (c[x.s] || 0) + 1);
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const reacts = D.reactions.filter(r => r.g === g.id);
  const cms = D.comments.filter(x => x.g === g.id).sort((a, b) => a.t.localeCompare(b.t));
  const best = g.goals.find(x => x.best);
  const soc = [...reacts.filter(r => r.n).map(r => r.e + r.n), cms.length ? I.comment + cms.length : ''].filter(Boolean).join(' ');
  return `<div class="game ${S.open.has(g.id) ? 'open' : ''}" id="g-${g.id}"><div class="game-h" data-act="toggle-game" data-id="${g.id}">
      <div class="d"><b>${d.getDate()}</b><span>${d.toLocaleDateString('de-DE', { weekday: 'short' })}</span></div>
      <div class="mid">${winnerOf(g) ? `<b class="gscore"><span class="${winnerOf(g) === 'alt' ? 'win' : ''}">Alt</span> ${scoreOf(g).alt} : ${scoreOf(g).jung} <span class="${winnerOf(g) === 'jung' ? 'win' : ''}">Jung</span>${best ? ' ' + I.starOn : ''}</b>` : `<b>Trainingskick${best ? ' ' + I.starOn : ''}</b>`}<div class="sm">${top.map(([id, n]) => `${esc(short(id))} ${n}×`).join(' · ') || 'keine Tore'}</div>${soc ? `<div class="soc">${soc}</div>` : ''}</div>
      <span class="cnt">${g.goals.length}</span><span class="chev">▾</span></div>
    <div class="goals">
      ${hasTeams(g) ? `<div class="teams-view">${['alt', 'jung'].map(t => `<div class="tv ${t}"><small>${TEAMS[t].name}${winnerOf(g) === t ? ' <span class="winner-tag">Sieger</span>' : ''}</small><div>${g.teams[t].map(id => `<span data-act="profile" data-id="${id}" title="${esc(player(id).name)}">${imgTag(face(id), id)}</span>`).join('') || '<em>–</em>'}</div></div>`).join('')}</div>${winnerOf(g) === 'draw' ? '<div class="empty" style="text-align:center">Unentschieden</div>' : ''}` : ''}
      ${best ? `<div class="best-box" data-act="profile" data-id="${best.s}">${imgTag(face(best.s), best.s)}<div><small>${I.starOn} Tor des Spiels</small><b>${esc(player(best.s).name)}</b>${best.a ? `<span class="as"> ← ${esc(player(best.a).name)}</span>` : ''}${best.note ? `<p>„${esc(best.note)}“</p>` : ''}</div></div>` : ''}
      ${g.goals.map((x, i) => `<div class="gl ${x.best ? 'is-best' : ''} ${teamOf(g, x.s) || ''}"><span class="i">${x.best ? I.starOn : i + 1}</span>${imgTag(face(x.s), x.s)}<div><b>${esc(player(x.s).name)}</b> ${x.a ? `<span class="as">← ${esc(player(x.a).name)}</span>` : '<span class="as">ohne Assist</span>'}</div></div>`).join('')}
      <div class="reacts">${EMOJIS.map(e => { const r = reacts.find(x => x.e === e); return `<button class="re ${r?.mine ? 'on' : ''}" data-act="react" data-g="${g.id}" data-e="${e}">${e}<span>${r?.n || ''}</span></button>`; }).join('')}</div>
      <div class="cmts">
        ${cms.map(x => `<div class="cm">${imgTag(face(x.pid), x.pid)}<div class="b"><div><b>${esc(player(x.pid).name)}</b> <span class="t">${ago(x.t)}</span></div><p>${esc(x.text)}</p></div>
          <button class="lk ${x.liked ? 'on' : ''}" data-act="like" data-id="${x.id}" aria-label="Gefällt mir">${x.liked ? I.heartOn : I.heart}<span>${x.likes || ''}</span></button>
          ${x.mine || S.pw ? `<button class="cm-x" data-act="cm-del" data-id="${x.id}" aria-label="Löschen">✕</button>` : ''}</div>`).join('')}
        ${S.me ? `<div class="cm-new"><span class="me">${imgTag(face(S.me), S.me)}</span>
          <input data-input="cm" data-g="${g.id}" placeholder="Kommentar schreiben …" maxlength="280" value="${esc(S.cmDraft[g.id] || '')}" enterkeyhint="send">
          <button class="send" data-act="cm-send" data-g="${g.id}" aria-label="Senden">${I.send}</button></div>`
          : `<button class="cm-guest" data-act="relogin">Als Gast liest du nur mit – <b>als Spieler anmelden</b></button>`}
      </div>
    </div></div>`;
}

/* ---------- MONAT (Wahl + Artikel) ---------- */
const VOTE_TYPES = {
  potm: { title: 'Spieler des Monats', cta: 'Jetzt abstimmen', key: m => m },
  flop: { title: 'Flop des Monats', cta: 'Flop wählen', key: m => 'flop:' + m }
};
function voteCard(type) {
  const T = VOTE_TYPES[type], m = S.month, w = voteWindow(m), vr = voteResult(m, type);
  const voters = D.players.filter(p => p.active && !p.guest);
  const st = computeStats(gamesIn('month', m));
  const voted = S.me && D.votes.some(v => v.month === m && v.voter === S.me && v.type === type);
  const mine = voted ? { pick: ls.get('h2ku-myvotes', {})[T.key(m)] || D.votes.find(v => v.month === m && v.voter === S.me && v.type === type)?.pick || '?' } : null;
  let h = `<div class="card vote-${type}"><div class="card-h"><h2>${T.title}</h2></div>`;
  if (w.closed) {
    if (!vr.total) h += `<div class="empty">Für ${monthLabel(m, false)} wurde nicht abgestimmt.</div>`;
    else {
      const win = vr.list[0];
      h += type === 'potm'
        ? `<div class="card potm" style="margin-bottom:12px" data-act="profile" data-id="${win.id}">${imgTag(face(win.id), win.id)}<div><div class="lbl">Gewählt von der Mannschaft</div><div class="nm">${esc(player(win.id).name)}</div><div class="sm">${win.n} von ${vr.total} Stimmen</div></div></div>`
        : `<div class="flop" style="margin-bottom:12px" data-act="profile" data-id="${win.id}">${imgTag(face(win.id), win.id)}<div><b>${esc(player(win.id).name)}</b><p>${win.n} von ${vr.total} Stimmen – Kopf hoch!</p></div></div>`;
      h += `<div class="results ${type}">${vr.list.slice(0, 6).map(r => `<div class="r">${imgTag(face(r.id), r.id)}<div class="bar"><i data-w="${Math.round(r.n / vr.total * 100)}"></i><span>${esc(player(r.id).name)}</span></div><span class="pc">${Math.round(r.n / vr.total * 100)}%</span></div>`).join('')}</div>`;
    }
  } else if (w.open) {
    const sel = S.voteSel[type] || mine?.pick;
    const cands = voters.map(p => ({ p, s: st[p.id] || { g: 0, a: 0 } }))
      .sort(type === 'potm' ? (a, b) => (b.s.g + b.s.a) - (a.s.g + a.s.a) || a.p.name.localeCompare(b.p.name) : (a, b) => a.p.name.localeCompare(b.p.name));
    const tipIds = type === 'potm' ? cands.filter(c => c.s.g + c.s.a > 0).slice(0, 3).map(c => c.p.id) : [];
    h += `<div class="vote-status"><span class="dot"></span>Läuft bis ${w.close.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })} · ${vr.total} von ${voters.length} haben abgestimmt</div>`;
    if (!S.me) h += `<div class="empty" style="margin-bottom:10px">Du schaust als Gast zu. Abstimmen können nur angemeldete Spieler.</div><button class="btn ghost" data-act="relogin">Als Spieler anmelden</button>`;
    else if (!S.voteOpen[type]) h += `${mine ? `<div class="voted">✓ Du hast ${mine.pick !== '?' && byId[mine.pick] ? `für <b>${esc(player(mine.pick).name)}</b> ` : ''}abgestimmt</div>` : ''}
      <button class="btn ${type === 'potm' ? 'gold' : 'ghost'}" data-act="vote-toggle" data-type="${type}">${mine ? 'Stimme ändern ▾' : T.cta + ' ▾'}</button>`;
    else h += `
      <button class="more-btn" data-act="vote-toggle" data-type="${type}" style="margin:0 0 10px">Zuklappen ▴</button>
      <div class="vgrid">${cands.map(({ p, s }) => p.id === S.me ? `<div class="vc self">${imgTag(face(p.id), p.id)}<b>Du</b><span>${s.g} T · ${s.a} A</span></div>` : `<div class="vc ${sel === p.id ? 'sel' : ''}" data-act="vote-pick" data-type="${type}" data-id="${p.id}">${tipIds.includes(p.id) ? `<span class="tip-star" title="Statistik-Tipp">${I.starOn}</span>` : ''}${imgTag(face(p.id), p.id)}<b>${esc(short(p.id))}</b><span>${s.g} T · ${s.a} A</span></div>`).join('')}</div>
      <div style="margin-top:14px"><button class="btn gold" data-act="vote-send" data-type="${type}" ${!sel || sel === mine?.pick ? 'disabled' : ''}>${mine ? (sel === mine.pick ? (byId[mine.pick] ? `✓ Du hast für ${esc(short(mine.pick))} gestimmt` : '✓ Abgestimmt') : 'Stimme ändern') : 'Stimme abgeben'}</button></div>
      <div class="empty" style="text-align:center;margin-top:6px">${type === 'potm' ? `${I.starOn} = Statistik-Tipp · ` : 'Mit einem Augenzwinkern · '}Eine Stimme pro Spieler, bis zum Ende änderbar. Für dich selbst geht nicht. Ergebnis erst nach Abschluss.</div>`;
  } else h += `<div class="empty">Die Abstimmung startet am 1. ${monthLabel(m)}.</div>`;
  return h + `</div>`;
}
function viewMonth() {
  const games = gamesIn('month', S.month);
  let h = demoPill() + `<div class="card" style="padding:12px">${monthStepper()}</div>`;
  h += voteCard('potm') + voteCard('flop');
  h += `<div class="card"><div class="card-h"><h2><span class="ic">${I.news}</span>Monatsartikel</h2><span class="meta">${games.length} Spiele</span></div>
    <p style="margin:0 0 12px;color:var(--muted);font-size:14px">Ein Zeitungsbericht über den ${monthLabel(S.month, false)}, automatisch aus den Zahlen erstellt. Er lässt sich als Bild in WhatsApp teilen.</p>
    <button class="btn" data-act="article" ${games.length ? '' : 'disabled'}>${I.news} Artikel erstellen</button></div>`;
  return h;
}

function openArticle() {
  const games = gamesIn('month', S.month);
  const prevM = shiftMonth(S.month, -1);
  const prevGames = gamesIn('month', prevM);
  const a = buildArticle({ month: S.month, games, prevGames, player, stats: computeStats(games), prevStats: computeStats(prevGames), potm: potmOf(S.month), flop: flopOf(S.month) }, S.articleVariant);
  if (!a) return toast('Keine Spiele in diesem Monat');
  S.article = a;
  const body = `<div class="paper-wrap"><div class="paper" id="paper">
      <div class="mast"><div class="name">Die H2Ku-Kickerpost</div><div class="line"><span>${esc(a.issue)}</span><span>Herrenberg</span><span>1. Männer</span></div></div>
      <div class="kicker">${esc(a.kicker)}</div>
      <h1>${esc(a.headline)}</h1>
      <p class="deck">${esc(a.deck)}</p>
      <div class="by">Von unserem Kabinen-Reporter · ${esc(a.dateline)}</div>
      <figure><div class="ph" style="background-image:url('${portrait(a.photo)}')"></div><figcaption>${esc(a.caption)}</figcaption></figure>
      <p class="lead"><span class="dc">${esc(a.lead[0])}</span>${esc(a.lead.slice(1))}</p>
      ${a.paras.map(p => (p.h ? `<h3>${esc(p.h)}</h3>` : '') + `<p>${esc(p.t)}</p>`).join('')}
      <div class="box"><h4>Die Top 5 des Monats</h4><table><tr><th>Spieler</th><th class="num">T</th><th class="num">A</th><th class="num">Pkt</th></tr>${a.table.map((r, i) => `<tr><td>${i + 1}. ${esc(r.name)}</td><td class="num">${r.g}</td><td class="num">${r.a}</td><td class="num"><b>${r.p}</b></td></tr>`).join('')}</table></div>
      ${a.potm ? `<div class="potm-box">${imgTag(face(a.potm.id), a.potm.id)}<div><small>Spieler des Monats</small><b>${esc(player(a.potm.id).name)}</b></div></div>` : ''}
      ${a.flop ? `<div class="potm-box flop-box">${imgTag(face(a.flop.id), a.flop.id)}<div><small>Flop des Monats</small><b>${esc(player(a.flop.id).name)}</b></div></div>` : ''}
      <div class="foot">SG H2Ku Herrenberg · Trainingskick-Statistik</div>
    </div></div>
    <div class="paper-actions"><button class="btn gold" data-act="article-share">${I.share} Als Bild teilen</button><button class="btn ghost sm" data-act="article-again">${I.refresh} Neu formulieren</button><button class="btn ghost sm" data-act="article-copy">${I.copy} Text kopieren</button></div>`;
  openSheet(body, 'article');
}

function shareArticle(btn) { return shareNode(btn, $('#paper'), `H2Ku-Kickerpost-${S.month}.png`, S.article.headline, '#f6f1e7'); }
async function renderNode(node, bg) {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  return html2canvas(node, { scale: 2, backgroundColor: bg || null, useCORS: true });
}
async function shareNode(btn, node, filename, title, bg) {
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Bild wird erstellt …';
  try {
    const canvas = await renderNode(node, bg);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); toast('Bild gespeichert'); }
  } catch (e) { if (e.name !== 'AbortError') toast('Teilen nicht möglich: ' + e.message); }
  btn.disabled = false; btn.textContent = label;
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Keine Verbindung')); document.head.appendChild(s); }); }

/* ---------- EINTRAGEN ---------- */
// Ablauf: ① Teams (Alt / Jung)  ② Tore  ③ Ergebnis. Für Altdaten geht es auch ohne Teams.
function viewAdmin() {
  if (!S.pw) return `<div class="lock"><div class="big-ic">${I.lock}</div><h2>Eintragen</h2><p>Nur für den Statistik-Verantwortlichen.</p>
    <input class="pw" id="pw" type="password" placeholder="Passwort" autocomplete="current-password" enterkeyhint="go">
    <button class="btn" data-act="login">Entsperren</button></div>`;
  const d = draft(), teams = !d.noTeams, step = d.step;
  const sc = teams ? liveScore(d) : null;
  const win = autoWinner(d);
  let h = `<div class="entry-top"><input type="date" value="${d.date}" max="${isoDate(TODAY)}" data-input="date">
      ${teams ? `<span class="score-pill sb"><small>Alt</small>${sc.alt}:${sc.jung}<small>Jung</small></span>` : `<span class="score-pill">${I.ball} ${d.goals.length}</span>`}</div>
    ${d.id ? `<div class="demo-pill" style="background:var(--sky)">${I.edit} Du bearbeitest das Spiel vom ${new Date(d.date + 'T12:00').toLocaleDateString('de-DE')}</div>` : ''}
    <div class="steps">${[['teams', '① Teams', teams ? `${d.teams.alt.length} : ${d.teams.jung.length}` : 'ohne'], ['goals', '② Tore', d.goals.length + ''], ['result', '③ Ergebnis', teams ? (win ? (win === 'draw' ? 'Remis' : TEAMS[win].short) : '–') : '–']]
      .map(([k, l, v]) => `<button class="${step === k ? 'on' : ''}" data-act="step" data-v="${k}" ${!teams && k === 'result' ? 'disabled' : ''}><b>${l}</b><span>${v}</span></button>`).join('')}</div>`;
  if (step === 'teams') h += stepTeams(d);
  else if (step === 'goals') h += stepGoals(d);
  else h += stepResult(d);
  h += adminLists();
  return h;
}
function autoWinner(d) {
  if (d.noTeams) return null;
  if (d.winner) return d.winner;
  const sc = liveScore(d);
  return !d.goals.length ? null : sc.alt > sc.jung ? 'alt' : sc.jung > sc.alt ? 'jung' : 'draw';
}
const tileHtml = (id, extra = '', cnt = null, act = 'tile') => `<div class="tile ${extra}" data-act="${act}" data-id="${id}" id="t-${id}">${imgTag(face(id), id)}<b>${esc(short(id))}</b>
  <div class="cnt">${cnt?.g ? `<span class="g">${cnt.g}</span>` : ''}${cnt?.a ? `<span class="a">${cnt.a}</span>` : ''}</div></div>`;
function stepTeams(d) {
  const people = D.players.filter(p => p.active);
  if (d.noTeams) return `<div class="card"><p style="margin:0 0 10px">Du trägst dieses Spiel <b>ohne Teams</b> ein – z. B. für alte Spiele. Dann gibt es keinen Sieger und keine Bilanz.</p>
    <button class="btn ghost" data-act="with-teams">Doch mit Teams eintragen</button></div>
    <button class="btn" data-act="step" data-v="goals" style="margin-bottom:14px">Weiter zu den Toren →</button>`;
  const lastT = D.games.slice().reverse().find(hasTeams);
  return `<div class="entry"><div class="prompt"><span class="step">1</span><span style="flex:1">Wer spielt wo? <span style="color:var(--muted);font-weight:400">Tippen: Alt → Jung → nicht dabei</span></span></div>
    <div class="team-count"><span class="alt">Alt <b>${d.teams.alt.length}</b></span><span class="jung">Jung <b>${d.teams.jung.length}</b></span></div>
    <div class="btn-row" style="margin-bottom:10px">${lastT ? '<button class="btn ghost sm" data-act="teams-last">↺ Wie letztes Mal</button>' : ''}${d.teams.alt.length + d.teams.jung.length ? '<button class="btn ghost sm" data-act="teams-clear">Alle raus</button>' : ''}</div>
    <div class="tgrid">${people.map(p => { const t = d.teams.alt.includes(p.id) ? 'alt' : d.teams.jung.includes(p.id) ? 'jung' : '';
      return `<div class="tile tm ${t ? 'in-' + t : 'out'}" data-act="team-tap" data-id="${p.id}">${imgTag(face(p.id), p.id)}<b>${esc(short(p.id))}</b>${t ? `<span class="tbadge ${t}">${TEAMS[t].short}</span>` : ''}</div>`; }).join('')}
      <div class="tile add" data-act="add-guest"><div class="plus-c">+</div><b>Gast</b></div></div>
    <button class="btn" data-act="step" data-v="goals" style="margin-top:14px" ${d.teams.alt.length && d.teams.jung.length ? '' : 'disabled'}>Weiter zu den Toren →</button>
    <button class="more-btn" data-act="no-teams" style="margin:8px 0 14px">Ohne Teams eintragen (z. B. alte Spiele)</button></div>`;
}
function stepGoals(d) {
  const cnt = {}; d.goals.forEach(x => { (cnt[x.s] ||= { g: 0, a: 0 }).g++; if (x.a) (cnt[x.a] ||= { g: 0, a: 0 }).a++; });
  const assist = S.mode === 'assist', teams = !d.noTeams;
  const scorerTeam = assist && teams ? (d.teams.alt.includes(S.pending) ? 'alt' : 'jung') : null;
  let h = `<div class="entry"><div class="prompt ${assist ? 'assist' : ''}">${assist
      ? `<span class="step">${I.ball}</span>${imgTag(face(S.pending), S.pending)}<span style="flex:1">Tor ${esc(short(S.pending))} – <b>Assist von?</b></span><button class="icon-btn" data-act="cancel-goal" aria-label="Abbrechen">✕</button>`
      : `<span class="step">2</span><span style="flex:1">Wer hat getroffen? <span style="color:var(--muted);font-weight:400">Antippen</span></span>`}</div>
    ${assist ? `<button class="btn gold noassist" data-act="no-assist">Ohne Assist</button>` : ''}`;
  if (teams) h += ['alt', 'jung'].filter(t => !scorerTeam || t === scorerTeam).map(t => `<div class="team-sec ${t}"><h3>${TEAMS[t].name} <span>${liveScore(d)[t]} Tore</span></h3>
      <div class="tgrid">${d.teams[t].map(id => tileHtml(id, assist && id === S.pending ? 'dim' : '', cnt[id])).join('')}</div></div>`).join('');
  else h += `<div class="tgrid">${D.players.filter(p => p.active).map(p => tileHtml(p.id, assist && p.id === S.pending ? 'dim' : '', cnt[p.id])).join('')}
      <div class="tile add" data-act="add-guest"><div class="plus-c">+</div><b>Gast</b></div></div>`;
  h += `<div class="card" style="margin-top:14px"><div class="card-h"><h2>Tore in diesem Spiel</h2>${d.goals.length || d.id ? `<button class="more-btn" style="width:auto;margin:0;padding:6px 10px" data-act="discard">Verwerfen</button>` : ''}</div>
      ${d.goals.length ? `<ul class="log">${d.goals.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => { const t = teams ? (d.teams.alt.includes(x.s) ? 'alt' : 'jung') : ''; return `<li class="${x.best ? 'is-best' : ''} ${t}"><span class="i">${i + 1}</span><div class="t"><b>${esc(player(x.s).name)}</b>${t ? ` <span class="tdot ${t}">${TEAMS[t].short}</span>` : ''}<br><small>${x.a ? '← ' + esc(player(x.a).name) : 'ohne Assist'}</small></div><button class="star-btn ${x.best ? 'on' : ''}" data-act="best" data-i="${i}" aria-label="Tor des Spiels">${x.best ? I.starOn : I.star}</button><button data-act="del-goal" data-i="${i}" aria-label="Löschen">✕</button></li>`; }).join('')}</ul>
        ${d.goals.some(x => x.best) ? `<div class="best-note"><label>${I.starOn} Tor des Spiels – Kommentar (optional)</label><input data-input="bestnote" maxlength="120" placeholder="z. B. Fallrückzieher aus 20 Metern" value="${esc(d.goals.find(x => x.best).note || '')}"></div>`
          : `<div class="empty">Tipp: Mit dem Stern ${I.star} markierst du das Tor des Spiels.</div>`}` : `<div class="empty">Noch keine Tore. Tippe oben auf den Torschützen.</div>`}
    </div></div>`;
  if (teams) h += `<button class="btn" data-act="step" data-v="result" style="margin-bottom:14px">Weiter zum Ergebnis →</button>`;
  return h;
}
function stepResult(d) {
  const sc = liveScore(d), win = autoWinner(d);
  const opt = (v, l) => `<button class="res-btn ${v} ${win === v ? 'on' : ''}" data-act="winner" data-v="${v}">${l}</button>`;
  return `<div class="card">
      <div class="scoreboard"><div class="sb-t alt"><b>ALT</b><small>${d.teams.alt.length} Spieler</small></div><div class="sb-s">${sc.alt} : ${sc.jung}</div><div class="sb-t jung"><b>JUNG</b><small>${d.teams.jung.length} Spieler</small></div></div>
      <div class="sec-title" style="margin:14px 0 8px;text-align:center">Wer hat gewonnen?</div>
      <div class="res-row">${opt('alt', 'Alt')}${opt('draw', 'Remis')}${opt('jung', 'Jung')}</div>
      <div class="empty" style="text-align:center;margin-top:8px">${d.winner ? 'Von dir gewählt.' : win ? 'Automatisch aus den Toren vorgeschlagen.' : 'Noch keine Tore – bitte Sieger antippen.'} Nicht alle Tore notiert? Dann einfach den richtigen Sieger wählen.</div>
    </div>
    <div class="teams-view" style="margin-bottom:14px">${['alt', 'jung'].map(t => `<div class="tv ${t}"><small>${TEAMS[t].name}${win === t ? ' <span class="winner-tag">Sieger</span>' : ''}</small><div>${d.teams[t].map(id => imgTag(face(id), id)).join('')}</div></div>`).join('')}</div>`;
}
function adminLists() {
  let h = '';
  const recent = D.games.slice().reverse().slice(0, 12);
  h += `<div class="card admin-list"><div class="card-h"><h2>Gespeicherte Spiele</h2><span class="meta">${D.games.length}</span></div>
    ${recent.map(g => `<div class="row"><div class="t"><b>${new Date(g.date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</b><small>${winnerOf(g) ? `Alt ${scoreOf(g).alt}:${scoreOf(g).jung} Jung · ${resultTxt(g)} · ` : ''}${g.goals.length} Tore</small></div><button class="icon-btn" data-act="edit-game" data-id="${g.id}" aria-label="Bearbeiten">${I.edit}</button><button class="icon-btn danger" data-act="del-game" data-id="${g.id}" aria-label="Löschen">${I.trash}</button></div>`).join('') || '<div class="empty">Noch keine.</div>'}</div>`;
  const guests = D.players.filter(p => p.guest);
  if (guests.length) {
    const st = computeStats(D.games);
    h += `<div class="card admin-list"><div class="card-h"><h2>Gäste verwalten</h2><span class="meta">${guests.length}</span></div>
      ${guests.map(p => { const s = st[p.id] || { g: 0, a: 0 }; const used = s.g + s.a > 0 || D.games.some(g => teamOf(g, p.id)); return `<div class="row" style="${p.active ? '' : 'opacity:.55'}"><div class="t"><b>${esc(p.name)}</b><small>${s.g} T · ${s.a} A${p.active ? '' : ' · ausgeblendet'}</small></div>
        <button class="icon-btn" data-act="guest-toggle" data-id="${p.id}" aria-label="${p.active ? 'Ausblenden' : 'Einblenden'}" title="${p.active ? 'Ausblenden' : 'Einblenden'}">${p.active ? I.eyeOff : I.eye}</button>
        <button class="icon-btn danger" data-act="guest-del" data-id="${p.id}" data-used="${used ? 1 : ''}" aria-label="Löschen" title="Löschen">${I.trash}</button></div>`; }).join('')}
      <div class="empty">Ausblenden: Der Gast verschwindet aus den Kacheln, seine Tore bleiben in der Statistik. Löschen geht nur ohne Tore/Assists.</div></div>`;
  }
  const vm = [...new Set(D.votes.map(v => v.month))].sort().reverse().slice(0, 4);
  const all = D.players.filter(p => p.active && !p.guest);
  h += `<div class="card admin-list"><div class="card-h"><h2>Abstimmungen</h2><span class="meta">Kontrolle</span></div>
    ${vm.map(m => { const open = !voteWindow(m).closed;
      return ['potm', 'flop'].map(type => { const vs = D.votes.filter(v => v.month === m && v.type === type); const missing = all.filter(p => !vs.some(v => v.voter === p.id));
        return `<div class="row"><div class="t"><b>${monthLabel(m)}</b><small>${VOTE_TYPES[type].title} · ${open ? 'läuft' : 'beendet'}${open && missing.length && vs.length ? ' · fehlt noch: ' + missing.map(p => esc(short(p.id))).join(', ') : ''}</small></div><b style="font:700 20px var(--display)">${vs.length}/${all.length}</b></div>`; }).join(''); }).join('') || '<div class="empty">Noch keine Stimmen.</div>'}
    <div class="empty">Jeder Spieler hat pro Abstimmung genau eine Stimme (mit seiner PIN).</div></div>`;
  if (!Store.online) h += `<div class="card"><div class="card-h"><h2>Prototyp</h2></div><p style="margin:0 0 10px;color:var(--muted);font-size:13px">Die Daten liegen gerade nur auf diesem Gerät.</p>
    <div class="btn-row"><button class="btn ghost sm" data-act="demo-reset">Beispieldaten neu</button><button class="btn ghost sm" data-act="demo-empty">Alles leeren</button></div></div>`;
  h += `<button class="btn ghost" data-act="logout" style="margin-bottom:96px">Abmelden</button>`;
  return h;
}
function draft() {
  if (!S.draft) S.draft = { id: null, date: isoDate(TODAY), goals: [] };
  const d = S.draft;
  if (d.noTeams === undefined) d.noTeams = !d.teams && d.goals.length > 0;   // alter Entwurf ohne Teams
  d.teams ||= { alt: [], jung: [] }; d.teams.alt ||= []; d.teams.jung ||= [];
  if (!d.step) d.step = d.goals.length ? 'goals' : 'teams';
  if (d.winner === undefined) d.winner = null;
  return d;
}
function draftReady(d) { return d.noTeams ? d.goals.length > 0 : d.teams.alt.length && d.teams.jung.length && (d.goals.length || d.winner); }
function saveDraft() { ls.set('h2ku-draft', S.draft); }
function renderSaveBar() {
  const d = draft();
  const bar = document.createElement('div');
  bar.className = 'save-bar';
  const sc = !d.noTeams ? liveScore(d) : null;
  bar.innerHTML = `<button class="btn" data-act="save-game" ${draftReady(d) ? '' : 'disabled'}>${I.save} Spiel speichern · ${sc ? `Alt ${sc.alt}:${sc.jung} Jung` : `${d.goals.length} ${d.goals.length === 1 ? 'Tor' : 'Tore'}`}</button>`;
  document.body.appendChild(bar);
}

/* ============================================================
   SHEET / DIALOG / TOAST / KONFETTI
   ============================================================ */
function openSheet(html, kind, dir) {
  const existing = $('.sheet');
  if (existing && kind === 'profile' && existing.dataset.kind === 'profile') {
    existing.innerHTML = `<div class="grab"></div><button class="x" data-act="close" aria-label="Schließen">✕</button>` + html;
    existing.scrollTop = 0;
    if (dir) existing.querySelector('.prof-hero').animate([{ opacity: 0, transform: `translateX(${dir === 'r' ? 40 : -40}px)` }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
    afterRender(existing);
    return;
  }
  closeSheet(true);
  const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.dataset.act = 'close';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.dataset.kind = kind;
  sh.innerHTML = `<div class="grab"></div><button class="x" data-act="close" aria-label="Schließen">✕</button>` + html;
  document.body.append(bg, sh);
  document.body.style.overflow = 'hidden';
  afterRender(sh);
  swipeToClose(sh);
}
function closeSheet(instant) {
  const sh = $('.sheet'), bg = $('.sheet-bg');
  if (!sh) return;
  document.body.style.overflow = '';
  if (instant) { sh.remove(); bg?.remove(); return; }
  sh.classList.add('closing'); bg.style.transition = 'opacity .2s'; bg.style.opacity = 0;
  setTimeout(() => { sh.remove(); bg.remove(); }, 220);
}
function swipeToClose(sh) {
  let y0 = null, dy = 0;
  sh.addEventListener('touchstart', e => { if (sh.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { sh.style.transform = `translateY(${dy}px)`; sh.style.animation = 'none'; } }, { passive: true });
  sh.addEventListener('touchend', () => { if (y0 === null) return; sh.style.transition = 'transform .2s'; if (dy > 110) { sh.style.transform = 'translateY(100%)'; setTimeout(() => closeSheet(true), 200); } else sh.style.transform = ''; y0 = null; });
}
function confirmBox(title, text, ok, danger) {
  return new Promise(res => {
    openSheet(`<div class="sheet-body" style="padding-top:10px"><h2 style="font:800 26px var(--display);text-transform:uppercase;margin:0 0 8px">${title}</h2><p style="color:var(--muted);margin:0 0 18px">${text}</p>
      <div class="btn-row"><button class="btn ghost" id="cb-no">Abbrechen</button><button class="btn ${danger ? '' : 'gold'}" id="cb-ok">${ok}</button></div></div>`, 'confirm');
    $('#cb-ok').onclick = () => { closeSheet(); res(true); };
    $('#cb-no').onclick = () => { closeSheet(); res(false); };
  });
}
let toastT;
function toast(msg) {
  $('.toast')?.remove(); clearTimeout(toastT);
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  toastT = setTimeout(() => t.remove(), 2200);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
  const x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#e10026', '#d9ad55', '#ffffff', '#5db7ff', '#002c60'];
  const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.55, vx: (Math.random() - .5) * 16, vy: -Math.random() * 18 - 6, s: 5 + Math.random() * 6, r: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0;
  (function tick() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.vy += .55; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    if (++f < 150) requestAnimationFrame(tick); else c.remove();
  })();
}
function buzz(ms = 25) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

/* ============================================================
   AKTIONEN
   ============================================================ */
const actions = {
  tab: el => { S.tab = el.dataset.v; closeSheet(true); scrollTo(0, 0); render(true); },
  scope: el => { S.scope = el.dataset.v; ls.set('h2ku-scope', S.scope); render(); },
  month: el => { S.month = shiftMonth(S.month, +el.dataset.v); S.voteSel = {}; S.voteOpen = {}; render(); },
  more: el => { S.showAll[el.dataset.v] = !S.showAll[el.dataset.v]; render(); },
  profile: el => { buzz(10); openProfile(el.dataset.id, el.dataset.dir); },
  close: () => closeSheet(),
  'toggle-game': el => { const id = el.dataset.id, g = el.closest('.game'); g.classList.toggle('open'); g.classList.add('opening'); setTimeout(() => g.classList.remove('opening'), 300); g.classList.contains('open') ? S.open.add(id) : S.open.delete(id); },
  'open-game': el => { S.open.add(el.dataset.id); S.tab = 'games'; closeSheet(true); render(true); setTimeout(() => $('#g-' + el.dataset.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80); },
  fifa: el => openFifa(el.dataset.id),
  'fifa-share': async el => {
    $('.fc-flip')?.classList.remove('flipped'); document.body.classList.add('sharing');
    try { await shareNode(el, $('#fifa .fc'), `H2Ku-Karte-${el.dataset.id}.png`, player(el.dataset.id).name, null); } finally { document.body.classList.remove('sharing'); }
  },
  flip: el => { el.classList.toggle('flipped'); askMotion(); buzz(10); },
  'rate-open': el => openRate(el.dataset.id),
  'rate-save': async el => {
    const id = el.dataset.id, vals = {};
    document.querySelectorAll('input[data-input=rate]').forEach(i => vals[i.dataset.k] = +i.value);
    el.disabled = true; el.textContent = 'Speichere …';
    try { D = await Store.rate(id, vals); indexPlayers(); closeSheet(true); toast('Bewertung gespeichert'); openFifa(id); }
    catch (e) { el.disabled = false; el.textContent = 'Bewertung speichern'; toast('Fehler: ' + e.message); }
  },
  pview: el => { S.pview = el.dataset.v; render(); },

  // Reaktionen & Kommentare
  react: async el => {
    if (!S.me) return askLogin();
    buzz(12);
    const p = Store.react(el.dataset.g, el.dataset.e); D = Store.data; render();
    try { await p; } catch (e) { D = Store.data; render(); toast('Fehler: ' + e.message); }
  },
  like: async el => {
    if (!S.me) return askLogin();
    buzz(12);
    const p = Store.like(el.dataset.id); D = Store.data; render();
    try { await p; } catch (e) { D = Store.data; render(); toast('Fehler: ' + e.message); }
  },
  whoami: () => S.me ? actions.account() : showLogin(),
  account: () => {
    if (!S.me) return showLogin();
    const p = player(S.me);
    openSheet(`<div class="sheet-body" style="padding-top:8px;text-align:center">${imgTag(face(S.me), S.me, 'acc-face')}
      <h2 style="font:800 26px var(--display);text-transform:uppercase;margin:8px 0 2px">${esc(p.name)}</h2>
      <p style="color:var(--muted);margin:0 0 16px;font-size:14px">Du bist angemeldet. Deine Stimmen, Kommentare und Likes laufen unter deinem Namen.</p>
      <button class="btn ghost" data-act="profile" data-id="${S.me}" style="margin-bottom:8px">Mein Profil</button>
      <button class="btn ghost" data-act="relogin">Abmelden / Person wechseln</button></div>`, 'account');
  },
  relogin: () => { closeSheet(true); setMe(null); render(); showLogin(); },
  'login-pick': async el => {
    // Erst wenn der Server-Stand da ist, wissen wir, ob schon eine PIN existiert
    if (Store.online && !Store.fresh) {
      el.style.opacity = .5; toast('Einen Moment …');
      try { D = await Store.load(); indexPlayers(); } catch { return toast('Keine Verbindung – bitte gleich nochmal'); }
    }
    loginPin(el.dataset.id);
  },
  'login-back': () => showLogin(),
  'login-guest': () => { setMe('guest'); hideLogin(); render(); toast('Viel Spaß beim Zuschauen!'); },
  'login-go': async el => {
    const pid = el.dataset.id, pin = $('#pin1').value.trim(), pin2 = $('#pin2')?.value.trim();
    const err = m => { $('#login-err').textContent = m; buzz(120); $('#pin1').classList.remove('err'); void $('#pin1').offsetWidth; $('#pin1').classList.add('err'); };
    if (!/^\d{4}$/.test(pin)) return err('Bitte 4 Ziffern eingeben');
    if ($('#pin2') && pin !== pin2) return err('Die beiden PINs sind nicht gleich');
    el.disabled = true; el.textContent = 'Prüfe …';
    try {
      await Store.claim(pid, pin);
      setMe({ id: pid, pin }); hideLogin(); confetti(); toast(`Hallo ${player(pid).name.split(' ')[0]}!`);
      refresh();
    } catch (e) { el.disabled = false; el.textContent = 'Los geht’s'; err(e.message); }
  },
  'cm-send': async el => {
    const g = el.dataset.g, text = (S.cmDraft[g] || '').trim();
    if (!S.me) return askLogin();
    if (!text) return document.querySelector(`input[data-g="${g}"]`)?.focus();
    el.disabled = true;
    try { D = await Store.comment(g, S.me, text); S.cmDraft[g] = ''; buzz(20); render(); }
    catch (e) { el.disabled = false; toast('Fehler: ' + e.message); }
  },
  'cm-del': async el => {
    if (!(await confirmBox('Kommentar löschen?', 'Der Kommentar wird für alle entfernt.', 'Löschen', true))) return;
    const c = D.comments.find(x => x.id === el.dataset.id);
    try { D = await Store.deleteComment(el.dataset.id, c && !c.mine ? S.pw : null); toast('Kommentar gelöscht'); } catch (e) { toast('Fehler: ' + e.message); }
    render();
  },

  // Tor des Spiels beim Eintragen
  best: el => {
    const i = +el.dataset.i, goals = draft().goals, was = goals[i].best;
    const note = goals.find(x => x.best)?.note || '';
    goals.forEach(x => { delete x.best; delete x.note; });
    if (!was) { goals[i].best = true; if (note) goals[i].note = note; buzz(15); }
    saveDraft(); render();
  },
  install: () => {
    if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    openSheet(`<div class="sheet-body" style="padding-top:8px"><h2 style="font:800 26px var(--display);text-transform:uppercase;margin:0 0 12px">Als App installieren</h2>
      ${ios ? `<ol style="padding-left:20px;line-height:1.8"><li>Unten in Safari auf <b>Teilen</b> <span style="font-size:18px">⎋</span> tippen</li><li><b>„Zum Home-Bildschirm“</b> wählen</li><li>Oben rechts <b>Hinzufügen</b></li></ol>`
        : `<ol style="padding-left:20px;line-height:1.8"><li>Oben rechts in Chrome auf <b>⋮</b> tippen</li><li><b>„App installieren“</b> oder <b>„Zum Startbildschirm“</b> wählen</li></ol>`}
      <button class="btn ghost" data-act="install-hide" style="margin-top:12px">Nicht mehr anzeigen</button></div>`, 'install');
  },
  'install-hide': () => { ls.set('h2ku-install-hide', true); closeSheet(); render(); },

  // Abstimmung
  'vote-toggle': el => { const t = el.dataset.type; S.voteOpen[t] = !S.voteOpen[t]; S.voteSel[t] = null; buzz(10); render(); },
  'vote-pick': el => { buzz(10); S.voteSel[el.dataset.type] = el.dataset.id; render(); },
  'vote-send': async el => {
    const t = el.dataset.type, pick = S.voteSel[t];
    el.disabled = true; el.textContent = 'Wird gespeichert …';
    try { D = await Store.vote(S.month, pick, t); const mv = ls.get('h2ku-myvotes', {}); mv[VOTE_TYPES[t].key(S.month)] = pick; ls.set('h2ku-myvotes', mv); S.voteSel[t] = null; S.voteOpen[t] = false; if (t === 'potm') confetti(); toast(t === 'potm' ? 'Danke für deine Stimme!' : 'Stimme gezählt – psst!'); }
    catch (e) { toast('Fehler: ' + e.message); }
    render();
  },

  // Artikel
  article: () => { S.articleVariant = 0; openArticle(); },
  'article-again': () => { S.articleVariant++; closeSheet(true); openArticle(); },
  'article-copy': async () => { try { await navigator.clipboard.writeText(articleToText(S.article)); toast('Text kopiert'); } catch { toast('Kopieren nicht möglich'); } },
  'article-share': el => shareArticle(el),

  // Admin
  login: async el => {
    const inp = $('#pw'); const pw = inp.value.trim();
    if (!pw) return inp.focus();
    el.disabled = true; el.textContent = 'Prüfe …';
    if (await Store.login(pw)) { S.pw = pw; ls.set('h2ku-pw', pw); buzz(30); render(true); }
    else { el.disabled = false; el.textContent = 'Entsperren'; inp.classList.remove('err'); void inp.offsetWidth; inp.classList.add('err'); buzz(120); toast('Falsches Passwort'); }
  },
  logout: () => { S.pw = null; ls.del('h2ku-pw'); render(true); },
  tile: el => {
    const id = el.dataset.id;
    buzz(15);
    if (S.mode === 'scorer') { S.pending = id; S.mode = 'assist'; render(); scrollToPrompt(); return; }
    addGoal(S.pending, id);
  },
  'no-assist': () => addGoal(S.pending, null),
  'add-guest': () => {
    openSheet(`<div class="sheet-body" style="padding-top:8px"><h2 style="font:800 26px var(--display);text-transform:uppercase;margin:0 0 6px">Gastspieler</h2>
      <p style="color:var(--muted);margin:0 0 14px;font-size:14px">Wer spielt heute mit, ist aber nicht im Kader? Der Gast bleibt gespeichert und taucht in der Statistik auf, nimmt aber nicht an der Wahl zum Spieler des Monats teil.</p>
      <input class="search" id="guest-name" placeholder="Vor- und Nachname" maxlength="40" autocomplete="off" enterkeyhint="done">
      <button class="btn" data-act="guest-save">Hinzufügen</button></div>`, 'guest');
    setTimeout(() => $('#guest-name')?.focus(), 350);
  },
  'guest-toggle': async el => {
    const p = player(el.dataset.id), on = !p.active;
    el.disabled = true;
    try { D = await Store.setGuestActive(p.id, on, S.pw); indexPlayers(); toast(on ? `${p.name} wieder sichtbar` : `${p.name} ausgeblendet`); }
    catch (e) { toast('Fehler: ' + e.message); }
    render();
  },
  'guest-del': async el => {
    const p = player(el.dataset.id);
    if (el.dataset.used) {
      if (!p.active) return toast(`${p.name} hat schon Tore/Assists und ist bereits ausgeblendet`);
      if (!(await confirmBox('Nicht löschbar', `${esc(p.name)} hat schon Tore oder Assists. Löschen würde Spiele verfälschen.<br><br>Stattdessen ausblenden? Die Zahlen bleiben dann in der Statistik.`, 'Ausblenden'))) return;
      try { D = await Store.setGuestActive(p.id, false, S.pw); indexPlayers(); toast(`${p.name} ausgeblendet`); } catch (e) { toast('Fehler: ' + e.message); }
      return render();
    }
    if (!(await confirmBox('Gast löschen?', `${esc(p.name)} wird endgültig entfernt.`, 'Löschen', true))) return;
    try { D = await Store.deleteGuest(p.id, S.pw); indexPlayers(); toast(`${p.name} gelöscht`); } catch (e) { toast('Fehler: ' + e.message); }
    render();
  },
  'guest-save': async el => {
    const name = $('#guest-name').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return $('#guest-name').focus();
    if (D.players.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast(name + ' gibt es schon'); return; }
    const slug = name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    el.disabled = true; el.textContent = 'Speichere …';
    try {
      D = await Store.addPlayer({ id: 'gast-' + slug + '-' + uid().slice(-4), name, role: 'Gast', guest: true }, S.pw);
      indexPlayers(); closeSheet(); render(); toast(name + ' ist dabei');
    } catch (e) { el.disabled = false; el.textContent = 'Hinzufügen'; toast('Fehler: ' + e.message); }
  },
  'cancel-goal': () => { S.mode = 'scorer'; S.pending = null; render(); },
  step: el => { const d = draft(); if (el.dataset.v === 'result' && d.noTeams) return; d.step = el.dataset.v; S.mode = 'scorer'; S.pending = null; saveDraft(); render(); scrollTo({ top: 0, behavior: 'smooth' }); },
  'team-tap': el => {
    const d = draft(), id = el.dataset.id, t = d.teams;
    const inGoals = d.goals.some(x => x.s === id || x.a === id);
    const cur = t.alt.includes(id) ? 'alt' : t.jung.includes(id) ? 'jung' : null;
    const next = cur === null ? 'alt' : cur === 'alt' ? 'jung' : (inGoals ? 'alt' : null);
    if (cur === 'jung' && inGoals) toast(`${short(id)} hat schon Tore – erst das Tor löschen, um ihn rauszunehmen`);
    t.alt = t.alt.filter(x => x !== id); t.jung = t.jung.filter(x => x !== id);
    if (next) t[next].push(id);
    d.winner = null; buzz(10); saveDraft(); render();
  },
  'teams-last': () => {
    const d = draft(), g = D.games.slice().reverse().find(hasTeams);
    if (!g) return;
    const act = id => byId[id] && byId[id].active;
    d.teams = { alt: g.teams.alt.filter(act), jung: g.teams.jung.filter(act) }; d.winner = null;
    saveDraft(); render(); toast(`Teams vom ${new Date(g.date + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} übernommen – jetzt anpassen`);
  },
  'teams-clear': () => { const d = draft(); if (d.goals.length) return toast('Es gibt schon Tore – erst verwerfen'); d.teams = { alt: [], jung: [] }; saveDraft(); render(); },
  'no-teams': () => { const d = draft(); d.noTeams = true; d.winner = null; saveDraft(); render(); },
  'with-teams': () => { const d = draft(); d.noTeams = false; saveDraft(); render(); },
  winner: el => { const d = draft(); d.winner = el.dataset.v; buzz(15); saveDraft(); render(); },
  'del-goal': el => { draft().goals.splice(+el.dataset.i, 1); saveDraft(); render(); toast('Tor gelöscht'); },
  discard: async () => {
    if (!(await confirmBox('Verwerfen?', 'Alle Tore dieses Entwurfs werden entfernt.', 'Verwerfen', true))) return;
    S.draft = null; ls.del('h2ku-draft'); S.mode = 'scorer'; render();
  },
  'save-game': async el => {
    const d = draft();
    if (!draftReady(d)) return toast(d.noTeams ? 'Noch keine Tore eingetragen' : 'Bitte Teams und Sieger festlegen');
    const exists = !d.id && D.games.some(g => g.date === d.date);
    const win = autoWinner(d), sc = liveScore(d);
    const summary = d.noTeams ? `${d.goals.length} Tore · ohne Teams` : `Alt ${sc.alt} : ${sc.jung} Jung<br><b>${win === 'draw' ? 'Unentschieden' : 'Sieg ' + TEAMS[win].name}</b>`;
    if (!(await confirmBox('Spiel speichern?', `${new Date(d.date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}<br>${summary}${exists ? '<br><br><b>Achtung:</b> An diesem Tag gibt es schon ein Spiel. Es wird ein zweites angelegt.' : ''}`, 'Speichern'))) return;
    const btn = $('.save-bar .btn'); if (btn) { btn.disabled = true; btn.textContent = 'Speichere …'; }
    try {
      const game = { id: d.id || uid(), date: d.date, goals: d.goals };
      if (!d.noTeams) { game.teams = { alt: d.teams.alt, jung: d.teams.jung }; game.result = { winner: win, alt: sc.alt, jung: sc.jung }; }
      D = await Store.saveGame(game, S.pw);
      S.draft = null; ls.del('h2ku-draft'); S.mode = 'scorer';
      confetti(); buzz([30, 60, 30]); toast('Gespeichert – alle sehen es jetzt');
      S.tab = 'home'; S.scope = 'month'; S.month = d.date.slice(0, 7); render(true); scrollTo(0, 0);
    } catch (e) { toast('Fehler: ' + e.message); if (/passwort/i.test(e.message)) { S.pw = null; ls.del('h2ku-pw'); } render(); }
  },
  'edit-game': el => {
    const g = D.games.find(x => x.id === el.dataset.id);
    S.draft = { id: g.id, date: g.date, goals: g.goals.map(x => ({ ...x })), teams: hasTeams(g) ? { alt: [...g.teams.alt], jung: [...g.teams.jung] } : { alt: [], jung: [] },
      noTeams: !hasTeams(g), winner: g.result?.winner && g.result.winner !== (() => { const s2 = liveScore(g); return s2.alt > s2.jung ? 'alt' : s2.jung > s2.alt ? 'jung' : 'draw'; })() ? g.result.winner : null, step: 'goals' };
    saveDraft(); S.mode = 'scorer';
    render(); scrollTo({ top: 0, behavior: 'smooth' });
  },
  'del-game': async el => {
    const g = D.games.find(x => x.id === el.dataset.id);
    if (!(await confirmBox('Spiel löschen?', `Das Spiel vom ${new Date(g.date + 'T12:00').toLocaleDateString('de-DE')} mit ${g.goals.length} Toren wird entfernt – samt Kommentaren und Reaktionen.`, 'Löschen', true))) return;
    try { D = await Store.deleteGame(g.id, S.pw); toast('Spiel gelöscht'); } catch (e) { toast('Fehler: ' + e.message); }
    render();
  },
  'demo-reset': () => { D = Store.resetDemo(false); indexPlayers(); toast('Beispieldaten geladen'); render(); },
  'demo-empty': async () => { if (!(await confirmBox('Alles leeren?', 'Alle Spiele und Stimmen auf diesem Gerät werden entfernt.', 'Leeren', true))) return; D = Store.resetDemo(true); indexPlayers(); render(); }
};
function addGoal(s, a) {
  draft().goals.push({ s, a }); saveDraft();
  S.mode = 'scorer'; S.pending = null;
  buzz(35);
  render();
  const t = $('#t-' + s); t?.classList.add('flash');
  toast(`Tor ${short(s)}${a ? ' ← ' + short(a) : ''}`);
}
function scrollToPrompt() { const p = $('.prompt'); if (p && p.getBoundingClientRect().top < 60) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('input', e => {
  const k = e.target.dataset.input;
  if (k === 'filter') { S.filter = e.target.value; const pos = e.target.selectionStart; render(); const inp = $('.search'); inp.focus(); inp.setSelectionRange(pos, pos); }
  if (k === 'date') { draft().date = e.target.value || isoDate(TODAY); saveDraft(); }
  if (k === 'cm') S.cmDraft[e.target.dataset.g] = e.target.value;
  if (k === 'rate') { const o = document.getElementById('rv-' + e.target.dataset.k); if (o) o.textContent = e.target.value; }
  if (k === 'bestnote') { const b = draft().goals.find(x => x.best); if (b) { b.note = e.target.value.slice(0, 120); saveDraft(); } }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pw') actions.login($('[data-act=login]')); if (e.key === 'Enter' && e.target.id === 'guest-name') actions['guest-save']($('[data-act=guest-save]')); if (e.key === 'Enter' && e.target.id === 'pin1' && !$('#pin2')) actions['login-go']($('[data-act=login-go]')); if (e.key === 'Enter' && e.target.id === 'pin2') actions['login-go']($('[data-act=login-go]')); if (e.key === 'Enter' && e.target.dataset.input === 'cm') { e.preventDefault(); actions['cm-send']($(`[data-act=cm-send][data-g="${e.target.dataset.g}"]`)); } if (e.key === 'Escape') closeSheet(); });
// Beim Tippen in ein Kommentarfeld: zuerst fragen, wer man ist

// Chart-Tooltip
document.addEventListener('pointerover', e => {
  const g = e.target.closest?.('.cg'); const chart = e.target.closest?.('.chart');
  chart?.querySelector('.tip')?.remove();
  if (!g) return;
  const svg = chart.querySelector('svg'), k = svg.getBoundingClientRect().width / 340;
  const tip = document.createElement('div'); tip.className = 'tip'; tip.textContent = g.dataset.tip;
  tip.style.left = Math.min(Math.max(g.dataset.x * k, 70), svg.getBoundingClientRect().width - 70) + 'px'; tip.style.top = '30px';
  chart.appendChild(tip);
});
window.addEventListener('resize', () => document.querySelectorAll('.seg').forEach(placeKnob));
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });

/* ============================================================
   ANMELDUNG – Spieler mit PIN oder Gast
   ============================================================ */
function setMe(v) {
  S.me = v && v !== 'guest' ? v.id : null; S.pin = v && v !== 'guest' ? v.pin : null; S.guest = v === 'guest';
  Store.me = S.me ? { id: S.me, pin: S.pin } : null;
  if (v) ls.set('h2ku-me2', v); else ls.del('h2ku-me2');
  renderMeBtn();
}
function renderMeBtn() {
  const b = $('#me-btn'); if (!b) return;
  b.innerHTML = S.me ? imgTag(face(S.me), S.me) : S.guest ? I.eye : '?';
  b.title = S.me ? 'Angemeldet: ' + player(S.me).name : 'Anmelden';
}
function askLogin() {
  confirmBox('Nur für Spieler', 'Abstimmen, kommentieren, liken und reagieren können nur angemeldete Spieler aus dem Kader.', 'Jetzt anmelden').then(ok => { if (ok) { setMe(null); showLogin(); } });
}
function loginShell(html) {
  let el = $('#login');
  if (!el) { el = document.createElement('div'); el.id = 'login'; el.className = 'login'; document.body.appendChild(el); document.body.style.overflow = 'hidden'; }
  el.innerHTML = `<div class="login-in">${html}</div>`;
  el.scrollTop = 0;
}
function hideLogin() { const el = $('#login'); if (!el) return; el.classList.add('out'); document.body.style.overflow = ''; setTimeout(() => el.remove(), 250); }
function showLogin() {
  const people = D.players.filter(p => p.active && !p.guest).sort((a, b) => (!!a.role - !!b.role) || (a.no ?? 999) - (b.no ?? 999) || a.name.localeCompare(b.name));
  loginShell(`<img src="img/crest.png" alt="" class="login-crest"><h1>Kicker<span>stats</span></h1>
    <p class="login-sub">Willkommen! <b>Wer bist du?</b></p>
    <div class="vgrid">${people.map(p => `<div class="vc" data-act="login-pick" data-id="${p.id}">${imgTag(face(p.id), p.id)}<b>${esc(short(p.id))}</b>${p.no != null ? `<span>#${p.no}</span>` : `<span>${esc(p.role || '')}</span>`}</div>`).join('')}</div>
    <button class="btn ghost" data-act="login-guest" style="margin-top:16px">${I.eye} Nicht im Kader – als Gast zuschauen</button>
    <p class="login-hint">Deine Auswahl merkt sich das Handy. Du kannst sie oben rechts jederzeit ändern.</p>`);
}
function loginPin(pid) {
  const p = player(pid), known = Store.online ? p.hasPin : !!D.pins?.[pid];
  loginShell(`<button class="login-back" data-act="login-back">‹ Zurück</button>
    ${imgTag(face(pid), pid, 'login-face')}<h2>${esc(p.name)}</h2>
    <p class="login-sub">${known ? 'Gib deine 4-stellige PIN ein.' : 'Lege deine persönliche <b>4-stellige PIN</b> fest.<br>Damit kann niemand in deinem Namen abstimmen oder kommentieren. Du brauchst sie nur, wenn du dich auf einem anderen Handy anmeldest.'}</p>
    <input class="pw" id="pin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="PIN" autocomplete="off" enterkeyhint="${known ? 'go' : 'next'}">
    ${known ? '' : '<input class="pw" id="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="PIN wiederholen" autocomplete="off" enterkeyhint="go">'}
    <div id="login-err" class="login-err"></div>
    <button class="btn" data-act="login-go" data-id="${pid}">Los geht’s</button>
    ${known ? '<p class="login-hint">PIN vergessen? Sag dem Statistik-Verantwortlichen Bescheid – er setzt sie zurück.</p>' : ''}`);
  setTimeout(() => $('#pin1')?.focus(), 200);
}

/* ============================================================
   START
   ============================================================ */
function indexPlayers() { Object.keys(byId).forEach(k => delete byId[k]); D.players.forEach(p => byId[p.id] = p); }
function setSync(state, text) { const s = $('#sync'); s.className = 'sync ' + state; s.querySelector('span').textContent = text; }
async function refresh() {
  if (!Store.online) { setSync('off', 'Prototyp'); return; }
  setSync('busy', 'Lädt …');
  try { D = await Store.load(); indexPlayers(); renderMeBtn(); if (S.me && !byId[S.me]) { setMe(null); showLogin(); } if (!document.activeElement?.matches?.('main input, #login input')) render(); if ($('#login') && !$('#pin1')) showLogin(); setSync('', new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })); }
  catch { setSync('off', 'Offline'); }
}
(async function init() {
  const saved = ls.get('h2ku-me2', null);
  if (saved) { S.me = saved !== 'guest' ? saved.id : null; S.pin = saved.pin || null; S.guest = saved === 'guest'; Store.me = S.me ? { id: S.me, pin: S.pin } : null; }
  if (Store.online) { const c = Store.cacheRead(); D = Store.normalize(c); }
  else D = await Store.load();
  indexPlayers();
  render(true);
  renderMeBtn();
  if (!S.me && !S.guest) showLogin();
  refresh();
  $('#sync').addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // Neue Fassung verfügbar → einmal automatisch neu laden (nur wenn vorher schon eine Fassung aktiv war)
    const hadOld = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadOld && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      reg.update().catch(() => {});
      // Homescreen-Apps werden selten neu geladen: bei jedem Zurückkehren nach Updates schauen
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
})();
