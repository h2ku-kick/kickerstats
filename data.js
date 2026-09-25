/* ============================================================
   KONFIGURATION
   API_URL leer lassen  = Prototyp, Daten nur auf diesem Gerät.
   API_URL eintragen    = Google-Skript-Adresse, alle sehen denselben Stand.
   ============================================================ */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz9LEE6h1V_0QVTn24J2wZ2KXo_w7vnzKLSbaBd4soOlBxICUSZVo19IxVKtM132qIW/exec',
  VOTE_DAYS_AFTER_MONTH: 7,   // Abstimmung läuft bis zum 7. des Folgemonats
  LOCAL_PASSWORD: ''          // leer: das Passwort prüft das Google-Skript (Tabelle, Blatt Einstellungen)
};

/* Kader 1. Männer 2026/27 (Quelle: sgh2ku.com). Nummern laut Mannschaftsfoto. */
const DEFAULT_PLAYERS = [
  { id: 'david-herz',           name: 'David Herz',           no: 1 },
  { id: 'nico-sauer',           name: 'Nico Sauer',           no: 16 },
  { id: 'sebastian-rica-kovac', name: 'Sebastian Rica-Kovac', no: 23 },
  { id: 'alexander-kohler',     name: 'Alexander Kohler',     no: 2 },
  { id: 'luca-kaelbly',         name: 'Luca Kälbly',          no: 4 },
  { id: 'lennart-lohrer',       name: 'Lennart Lohrer',       no: 5 },
  { id: 'leon-fischer',         name: 'Leon Fischer',         no: 10 },
  { id: 'finn-boehm',           name: 'Finn Böhm',            no: 11 },
  { id: 'kenneth-stiegen',      name: 'Kenneth Stiegen',      no: 13 },
  { id: 'philipp-bietsch',      name: 'Philipp Bietsch',      no: 17 },
  { id: 'tim-frommer',          name: 'Tim Frommer',          no: 24 },
  { id: 'sven-jacobs',          name: 'Sven Jacobs',          no: 33 },
  { id: 'lukas-krebs',          name: 'Lukas Krebs',          no: 47 },
  { id: 'yannick-bross',        name: 'Yanick Broß',          no: 73 },
  { id: 'paul-lewe',            name: 'Paul Lewe',            no: 74 },
  { id: 'linus-kretschmann',    name: 'Linus Kretschmann',    no: 44 },
  { id: 'marco-melo',           name: 'Marco Melo',           role: 'Trainer' },
  { id: 'chris-duerner',        name: 'Chris Dürner',         role: 'Co-Trainer' },
  { id: 'andreas-vogt',         name: 'Andreas Vogt',         role: 'Torwart-Trainer' },
];

/* ---------- kleine Helfer ---------- */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function rng(seed) { // deterministischer Zufall (mulberry32)
  let a = typeof seed === 'number' ? seed : [...String(seed)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function deviceId() {
  try {
    let id = localStorage.getItem('h2ku-device');
    if (!id) { id = 'd-' + uid(); localStorage.setItem('h2ku-device', id); }
    return id;
  } catch { return 'd-temp'; }
}

/* ---------- Demo-Daten für den Prototyp ---------- */
function buildDemo() {
  const r = rng(2627);
  const field = DEFAULT_PLAYERS.filter(p => !p.role);
  const weight = p => ({ 'leon-fischer': 2.2, 'tim-frommer': 1.9, 'kenneth-stiegen': 1.7, 'luca-kaelbly': 1.5, 'finn-boehm': 1.4 }[p.id] || 1);
  const pool = [...field, ...DEFAULT_PLAYERS.filter(p => p.role).slice(0, 2)];
  const pick = (excl) => {
    const list = pool.filter(p => p.id !== excl);
    const tot = list.reduce((s, p) => s + (p.role ? 0.4 : weight(p)), 0);
    let x = r() * tot;
    for (const p of list) { x -= (p.role ? 0.4 : weight(p)); if (x <= 0) return p.id; }
    return list[0].id;
  };
  const games = [];
  const start = new Date(2026, 6, 7);
  const end = new Date(2026, 8, 24);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (![2, 4].includes(d.getDay()) || r() < 0.2) continue;
    const n = 5 + Math.floor(r() * 9);
    const goals = [];
    for (let i = 0; i < n; i++) {
      const s = pick();
      goals.push({ s, a: r() < 0.62 ? pick(s) : null });
    }
    games.push({ id: 'demo-' + games.length, date: isoDate(d), goals });
  }
  const votes = [];
  const cands = ['leon-fischer', 'tim-frommer', 'kenneth-stiegen', 'luca-kaelbly', 'david-herz'];
  const voters = DEFAULT_PLAYERS.map(p => p.id);
  voters.slice(0, 16).forEach(v => votes.push({ month: '2026-07', voter: v, pick: cands[Math.floor(r() * r() * cands.length)] }));
  voters.slice(2, 17).forEach(v => votes.push({ month: '2026-08', voter: v, pick: cands[Math.floor(r() * 3.4) % cands.length] }));
  return { players: DEFAULT_PLAYERS, games, votes, demo: true };
}
function isoDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* ============================================================
   STORE – eine Schnittstelle, zwei Betriebsarten
   ============================================================ */
const Store = {
  get online() { return !!CONFIG.API_URL; },
  data: null,
  me: null,                                   // { id, pin } des angemeldeten Spielers
  cred() { return this.me ? { pid: this.me.id, pin: this.me.pin } : {}; },

  cacheRead() { try { return JSON.parse(localStorage.getItem('h2ku-data')); } catch { return null; } },
  cacheWrite(d) { try { localStorage.setItem('h2ku-data', JSON.stringify(d)); } catch {} },

  normalize(d) {
    d = d || {};
    const players = (d.players && d.players.length ? d.players : DEFAULT_PLAYERS).map(p => ({ ...p, active: p.active !== false, guest: !!p.guest }));
    return { players, games: (d.games || []).slice().sort((a, b) => a.date.localeCompare(b.date)), votes: d.votes || [],
      reactions: d.reactions || [], comments: d.comments || [], months: d.months || [], pins: d.pins || {}, demo: !!d.demo };
  },

  /* Sofort aus dem Speicher des Geräts, dann (online) frisch nachladen */
  async load() {
    const cached = this.cacheRead();
    if (!this.online) {
      const base = cached || buildDemo();
      // Prototyp: Kader immer aus DEFAULT_PLAYERS, nur selbst angelegte Gäste aus dem Gerätespeicher übernehmen
      base.players = [...DEFAULT_PLAYERS, ...(base.players || []).filter(p => p.guest)];
      this.data = this.normalize(base);
      this.cacheWrite(this.data);
      return this.data;
    }
    if (cached) this.data = this.normalize(cached);
    const res = await fetch(CONFIG.API_URL + '?action=all&me=' + encodeURIComponent(this.me?.id || '') + '&t=' + Date.now());
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Laden fehlgeschlagen');
    this.data = this.normalize(json.data);
    this.cacheWrite(this.data);
    return this.data;
  },

  async post(body) {
    // text/plain vermeidet den CORS-Preflight, den Google-Skripte nicht beantworten
    const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Fehler');
    return json;
  },

  async claim(pid, pin) {
    if (this.online) { await this.post({ action: 'claim', pid, pin }); return true; }
    const pins = this.data.pins;
    if (!pins[pid]) { pins[pid] = pin; this.cacheWrite(this.data); return true; }
    if (pins[pid] !== pin) throw new Error('Falsche PIN');
    return true;
  },

  async login(pw) {
    if (!this.online) return pw === CONFIG.LOCAL_PASSWORD;
    try { await this.post({ action: 'login', pw }); return true; } catch { return false; }
  },

  async saveGame(game, pw) {
    if (this.online) { await this.post({ action: 'saveGame', pw, game }); return this.load(); }
    const i = this.data.games.findIndex(g => g.id === game.id);
    if (i >= 0) this.data.games[i] = game; else this.data.games.push(game);
    this.data = this.normalize(this.data); this.cacheWrite(this.data);
    return this.data;
  },

  async addPlayer(p, pw) {
    if (this.online) { await this.post({ action: 'addPlayer', pw, player: p }); return this.load(); }
    this.data.players.push({ ...p, active: true });
    this.cacheWrite(this.data);
    return this.data;
  },

  async setGuestActive(id, active, pw) {
    if (this.online) { await this.post({ action: 'setGuestActive', pw, id, active }); return this.load(); }
    const p = this.data.players.find(x => x.id === id && x.guest);
    if (p) p.active = active;
    this.cacheWrite(this.data);
    return this.data;
  },

  async deleteGuest(id, pw) {
    if (this.online) { await this.post({ action: 'deleteGuest', pw, id }); return this.load(); }
    if (this.data.games.some(g => g.goals.some(x => x.s === id || x.a === id))) throw new Error('Hat schon Tore oder Assists – bitte ausblenden statt löschen');
    this.data.players = this.data.players.filter(x => x.id !== id);
    this.cacheWrite(this.data);
    return this.data;
  },

  async deleteGame(id, pw) {
    if (this.online) { await this.post({ action: 'deleteGame', pw, id }); return this.load(); }
    this.data.games = this.data.games.filter(g => g.id !== id);
    this.data.comments = this.data.comments.filter(c => c.g !== id);
    this.data.reactions = this.data.reactions.filter(r => r.g !== id);
    this.cacheWrite(this.data);
    return this.data;
  },

  async vote(month, pick) {
    if (!this.me) throw new Error('Bitte als Spieler anmelden');
    if (pick === this.me.id) throw new Error('Für dich selbst kannst du nicht stimmen 😉');
    if (this.online) { await this.post({ action: 'vote', month, pick, ...this.cred() }); return this.load(); }
    this.data.votes = this.data.votes.filter(v => !(v.month === month && v.voter === this.me.id));
    this.data.votes.push({ month, pick, voter: this.me.id });
    this.cacheWrite(this.data);
    return this.data;
  },

  /* ---------- Reaktionen, Kommentare, Likes (sofort sichtbar, dann gespeichert) ---------- */
  toggleReact(g, e) {
    const r = this.data.reactions.find(x => x.g === g && x.e === e);
    if (r && r.mine) { r.n--; r.mine = false; if (r.n <= 0) this.data.reactions = this.data.reactions.filter(x => x !== r); }
    else if (r) { r.n++; r.mine = true; }
    else this.data.reactions.push({ g, e, n: 1, mine: true });
  },
  async react(g, e) {
    this.toggleReact(g, e); this.cacheWrite(this.data);
    if (this.online) { try { await this.post({ action: 'react', game: g, emoji: e, ...this.cred() }); } catch (err) { this.toggleReact(g, e); this.cacheWrite(this.data); throw err; } }
    return this.data;
  },
  toggleLike(id) {
    const c = this.data.comments.find(x => x.id === id); if (!c) return;
    c.liked = !c.liked; c.likes += c.liked ? 1 : -1;
  },
  async like(id) {
    this.toggleLike(id); this.cacheWrite(this.data);
    if (this.online) { try { await this.post({ action: 'like', id, ...this.cred() }); } catch (err) { this.toggleLike(id); this.cacheWrite(this.data); throw err; } }
    return this.data;
  },
  async comment(g, pid, text) {
    let id = 'c-' + uid();
    if (this.online) id = (await this.post({ action: 'comment', game: g, text, ...this.cred() })).id;
    this.data.comments.push({ id, g, pid, text, t: new Date().toISOString(), mine: true, likes: 0, liked: false });
    this.cacheWrite(this.data);
    return this.data;
  },
  async deleteComment(id, pw) {
    if (this.online) await this.post({ action: 'deleteComment', id, pw: pw || undefined, ...(pw ? {} : this.cred()) });
    this.data.comments = this.data.comments.filter(x => x.id !== id);
    this.cacheWrite(this.data);
    return this.data;
  },
  async setFlop(month, flop, note, pw) {
    if (this.online) { await this.post({ action: 'setFlop', pw, month, flop, note }); return this.load(); }
    this.data.months = this.data.months.filter(x => x.m !== month);
    if (flop) this.data.months.push({ m: month, flop, note });
    this.cacheWrite(this.data);
    return this.data;
  },

  resetDemo(empty) {
    this.data = this.normalize(empty ? { players: DEFAULT_PLAYERS } : buildDemo());
    this.cacheWrite(this.data);
    return this.data;
  }
};
