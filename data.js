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
    return { players, games: (d.games || []).slice().sort((a, b) => a.date.localeCompare(b.date)), votes: (d.votes || []).map(v => ({ ...v, type: v.type === 'flop' ? 'flop' : 'potm' })),
      reactions: d.reactions || [], comments: d.comments || [], months: d.months || [], pins: d.pins || {}, demo: !!d.demo,
      ratings: { agg: (d.ratings && d.ratings.agg) || {}, mine: (d.ratings && d.ratings.mine) || {} },
      drafts: (d.drafts || []).slice().sort((a, b) => b.date.localeCompare(a.date)) };
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
    if (this.queue.length) { this.flush(); return this.data; }
    const res = await fetch(CONFIG.API_URL + '?action=all&me=' + encodeURIComponent(this.me?.id || '') + '&t=' + Date.now());
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Laden fehlgeschlagen');
    this.data = this.normalize(json.data);
    this.fresh = true;                          // aktueller Stand vom Server ist da
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

  /* ---------- Speichern im Hintergrund ----------
     Änderung sofort auf dem Gerät übernehmen, dann der Reihe nach zum Server schicken.
     Die Warteschlange liegt im Gerätespeicher – geht die App zu, wird beim nächsten Start weitergemacht.
     Klappt etwas nicht, meldet onFail den Grund und der Serverstand wird neu geladen. */
  queue: (() => { try { return JSON.parse(localStorage.getItem('h2ku-queue')) || []; } catch { return []; } })(),
  idMap: {},                                  // vorläufige ID auf dem Gerät → echte ID vom Server
  running: false,
  onState: null, onSynced: null, onFail: null,
  saveQueue() { try { localStorage.setItem('h2ku-queue', JSON.stringify(this.queue)); } catch {} },
  get pending() { return this.queue.length; },
  bg(body, local) {
    local(); this.data = this.normalize(this.data); this.cacheWrite(this.data);
    if (this.online) { this.queue.push(body); this.saveQueue(); this.flush(); }
    return this.data;
  },
  async flush() {
    if (this.running || !this.queue.length) return;
    this.running = true; this.onState?.(this.pending);
    let failed = false;
    while (this.queue.length) {
      const body = { ...this.queue[0] };
      ['id', 'game'].forEach(k => { if (typeof body[k] === 'string' && this.idMap[body[k]]) body[k] = this.idMap[body[k]]; });
      let res, err;
      for (let n = 0; n < 3; n++) {
        try { res = await this.post(body); err = null; break; }
        catch (e) { err = e; if (!(e instanceof TypeError)) break; await new Promise(r => setTimeout(r, 2000 * (n + 1))); }   // nur bei Netzfehlern nochmal
      }
      if (err instanceof TypeError) { this.running = false; this.onState?.(this.pending, 'offline'); return; }   // kein Netz: später weiter
      if (err) { failed = true; this.onFail?.(err.message); }
      else if (body._tmp && res && res.id) this.idMap[body._tmp] = res.id;
      this.queue.shift(); this.saveQueue(); this.onState?.(this.pending);
    }
    this.running = false;
    try { await this.load(); this.onSynced?.(failed); } catch { this.onState?.(0, 'offline'); }
  },

  saveGame(game, pw) {
    return this.bg({ action: 'saveGame', pw, game }, () => {
      const i = this.data.games.findIndex(g => g.id === game.id);
      if (i >= 0) this.data.games[i] = game; else this.data.games.push(game);
    });
  },

  addPlayer(p, pw) {
    return this.bg({ action: 'addPlayer', pw, player: p }, () => this.data.players.push({ ...p, active: true }));
  },

  setGuestActive(id, active, pw) {
    return this.bg({ action: 'setGuestActive', pw, id, active }, () => {
      const p = this.data.players.find(x => x.id === id && x.guest);
      if (p) p.active = active;
    });
  },

  deleteGuest(id, pw) {
    if (this.data.games.some(g => g.goals.some(x => x.s === id || x.a === id))) throw new Error('Hat schon Tore oder Assists – bitte ausblenden statt löschen');
    return this.bg({ action: 'deleteGuest', pw, id }, () => { this.data.players = this.data.players.filter(x => x.id !== id); });
  },

  deleteGame(id, pw) {
    return this.bg({ action: 'deleteGame', pw, id }, () => {
      this.data.games = this.data.games.filter(g => g.id !== id);
      this.data.comments = this.data.comments.filter(c => c.g !== id);
      this.data.reactions = this.data.reactions.filter(r => r.g !== id);
    });
  },

  vote(month, pick, type = 'potm') {
    if (!this.me) throw new Error('Bitte als Spieler anmelden');
    if (pick === this.me.id) throw new Error('Für dich selbst kannst du nicht stimmen');
    return this.bg({ action: 'vote', month, pick, type, ...this.cred() }, () => {
      this.data.votes = this.data.votes.filter(v => !(v.month === month && v.voter === this.me.id && v.type === type));
      this.data.votes.push({ month, pick, voter: this.me.id, type });
    });
  },

  /* ---------- Reaktionen, Kommentare, Likes ---------- */
  toggleReact(g, e) {
    const r = this.data.reactions.find(x => x.g === g && x.e === e);
    if (r && r.mine) { r.n--; r.mine = false; if (r.n <= 0) this.data.reactions = this.data.reactions.filter(x => x !== r); }
    else if (r) { r.n++; r.mine = true; }
    else this.data.reactions.push({ g, e, n: 1, mine: true });
  },
  react(g, e) { return this.bg({ action: 'react', game: g, emoji: e, ...this.cred() }, () => this.toggleReact(g, e)); },
  toggleLike(id) {
    const c = this.data.comments.find(x => x.id === id); if (!c) return;
    c.liked = !c.liked; c.likes += c.liked ? 1 : -1;
  },
  like(id) { return this.bg({ action: 'like', id, ...this.cred() }, () => this.toggleLike(id)); },
  comment(g, pid, text) {
    const id = 'c-' + uid();
    return this.bg({ action: 'comment', game: g, text, _tmp: id, ...this.cred() }, () =>
      this.data.comments.push({ id, g, pid, text, t: new Date().toISOString(), mine: true, likes: 0, liked: false }));
  },
  deleteComment(id, pw) {
    return this.bg({ action: 'deleteComment', id, pw: pw || undefined, ...(pw ? {} : this.cred()) }, () => { this.data.comments = this.data.comments.filter(x => x.id !== id); });
  },
  rate(target, vals) {
    if (!this.me) throw new Error('Bitte als Spieler anmelden');
    if (target === this.me.id) throw new Error('Dich selbst kannst du nicht bewerten');
    return this.bg({ action: 'rate', target, ...vals, ...this.cred() }, () => {
      const r = this.data.ratings, old = r.mine[target], a = r.agg[target] || (r.agg[target] = { n: 0, tem: 0, dri: 0, abw: 0 });
      ['tem', 'dri', 'abw'].forEach(k => { const sum = a[k] * a.n - (old ? old[k] : 0) + vals[k]; a[k] = Math.round(sum / (a.n + (old ? 0 : 1)) * 10) / 10; });
      if (!old) a.n++;
      r.mine[target] = { ...vals };
    });
  },

  /* ---------- Live-Spiele (warten auf Freigabe) ---------- */
  submitDraft(game) {
    if (!this.me) throw new Error('Bitte als Spieler anmelden');
    const id = 'live-' + uid();
    return this.bg({ action: 'submitDraft', game, _tmp: id, ...this.cred() }, () =>
      this.data.drafts.unshift({ id, date: game.date, by: this.me.id, t: new Date().toISOString(), game }));
  },
  deleteDraft(id, pw) {
    return this.bg({ action: 'deleteDraft', id, ...(pw ? { pw } : this.cred()) }, () => { this.data.drafts = this.data.drafts.filter(x => x.id !== id); });
  },
  approveDraft(id, pw) {
    const d = this.data.drafts.find(x => x.id === id); if (!d) throw new Error('Live-Spiel nicht gefunden');
    return this.bg({ action: 'approveDraft', id, pw }, () => {
      this.data.drafts = this.data.drafts.filter(x => x.id !== id);
      this.data.games.push({ ...d.game, id });
    });
  },

  setFlop(month, flop, note, pw) {
    return this.bg({ action: 'setFlop', pw, month, flop, note }, () => {
      this.data.months = this.data.months.filter(x => x.m !== month);
      if (flop) this.data.months.push({ m: month, flop, note });
    });
  },

  resetDemo(empty) {
    this.data = this.normalize(empty ? { players: DEFAULT_PLAYERS } : buildDemo());
    this.cacheWrite(this.data);
    return this.data;
  }
};
