/* ============================================================
   KICK7 – Manager-Spiel à la Kickbase / Start 7
   Kader aus 10 Spielern: 7 auf dem Feld (Torwart + Formation), 3 auf der Bank.
   Es zählt die Aufstellung in dem Moment, in dem ein Spiel eingetragen (bzw. ein Live-Spiel gestoppt) wird.
   Jeder darf jeden kaufen (auch sich selbst). Gekauft und verkauft wird zum Marktwert.
   Punkte und Marktwert rechnet der Server genauso (Code.gs) – dort wird der Preis geprüft.
   ============================================================ */
const MGR = { BUDGET: 50, SQUAD: 10, FIELD: 7, WINDOW: 5, PAD: 1.5, POTM: 10, FLOP: -5, BASE: 1, PER_PT: 0.1, FEE: 0.05 };
const FORMATIONS = ['3-2-1', '2-3-1', '2-2-2', '3-1-2', '3-3'];

// Punkte eines Spielers in einem Spiel – null = nicht dabei.
// Torwart: +4 pro Team (geteilt durch die Zahl der Torhüter), je eigenes Gegentor −1, zu null +3, Sieg +1 extra.
// gk = steht in der Kick7-Aufstellung auf der TW-Position → +2
function fpts(g, id, gk = false) {
  const t = g.teams && (g.teams.alt || []).length + (g.teams.jung || []).length ? (g.teams.alt.indexOf(id) >= 0 ? 'alt' : g.teams.jung.indexOf(id) >= 0 ? 'jung' : null) : null;
  const inv = g.goals.some(x => x.s === id || x.a === id);
  if (!t && !inv) return null;
  let p = 1;                                                   // dabei
  g.goals.forEach(x => { if (x.s === id) p += 4 + (x.best ? 3 : 0); if (x.a === id) p += 3; });
  if (t && g.result && g.result.winner === t) p += 2;          // Sieg
  const c = g.conceded || {};
  if (t && Object.prototype.hasOwnProperty.call(c, id)) {     // stand im Tor
    const mates = Object.keys(c).filter(k => (g.teams[t] || []).indexOf(k) >= 0).length || 1;
    p += Math.floor(4 / mates) - (Number(c[id]) || 0);          // Torwart-Bonus (geteilt), je Gegentor −1
    const opp = g.result ? (t === 'alt' ? g.result.jung : g.result.alt) : null;
    if (opp === 0) p += 3;                                     // zu null
    if (g.result && g.result.winner === t) p += 1;             // Sieg als Torwart
  }
  if (gk) p += 2;                                              // TW-Position
  return p;
}
// Marktwert in Mio. aus den letzten 5 Spielen – das neueste zählt am meisten. Nicht dabei = 0 Punkte, schlechte Spiele drücken den Wert.
function marketValue(id, games) {
  const W = [5, 4, 3, 2, 1], last = games.slice(-MGR.WINDOW).reverse();
  let sum = 0;
  for (let i = 0; i < MGR.WINDOW; i++) sum += W[i] * (i < last.length ? (fpts(last[i], id) || 0) : MGR.PAD);
  return Math.max(0.5, Math.min(25, Math.round((1 + 2 * sum / 15) * 10) / 10));
}

const mio = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') + ' Mio';
const mvNow = id => marketValue(id, D.games);
const mvTrend = id => D.games.length ? Math.round((mvNow(id) - marketValue(id, D.games.slice(0, -1))) * 10) / 10 : 0;
const trendHtml = d => d > 0 ? `<span class="mg-up">▲ ${String(d).replace('.', ',')}</span>` : d < 0 ? `<span class="mg-down">▼ ${String(-d).replace('.', ',')}</span>` : '<span class="mg-flat">–</span>';

/* Aufstellung und Kasse aus dem Aktions-Log EINES Managers (chronologisch); nur Aktionen vor "before" (ms).
   line.s: 7 Plätze, [0] = Torwart. Neu gekaufte Spieler rücken auf einen freien Platz, sonst auf die Bank. */
function gameAt(g) { return g.at ? Date.parse(g.at) : new Date(g.date + 'T23:59:59').getTime(); }
function mgrLog(txs, before) {
  const s = { squad: [], cap: null, cash: MGR.BUDGET, line: { f: FORMATIONS[0], s: [] } };
  for (let i = 0; i < MGR.FIELD; i++) s.line.s.push('');
  txs.forEach(x => {
    if (before && Date.parse(x.t) >= before) return;
    if (x.op === 'buy') { s.squad.push(x.player); s.cash -= x.price; const i = s.line.s.indexOf(''); if (i >= 0) s.line.s[i] = x.player; }
    if (x.op === 'sell') { s.squad = s.squad.filter(p => p !== x.player); s.cash += x.price; if (s.cap === x.player) s.cap = null; s.line.s = s.line.s.map(p => p === x.player ? '' : p); }
    if (x.op === 'cap') s.cap = x.player;
    if (x.op === 'line') { try { const l = JSON.parse(x.player); if (FORMATIONS.indexOf(l.f) >= 0) s.line.f = l.f; s.line.s = s.line.s.map((_, i) => s.squad.indexOf(l.s[i]) >= 0 ? l.s[i] : ''); } catch (e) {} }
  });
  s.bench = s.squad.filter(p => s.line.s.indexOf(p) < 0);
  return s;
}
// Punkte der Aufstellung in einem Spiel: nur Feldspieler, Kapitän doppelt, TW-Position +2
function lineupPts(txs, g) {
  const s = mgrLog(txs, gameAt(g)); let p = 0, field = 0; const det = [];
  s.line.s.forEach((id, i) => { if (!id) return; field++; const v = fpts(g, id, i === 0); if (v == null) return; const f = id === s.cap ? 2 : 1; p += v * f; det.push({ id, v: v * f, cap: f === 2, gk: i === 0 }); });
  return { p, det, field, has: s.squad.length > 0 };
}
// Spieltagsprämie: Grundgehalt (wenn jemand auf dem Feld steht) + 0,1 Mio je Punkt
function prizeOf(r) { return r.field ? Math.round((MGR.BASE + Math.max(0, r.p) * MGR.PER_PT) * 10) / 10 : 0; }
function mgrCash(txs, games, before) {
  const s = mgrLog(txs, before); let inc = 0;
  games.forEach(g => { if (before && gameAt(g) >= before) return; inc += prizeOf(lineupPts(txs, g)); });
  s.income = Math.round(inc * 10) / 10; s.cash = Math.round((s.cash + inc) * 10) / 10;
  return s;
}
const sellPrice = mv => Math.round(mv * (1 - MGR.FEE) * 10) / 10;
const txsOf = pid => (D.mgr || []).filter(x => x.pid === pid);
// Zwischenspeicher – wird bei jedem neuen Datenstand (neues D-Objekt) geleert
let _mm = { d: null, st: {} };
function mgrState(pid, before) {
  if (_mm.d !== D) _mm = { d: D, st: {} };
  const k = pid + '|' + (before || ''); return _mm.st[k] ||= mgrCash(txsOf(pid), D.games, before);
}
const managers = () => [...new Set((D.mgr || []).map(x => x.pid))].filter(id => byId[id]);
const joined = pid => !!pid && (D.mgr || []).some(x => x.pid === pid);   // hat "Teilnehmen" getippt

// Punkte eines Managers je Spiel (+ Monatsbonus für Spieler/Flop des Monats)
function mgrPoints(pid, games = D.games) {
  const txs = txsOf(pid);
  const tips = tipsOf(pid), prev = prevAtMap();
  const per = games.map(g => { const r = lineupPts(txs, g), tip = tipFor(tips, g, prev[g.id] || 0), tp = tipPts(tip, g); return { g, ...r, prize: prizeOf(r), tip, tp, has: r.has || !!tip }; });
  const months = [...new Set(games.map(g => g.date.slice(0, 7)))];
  let bonus = 0; const bon = [];
  months.forEach(m => {
    const last = D.games.filter(g => g.date.startsWith(m)).pop(); if (!last) return;
    const s = mgrLog(txs, gameAt(last)), pm = potmOf(m), fl = flopOf(m);
    if (pm) pm.ids.filter(id => s.squad.includes(id)).forEach(id => { bonus += MGR.POTM; bon.push({ m, id, v: MGR.POTM }); });
    if (fl) fl.ids.filter(id => s.squad.includes(id)).forEach(id => { bonus += MGR.FLOP; bon.push({ m, id, v: MGR.FLOP }); });
  });
  return { total: per.reduce((t, x) => t + x.p + x.tp.p, 0) + bonus, per, bonus, bon };
}
// Bester Manager der Saison bekommt die Kick7-Karte (nur bei eindeutiger Führung mit Punkten)
let _k7 = { d: null, id: null };
function kick7King() {
  if (_k7.d === D) return _k7.id;
  const t = managers().length ? mgrTable('all') : [];
  _k7 = { d: D, id: t[0] && t[0].pts > 0 && (!t[1] || t[1].pts < t[0].pts) ? t[0].pid : null };
  return _k7.id;
}
// Verletzungspause: bei den letzten zwei Spielen mit Teams nicht dabei
function pauseOf(id) { const tg = D.games.filter(hasTeams).slice(-2); return tg.length === 2 && tg.every(g => !teamOf(g, id)); }
const pauseTag = id => pauseOf(id) ? '<span class="mg-pause">Pause</span>' : '';

/* Tipps: "XY trifft" und Endergebnis – je richtiger Tipp +2 Punkte.
   Ein Tipp gilt für das nächste Spiel, das nach ihm eingetragen wird. */
const TIP = 2;
const tipsOf = pid => txsOf(pid).filter(x => x.op === 'tip').map(x => { try { return { t: x.t, ...JSON.parse(x.player) }; } catch { return null; } }).filter(Boolean);
function prevAtMap() {
  const m = {}; let prev = 0;
  D.games.slice().sort((a, b) => gameAt(a) - gameAt(b)).forEach(g => { m[g.id] = prev; prev = gameAt(g); });
  return m;
}
function tipFor(tips, g, prev) { const at = gameAt(g); return tips.filter(x => { const t = Date.parse(x.t); return t >= prev && t < at; }).pop() || null; }
function tipPts(tip, g) {
  if (!tip) return { p: 0, s: null, r: null };
  const s = tip.s ? g.goals.some(x => x.s === tip.s) : null, sc = hasTeams(g) ? scoreOf(g) : null;
  const r = tip.a != null && tip.j != null && sc ? sc.alt === tip.a && sc.jung === tip.j : null;
  return { p: (s ? TIP : 0) + (r ? TIP : 0), s, r };
}
// offener Tipp = nach dem zuletzt eingetragenen Spiel abgegeben
function openTip(pid) { const last = Math.max(0, ...D.games.map(gameAt)); return tipsOf(pid).filter(x => Date.parse(x.t) >= last).pop() || null; }
function tipCard() {
  const o = openTip(S.me), d = S.tipDraft ||= o ? { s: o.s || '', a: o.a, j: o.j } : { s: '', a: null, j: null };
  const same = o && (o.s || '') === d.s && o.a === d.a && o.j === d.j;
  const num = k => `<div class="tip-num"><button data-act="tip-step" data-k="${k}" data-d="-1" aria-label="weniger">−</button><b>${d[k] == null ? '–' : d[k]}</b><button data-act="tip-step" data-k="${k}" data-d="1" aria-label="mehr">+</button></div>`;
  return `<div class="card"><div class="card-h"><h2>Tipp fürs nächste Spiel</h2><span class="meta">je Treffer +${TIP} P</span></div>
    <label class="tip-l">Wer trifft?</label>
    <select class="search tip-sel" data-input="tip-s"><option value="">– kein Tipp –</option>${D.players.filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}" ${d.s === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
    <label class="tip-l">Endergebnis</label>
    <div class="tip-res"><span class="alt">Alt</span>${num('a')}<b>:</b>${num('j')}<span class="jung">Jung</span></div>
    <button class="btn ${same ? 'ghost' : 'gold'}" data-act="tip-save" ${same || (!d.s && d.a == null) ? 'disabled' : ''}>${same ? 'Tipp abgegeben' : 'Tipp abgeben'}</button></div>`;
}

function mgrTable(scope) {
  const games = scope === 'month' ? gamesIn('month', S.month) : D.games;
  const list = managers().map(pid => { const s = mgrState(pid); return { pid, pts: mgrPoints(pid, games).total, value: s.cash + s.squad.reduce((t, id) => t + mvNow(id), 0) }; })
    .sort((a, b) => b.pts - a.pts || b.value - a.value);
  list.forEach((x, i) => x.rank = i && list[i - 1].pts === x.pts ? list[i - 1].rank : i + 1);
  return list;
}

/* ---------- Ansicht ---------- */
function viewManager() {
  const title = `<div class="mg-title"><b>Kick<span>7</span></b><small>Das Manager-Spiel der 1. Männer</small></div>`;
  if (!joined(S.me)) return title + mgrJoin();
  S.mview ||= 'team';
  let h = title + `<div class="card" style="padding:12px">${seg('mview', [['team', 'Mein Team'], ['market', 'Markt'], ['table', 'Tabelle']], S.mview)}</div>`;
  if (S.mview === 'table') return h + mgrTableView();
  return h + (S.mview === 'market' ? mgrMarket() : mgrTeam());
}
// Startseite, solange man nicht mitmacht – nur kurz erklären, dann "Teilnehmen"
function mgrJoin() {
  const n = managers().length;
  return `<div class="card mg-join">
      <div class="mg-join-cards">${D.players.filter(p => p.active && !p.guest).map(p => p.id).sort((a, b) => mvNow(b) - mvNow(a)).slice(0, 3).map((id, i) => `<div class="mgc r${i}">${cardHtml(id, { mini: true })}</div>`).join('')}</div>
      <ul class="mg-join-list"><li><b>${MGR.BUDGET} Mio</b> Startkapital, Punkte bringen Geld</li><li><b>${MGR.SQUAD} Spieler</b> kaufen – ${MGR.FIELD} aufs Feld, 3 auf die Bank</li><li>Punkte bei Tor, Assist, Sieg & Co.</li><li>Marktwert steigt und fällt mit der Form</li></ul>
      <button class="btn gold" data-act="mg-join">${S.me ? 'Teilnehmen' : 'Anmelden & teilnehmen'}</button>
      ${n ? `<button class="more-btn" data-act="mg-peek">${n} Manager spielen schon mit – Tabelle ansehen</button>` : ''}
    </div>${S.mpeek ? mgrTableView() : ''}`;
}
function mgrHead(pid) {
  const s = mgrState(pid), tv = s.squad.reduce((t, id) => t + mvNow(id), 0), me = mgrTable('all').find(x => x.pid === pid);
  return `<div class="mg-head"><div><b>${me ? me.pts : 0}</b><span>Punkte${me ? ` · Platz ${me.rank}` : ''}</span></div><div><b>${mio(s.cash)}</b><span>Kasse</span></div><div><b>${mio(tv)}</b><span>Kaderwert</span></div></div>`;
}
// Eine Karte auf dem Feld / der Bank. own = eigenes Team (ziehbar)
function slotHtml(id, slot, s, own, label) {
  const last = D.games[D.games.length - 1];
  if (!id) return `<div class="mgc empty" data-slot="${slot}" ${own ? 'data-act="mview" data-v="market"' : ''}><span>${label || '+'}</span></div>`;
  const pts = last ? fpts(last, id, slot === 'f0') : null;
  return `<div class="mgc" data-slot="${slot}" data-id="${id}" ${own ? 'data-drag="1" data-act="mg-player"' : 'data-act="profile"'}>
    ${cardHtml(id, { mini: true })}${id === s.cap ? '<i class="mg-cap">C</i>' : ''}${pauseOf(id) ? '<i class="mg-inj">Pause</i>' : ''}${pts != null && slot[0] === 'f' ? `<i class="mg-pts">${pts * (id === s.cap ? 2 : 1)}</i>` : ''}<em>${mio(mvNow(id))}</em></div>`;
}
function pitchHtml(pid, own) {
  const s = mgrState(pid), rows = s.line.f.split('-').map(Number);
  let k = 1; const lines = rows.map(n => { const r = []; for (let j = 0; j < n; j++) { r.push(slotHtml(s.line.s[k], 'f' + k, s, own)); k++; } return r; });
  const bench = [...s.bench, ...Array(Math.max(0, MGR.SQUAD - MGR.FIELD - s.bench.length)).fill('')];
  return `${own ? `<div class="mg-form">${FORMATIONS.map(f => `<button class="${f === s.line.f ? 'on' : ''}" data-act="mg-form" data-v="${f}">${f}</button>`).join('')}</div>` : `<div class="mg-form ro"><span>${s.line.f}</span></div>`}
    <div class="mg-field">${lines.reverse().map(r => `<div class="mg-line">${r.join('')}</div>`).join('')}
      <div class="mg-line gk">${slotHtml(s.line.s[0], 'f0', s, own, 'TW')}</div></div>
    <div class="mg-bench"><small>Bank</small><div>${bench.map((id, i) => slotHtml(id, 'b' + i, s, own, own ? '+' : '')).join('')}</div></div>`;
}
function mgrTeam() {
  const pts = mgrPoints(S.me), lastG = pts.per.filter(x => x.has).pop(), s = mgrState(S.me);
  return mgrHead(S.me) + `<div class="card mg-card"><div class="card-h"><h2>Aufstellung</h2><span class="meta">${s.squad.length}/${MGR.SQUAD} im Kader</span></div>
      ${pitchHtml(S.me, true)}<div class="mg-note">Karte gedrückt halten und ziehen · antippen für Kapitän oder Verkauf</div></div>
    ${lastG ? `<div class="card"><div class="card-h"><h2>Letzter Spieltag</h2><span class="meta">${new Date(lastG.g.date + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · ${lastG.p + lastG.tp.p} P · +${mio(lastG.prize)}</span></div>
      ${lastG.tip ? `<div class="tip-out">Tipp: ${lastG.tip.s ? `${esc(short(lastG.tip.s))} trifft ${lastG.tp.s ? '✓' : '✗'}` : ''}${lastG.tip.s && lastG.tip.a != null ? ' · ' : ''}${lastG.tip.a != null ? `Alt ${lastG.tip.a}:${lastG.tip.j} Jung ${lastG.tp.r ? '✓' : lastG.tp.r === false ? '✗' : ''}` : ''}<b>+${lastG.tp.p}</b></div>` : ''}
      ${lastG.det.length ? lastG.det.sort((a, b) => b.v - a.v).map(d => `<div class="partner" data-act="profile" data-id="${d.id}">${imgTag(face(d.id), d.id)}<span>${esc(player(d.id).name)}${d.gk ? ' (TW)' : ''}${d.cap ? ' (C)' : ''}</span><b>${d.v}</b></div>`).join('') : '<div class="empty">Keiner deiner Feldspieler war dabei</div>'}</div>` : ''}
    ${tipCard()}
    ${mgrRules()}`;
}
function mgrMarket() {
  const s = mgrState(S.me), q = (S.mq || '').toLowerCase();
  const list = D.players.filter(p => p.active && (!q || p.name.toLowerCase().includes(q))).map(p => ({ p, v: mvNow(p.id), d: mvTrend(p.id) })).sort((a, b) => b.v - a.v);
  return `<div class="mg-bar"><span>Kasse <b>${mio(s.cash)}</b></span><span>${s.squad.length}/${MGR.SQUAD} im Kader</span></div>
    <input class="search" data-input="mq" placeholder="Spieler suchen" value="${esc(S.mq || '')}" style="margin-bottom:10px">
    <div class="card" style="padding:6px 12px">${list.map(({ p, v, d }) => { const own = s.squad.includes(p.id);
      return `<div class="mg-row"><span data-act="profile" data-id="${p.id}">${imgTag(face(p.id), p.id)}</span><div class="t" data-act="profile" data-id="${p.id}"><b>${esc(p.name)}${pauseTag(p.id)}</b><small>${trendHtml(d)} · Ø ${avgPts(p.id)} P</small></div>
        <b class="mv">${mio(v)}</b>${own ? `<button class="mg-btn own" data-act="mg-player" data-id="${p.id}">Im Kader</button>` : `<button class="mg-btn" data-act="mg-buy" data-id="${p.id}" ${s.squad.length >= MGR.SQUAD || v > s.cash + 1e-9 ? 'disabled' : ''}>Kaufen</button>`}</div>`; }).join('')}</div>`;
}
function avgPts(id) {
  const pts = D.games.map(g => fpts(g, id)).filter(v => v != null).slice(-MGR.WINDOW);
  return pts.length ? (pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(1).replace('.', ',') : '–';
}
function mgrTableView() {
  S.mscope ||= 'all';
  const tab = mgrTable(S.mscope);
  return `<div class="card" style="padding:12px">${seg('mscope', [['all', 'Saison'], ['month', 'Monat']], S.mscope)}${S.mscope === 'month' ? monthStepper() : ''}</div>
    <div class="card">${tab.length ? `<ul class="rank" style="--bc:var(--gold)">${tab.map(x => `<li data-act="mg-team" data-id="${x.pid}"><span class="n">${x.rank}</span>${imgTag(face(x.pid), x.pid)}<div class="who"><b>${esc(player(x.pid).name)}${x.pid === S.me ? ' (du)' : ''}</b><small class="mg-sub">Wert ${mio(x.value)}</small></div><span class="v">${x.pts}</span></li>`).join('')}</ul>`
      : '<div class="empty" style="text-align:center;padding:20px 0">Noch keine Manager. Stell dir unter „Markt“ deinen Kader zusammen.</div>'}</div>
    ${mgrRules()}`;
}
function mgrRules() {
  return `<details class="how"><summary>${I.info} Regeln</summary><p>Kader: ${MGR.SQUAD} Spieler, davon ${MGR.FIELD} auf dem Feld (Torwart + Formation). Nur wer auf dem Feld steht, punktet.<br>
    Dabei +1 · Tor +4 · Assist +3 · Sieg +2 · Tor des Spiels +3 · Kapitän zählt doppelt.<br>Torwart: +4 (bei mehreren Torhütern geteilt), je Gegentor −1, zu null +3, Sieg +1 extra · Spieler auf deiner TW-Position +2.<br>
    Spieler des Monats im Kader +${MGR.POTM}, Flop des Monats −${-MGR.FLOP}.<br>Tipp „XY trifft“ und Endergebnis: je richtig +${TIP} (gilt fürs nächste eingetragene Spiel).<br>„Pause“ = bei den letzten zwei Spielen nicht dabei. Der beste Manager bekommt die Kick7-Karte.<br>Geld: pro Spiel ${MGR.BASE} Mio Grundgehalt + ${String(MGR.PER_PT).replace('.', ',')} Mio je Punkt deiner Aufstellung. Verkaufen kostet ${Math.round(MGR.FEE * 100)} % Gebühr.<br>Start mit ${MGR.BUDGET} Mio, jeder darf jeden kaufen – auch sich selbst. Marktwert = Punkte der letzten ${MGR.WINDOW} Spiele (das letzte zählt am meisten, nicht dabei = 0).<br>
    Es zählt deine Aufstellung in dem Moment, in dem ein Spiel eingetragen oder ein Live-Spiel gestoppt wird.</p></details>`;
}
function openMgrTeam(pid) {
  const pts = mgrPoints(pid), tab = mgrTable('all').find(x => x.pid === pid);
  const recent = pts.per.filter(x => x.has).slice(-5).reverse();
  openSheet(`<div class="sheet-body" style="padding-top:8px"><div class="mg-owner">${imgTag(face(pid), pid)}<div><h2>${esc(player(pid).name)}</h2><span>${tab ? `Platz ${tab.rank} · ${tab.pts} Punkte` : ''}</span></div></div>
    ${mgrHead(pid)}
    <div class="card mg-card">${pitchHtml(pid, false)}</div>
    ${recent.length || pts.bon.length ? `<div class="card"><div class="card-h"><h2>Spieltage</h2></div>${recent.map(x => `<div class="partner"><span>${new Date(x.g.date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span><b>${x.p + x.tp.p} P <small style="color:var(--muted);font-weight:500">+${mio(x.prize)}</small></b></div>`).join('')}
      ${pts.bon.map(b => `<div class="partner"><span>${b.v > 0 ? I.medal : I.lantern} ${esc(short(b.id))} · ${monthLabel(b.m, false)}</span><b>${b.v > 0 ? '+' : ''}${b.v} P</b></div>`).join('')}</div>` : ''}
  </div>`, 'mgr');
}
function openMgrPlayer(id) {
  const s = mgrState(S.me), v = mvNow(id), onField = s.line.s.includes(id);
  openSheet(`<div class="sheet-body" style="padding-top:8px"><div class="mg-owner">${imgTag(face(id), id)}<div><h2>${esc(player(id).name)}</h2><span>${mio(v)} · ${trendHtml(mvTrend(id))} · Ø ${avgPts(id)} P · ${onField ? (s.line.s[0] === id ? 'Torwart' : 'auf dem Feld') : 'Bank'}</span></div></div>
    <div class="btn-row" style="margin-top:14px">${s.cap === id ? '<button class="btn ghost" disabled>Ist Kapitän</button>' : `<button class="btn gold" data-act="mg-cap" data-id="${id}">Zum Kapitän machen</button>`}
      <button class="btn" data-act="mg-sell" data-id="${id}">Verkaufen · ${mio(sellPrice(v))}</button></div>
    <button class="btn ghost" data-act="profile" data-id="${id}" style="margin-top:8px">Profil ansehen</button></div>`, 'mgr');
}

/* ---------- Aufstellung ändern (ziehen oder tauschen) ---------- */
function saveLine(f, slots) { D = Store.mgr('line', JSON.stringify({ f, s: slots }), 0); render(); }
function moveSlot(from, to) {
  if (from === to) return;
  const s = mgrState(S.me), f = s.line.s.slice(), b = s.bench.slice();
  const get = k => k[0] === 'f' ? f[+k.slice(1)] : b[+k.slice(1)] || '';
  const a = get(from), c = get(to);
  if (from[0] === 'b' && to[0] === 'b') return;
  if (from[0] === 'f') f[+from.slice(1)] = c; // Feld ← Tauschpartner (oder leer)
  if (to[0] === 'f') f[+to.slice(1)] = a;
  buzz(12); saveLine(s.line.f, f);
}
let drag = null, dragClick = 0;
function dragBegin() {
  const el = drag.el, r = el.getBoundingClientRect(), g = el.cloneNode(true);
  g.className = 'mgc ghost'; g.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  document.body.appendChild(g); el.classList.add('lifted');
  Object.assign(drag, { on: true, ghost: g, dx: drag.x0 - r.left, dy: drag.y0 - r.top }); buzz(15);
}
function dragMove(x, y) {
  drag.ghost.style.left = x - drag.dx + 'px'; drag.ghost.style.top = y - drag.dy + 'px';
  const t = document.elementFromPoint(x, y)?.closest('.mg-field [data-slot], .mg-bench [data-slot]');
  document.querySelectorAll('.mgc.over').forEach(e => e !== t && e.classList.remove('over'));
  if (t && t !== drag.el) t.classList.add('over');
  drag.target = t;
}
function dragEnd() {
  if (!drag) return;
  clearTimeout(drag.timer);
  if (drag.on) {
    dragClick = Date.now();
    drag.ghost.remove(); drag.el.classList.remove('lifted'); document.querySelectorAll('.mgc.over').forEach(e => e.classList.remove('over'));
    if (drag.target) moveSlot(drag.el.dataset.slot, drag.target.dataset.slot);
  }
  drag = null;
}
// Touch: kurz gedrückt halten, dann ziehen (sonst scrollt die Seite ganz normal)
document.addEventListener('touchstart', e => {
  const el = e.target.closest('[data-drag]'); if (!el || e.touches.length > 1) return;
  const t = e.touches[0]; drag = { el, x0: t.clientX, y0: t.clientY, on: false };
  drag.timer = setTimeout(() => drag && !drag.on && dragBegin(), 220);
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!drag) return; const t = e.touches[0];
  if (!drag.on) { if (Math.hypot(t.clientX - drag.x0, t.clientY - drag.y0) > 8) { clearTimeout(drag.timer); drag = null; } return; }
  e.preventDefault(); dragMove(t.clientX, t.clientY);
}, { passive: false });
document.addEventListener('touchend', dragEnd);
document.addEventListener('touchcancel', () => { if (drag?.on) { drag.target = null; } dragEnd(); });
// Maus: sofort ziehen
document.addEventListener('mousedown', e => { const el = e.target.closest('[data-drag]'); if (!el || drag) return; drag = { el, x0: e.clientX, y0: e.clientY, on: false, mouse: true }; });
document.addEventListener('mousemove', e => { if (!drag?.mouse) return; if (!drag.on && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) dragBegin(); if (drag.on) { e.preventDefault(); dragMove(e.clientX, e.clientY); } });
document.addEventListener('mouseup', () => { if (drag?.mouse) dragEnd(); });
// Nach dem Ziehen kein "Antippen" auslösen
document.addEventListener('click', e => { if (Date.now() - dragClick < 400 && e.target.closest('.mgc')) { e.stopPropagation(); e.preventDefault(); } }, true);

document.addEventListener('change', e => { if (e.target.dataset.input === 'tip-s') { S.tipDraft.s = e.target.value; render(); } });

/* ---------- Aktionen ---------- */
Object.assign(actions, {
  mview: el => { S.mview = el.dataset.v; closeSheet(true); render(); },
  'mg-peek': () => { S.mpeek = !S.mpeek; render(); },
  'tip-step': el => { const d = S.tipDraft, k = el.dataset.k, dl = +el.dataset.d, cur = d[k]; d[k] = dl < 0 && !cur ? null : Math.min(30, (cur == null ? -1 : cur) + dl); buzz(8); render(); },
  'tip-save': () => {
    const d = S.tipDraft; if (d.a != null && d.j == null) d.j = 0; if (d.j != null && d.a == null) d.a = 0;
    try { D = Store.mgr('tip', JSON.stringify({ s: d.s || '', a: d.a, j: d.j }), 0); buzz(20); toast('Tipp abgegeben – gilt fürs nächste Spiel'); render(); } catch (e) { toast(e.message); }
  },
  'mg-join': () => {
    if (!S.me) return askLogin();
    try { D = Store.mgr('join', '', 0); S.mview = 'market'; confetti(); buzz([20, 40, 20]); toast(`Willkommen bei Kick7 – ${MGR.BUDGET} Mio warten auf dich`); render(); scrollTo(0, 0); }
    catch (e) { toast(e.message); }
  },
  mscope: el => { S.mscope = el.dataset.v; render(); },
  'mg-team': el => openMgrTeam(el.dataset.id),
  'mg-player': el => openMgrPlayer(el.dataset.id),
  'mg-form': el => { const s = mgrState(S.me); if (s.line.f === el.dataset.v) return; buzz(10); saveLine(el.dataset.v, s.line.s); },
  'mg-buy': async el => {
    if (!S.me) return askLogin();
    const id = el.dataset.id;
    try { D = await Store.mgr('buy', id, mvNow(id)); buzz(20); toast(`${short(id)} gekauft · ${mio(mvNow(id))}`); render(); }
    catch (e) { toast(e.message); }
  },
  'mg-sell': async el => {
    const id = el.dataset.id;
    if (!(await confirmBox('Verkaufen?', `${esc(player(id).name)} für ${mio(sellPrice(mvNow(id)))} verkaufen (Marktwert ${mio(mvNow(id))} minus ${Math.round(MGR.FEE * 100)} % Gebühr).`, 'Verkaufen', true))) return;
    try { D = await Store.mgr('sell', id, sellPrice(mvNow(id))); toast(`${short(id)} verkauft`); render(); }
    catch (e) { toast(e.message); }
  },
  'mg-cap': async el => {
    const id = el.dataset.id;
    try { D = await Store.mgr('cap', id, 0); closeSheet(); buzz(15); toast(`${short(id)} ist Kapitän`); render(); }
    catch (e) { toast(e.message); }
  }
});
