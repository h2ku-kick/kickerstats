/* ============================================================
   LIVE-SPIEL: ein angemeldeter Spieler (z. B. ein Trainer) erfasst ein Spiel live.
   ① Teams  ② Scoreboard (Querformat)  ③ Sieger → „An Statistik senden“.
   Erst nach Freigabe durch den Statistik-Verantwortlichen (Passwort) zählt es in der Statistik.
   Der Zwischenstand liegt auf dem Handy – das Spiel übersteht also auch ein geschlossenes App-Fenster.
   ============================================================ */
const LIVE_KEY = 'h2ku-live';
const liveState = () => ls.get(LIVE_KEY, null);
const saveLive = v => v ? ls.set(LIVE_KEY, v) : ls.del(LIVE_KEY);
let livePending = null, liveClock = null;

/* ---------- Abschnitt oben in „Spiele“ ---------- */
function liveSection() {
  let h = '';
  const L = liveState();
  if (S.me) {
    const sc = L ? liveScore(L) : null;
    h += `<div class="live-start">${L
      ? `<button class="btn" data-act="live-open">${I.ball} Live-Spiel fortsetzen${L.step !== 'teams' ? ` · Alt ${sc.alt}:${sc.jung} Jung` : ''}</button>`
      : `<button class="btn ghost" data-act="live-new">${I.ball} Live-Spiel starten</button>`}</div>`;
  }
  const drafts = D.drafts || [];
  if (drafts.length) h += `<div class="sec-title">Wartet auf Freigabe</div>` + drafts.map(draftCard).join('');
  return h;
}
function draftCard(d) {
  const g = d.game, r = g.result || { alt: 0, jung: 0 }, dt = new Date(d.date + 'T12:00');
  const canDel = !!S.pw || (S.me && d.by === S.me);
  const best = g.goals.find(x => x.best);
  return `<div class="game pending ${S.open.has(d.id) ? 'open' : ''}" id="g-${d.id}"><div class="game-h" data-act="toggle-game" data-id="${d.id}">
      <div class="d"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('de-DE', { weekday: 'short' })}</span></div>
      <div class="mid"><b class="gscore"><span class="${r.winner === 'alt' ? 'win' : ''}">Alt</span> ${r.alt} : ${r.jung} <span class="${r.winner === 'jung' ? 'win' : ''}">Jung</span>${best ? ' ' + I.starOn : ''}</b>
        <div class="sm"><span class="pend-tag">Wartet auf Freigabe</span> · von ${esc(short(d.by))}</div></div>
      <span class="chev">▾</span></div>
    <div class="goals">
      <div class="teams-view">${['alt', 'jung'].map(t => `<div class="tv ${t}"><small>${TEAMS[t].name}${r.winner === t ? ' <span class="winner-tag">Sieger</span>' : ''}</small><div>${(g.teams[t] || []).map(id => imgTag(face(id), id)).join('')}</div></div>`).join('')}</div>
      ${g.goals.map((x, i) => `<div class="gl ${x.best ? 'is-best' : ''} ${(g.teams.alt || []).includes(x.s) ? 'alt' : 'jung'}"><span class="i">${x.best ? I.starOn : i + 1}</span>${imgTag(face(x.s), x.s)}<div><b>${esc(player(x.s).name)}</b> ${x.a ? `<span class="as">← ${esc(player(x.a).name)}</span>` : '<span class="as">ohne Assist</span>'}</div></div>`).join('') || '<div class="empty">Keine Tore</div>'}
      <div class="btn-row" style="margin-top:10px">${S.pw ? `<button class="btn gold sm" data-act="draft-approve" data-id="${d.id}">Freigeben</button>` : ''}${canDel ? `<button class="btn ghost sm" data-act="draft-del" data-id="${d.id}">${I.trash} Löschen</button>` : ''}</div>
      ${!S.pw ? '<div class="empty" style="text-align:center">Zählt erst nach Freigabe durch den Statistik-Verantwortlichen.</div>' : ''}
    </div></div>`;
}

/* ---------- Vollbild-Ansicht ---------- */
function openLive() {
  const L = liveState(); if (!L) return;
  let el = $('#live');
  if (!el) { el = document.createElement('div'); el.id = 'live'; el.className = 'live'; document.body.appendChild(el); document.body.style.overflow = 'hidden'; }
  el.innerHTML = L.step === 'teams' ? liveTeams(L) : L.step === 'end' ? liveEnd(L) : liveBoard(L);
  if (L.step === 'play') startClock(); else stopClock();
}
function closeLive() { $('#live')?.remove(); document.body.style.overflow = ''; stopClock(); exitFs(); livePending = null; render(); }
async function goFs() { try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } catch {} }
function exitFs() { try { screen.orientation?.unlock?.(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch {} }
function startClock() {
  stopClock();
  const tick = () => { const L = liveState(), c = $('#lv-clock'); if (!L || !c || !L.start) return; const s = Math.floor((Date.now() - L.start) / 1000); c.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  tick(); liveClock = setInterval(tick, 1000);
}
function stopClock() { clearInterval(liveClock); liveClock = null; }

function liveTeams(L) {
  const people = D.players.filter(p => p.active);
  const lastT = D.games.slice().reverse().find(hasTeams);
  return `<div class="lv-page">
    <div class="lv-bar"><button class="icon-btn" data-act="live-min" aria-label="Schließen">✕</button><b>Live-Spiel · Teams</b><button class="more-btn" style="width:auto;margin:0;padding:6px 10px" data-act="live-discard">Verwerfen</button></div>
    <div class="team-count"><span class="alt">Alt <b>${L.teams.alt.length}</b></span><span class="jung">Jung <b>${L.teams.jung.length}</b></span></div>
    ${lastT ? '<button class="btn ghost sm" data-act="live-last" style="margin-bottom:10px">Wie letztes Mal</button>' : ''}
    <div class="tgrid">${people.map(p => { const t = L.teams.alt.includes(p.id) ? 'alt' : L.teams.jung.includes(p.id) ? 'jung' : '';
      return `<div class="tile tm ${t ? 'in-' + t : 'out'}" data-act="live-team" data-id="${p.id}">${imgTag(face(p.id), p.id)}<b>${esc(short(p.id))}</b>${t ? `<span class="tbadge ${t}">${TEAMS[t].short}</span>` : ''}</div>`; }).join('')}</div>
    <button class="btn" data-act="live-go" style="margin:14px 0 20px" ${L.teams.alt.length && L.teams.jung.length ? '' : 'disabled'}>Anpfiff</button>
  </div>`;
}
function liveBoard(L) {
  const sc = liveScore(L), last = L.goals[L.goals.length - 1];
  const cnt = {}; L.goals.forEach(x => { cnt[x.s] = (cnt[x.s] || 0) + 1; });
  const pendTeam = livePending ? (L.teams.alt.includes(livePending) ? 'alt' : 'jung') : null;
  const side = t => `<div class="lv-team ${t} ${pendTeam && pendTeam !== t ? 'off' : ''}">
      <div class="lv-th">${TEAMS[t].name}</div>
      <div class="lv-tiles">${L.teams[t].map(id => `<button class="lv-p ${livePending === id ? 'sel' : ''}" data-act="live-tile" data-id="${id}" ${pendTeam && pendTeam !== t ? 'disabled' : ''}>${imgTag(face(id), id)}<b>${esc(short(id))}</b>${cnt[id] ? `<i>${cnt[id]}</i>` : ''}</button>`).join('')}</div>
    </div>`;
  return `<div class="lv">
    <div class="lv-bar"><button class="icon-btn" data-act="live-min" aria-label="Minimieren">✕</button><span id="lv-clock" class="lv-clock">00:00</span><button class="btn ghost sm" style="width:auto" data-act="live-finish">Beenden</button></div>
    <div class="lv-main">
      ${side('alt')}
      <div class="lv-mid">
        <div class="lv-score"><span class="alt">${sc.alt}</span><em>:</em><span class="jung">${sc.jung}</span></div>
        ${livePending
          ? `<div class="lv-hint">Tor <b>${esc(short(livePending))}</b><br>Assist antippen</div>
             <button class="btn gold sm" data-act="live-noassist">Ohne Assist</button>
             <button class="btn ghost sm" data-act="live-cancel">Abbrechen</button>`
          : `<div class="lv-hint">${last ? `Letztes Tor: <b>${esc(short(last.s))}</b>${last.a ? `<br><small>← ${esc(short(last.a))}</small>` : ''}` : 'Torschützen antippen'}</div>
             ${last ? `<button class="lv-best ${last.best ? 'on' : ''}" data-act="live-best">${last.best ? I.starOn : I.star} Traumtor</button>
             <button class="btn ghost sm" data-act="live-undo">Rückgängig</button>` : ''}`}
      </div>
      ${side('jung')}
    </div>
    <div class="lv-rotate ${S.livePortrait ? 'hide' : ''}">Handy quer drehen für mehr Platz <button data-act="live-portrait">OK</button></div>
  </div>`;
}
function liveEnd(L) {
  const sc = liveScore(L), auto = sc.alt > sc.jung ? 'alt' : sc.jung > sc.alt ? 'jung' : 'draw', win = L.winner || auto;
  const opt = (v, l) => `<button class="res-btn ${v} ${win === v ? 'on' : ''}" data-act="live-winner" data-v="${v}">${l}</button>`;
  return `<div class="lv-page">
    <div class="lv-bar"><button class="icon-btn" data-act="live-back" aria-label="Zurück">‹</button><b>Spiel beenden</b><span></span></div>
    <div class="card">
      <div class="scoreboard"><div class="sb-t alt"><b>ALT</b><small>${L.teams.alt.length} Spieler</small></div><div class="sb-s">${sc.alt} : ${sc.jung}</div><div class="sb-t jung"><b>JUNG</b><small>${L.teams.jung.length} Spieler</small></div></div>
      <div class="sec-title" style="margin:14px 0 8px;text-align:center">Wer hat gewonnen?</div>
      <div class="res-row">${opt('alt', 'Alt')}${opt('draw', 'Remis')}${opt('jung', 'Jung')}</div>
    </div>
    <button class="btn gold" data-act="live-send">An Statistik senden</button>
    <button class="btn ghost" data-act="live-back" style="margin-top:8px">Weiterspielen</button>
  </div>`;
}

/* ---------- Aktionen ---------- */
Object.assign(actions, {
  'live-new': () => {
    if (!S.me) return askLogin();
    saveLive({ date: isoDate(new Date()), teams: { alt: [], jung: [] }, goals: [], step: 'teams', winner: null, start: null });
    openLive();
  },
  'live-open': () => { openLive(); if (liveState()?.step === 'play') goFs(); },
  'live-min': () => { closeLive(); if (liveState()) toast('Live-Spiel pausiert – unter Spiele fortsetzen'); },
  'live-discard': async () => {
    if (!(await confirmBox('Live-Spiel verwerfen?', 'Alle Eingaben dieses Live-Spiels gehen verloren.', 'Verwerfen', true))) return;
    saveLive(null); closeLive();
  },
  'live-team': el => {
    const L = liveState(), id = el.dataset.id, t = L.teams;
    const cur = t.alt.includes(id) ? 'alt' : t.jung.includes(id) ? 'jung' : null;
    const hasGoals = L.goals.some(x => x.s === id || x.a === id);
    const next = cur === null ? 'alt' : cur === 'alt' ? 'jung' : (hasGoals ? 'alt' : null);
    t.alt = t.alt.filter(x => x !== id); t.jung = t.jung.filter(x => x !== id);
    if (next) t[next].push(id);
    buzz(10); saveLive(L); openLive();
  },
  'live-last': () => {
    const L = liveState(), g = D.games.slice().reverse().find(hasTeams); if (!g) return;
    const act = id => byId[id] && byId[id].active;
    L.teams = { alt: g.teams.alt.filter(act), jung: g.teams.jung.filter(act) };
    saveLive(L); openLive();
  },
  'live-go': () => { const L = liveState(); L.step = 'play'; L.start = L.start || Date.now(); saveLive(L); goFs(); openLive(); },
  'live-tile': el => {
    const L = liveState(), id = el.dataset.id;
    if (!livePending) { livePending = id; buzz(15); return openLive(); }
    if (id === livePending) { livePending = null; return openLive(); }
    liveGoal(livePending, id);
  },
  'live-noassist': () => liveGoal(livePending, null),
  'live-cancel': () => { livePending = null; openLive(); },
  'live-best': () => {
    const L = liveState(), last = L.goals[L.goals.length - 1]; if (!last) return;
    const on = !last.best; L.goals.forEach(x => delete x.best); if (on) last.best = true;
    buzz(on ? [20, 30, 20] : 10); saveLive(L); openLive();
  },
  'live-undo': () => { const L = liveState(); const g = L.goals.pop(); saveLive(L); openLive(); if (g) toast(`Tor ${short(g.s)} entfernt`); },
  'live-finish': () => { const L = liveState(); livePending = null; L.step = 'end'; saveLive(L); exitFs(); openLive(); },
  'live-back': () => { const L = liveState(); L.step = 'play'; saveLive(L); goFs(); openLive(); },
  'live-winner': el => { const L = liveState(); L.winner = el.dataset.v; saveLive(L); openLive(); },
  'live-portrait': () => { S.livePortrait = true; $('.lv-rotate')?.classList.add('hide'); },
  'live-send': async el => {
    const L = liveState(), sc = liveScore(L), auto = sc.alt > sc.jung ? 'alt' : sc.jung > sc.alt ? 'jung' : 'draw';
    el.disabled = true; el.textContent = 'Sende …';
    try {
      D = await Store.submitDraft({ date: L.date, teams: L.teams, goals: L.goals, result: { winner: L.winner || auto, alt: sc.alt, jung: sc.jung } });
      saveLive(null); closeLive(); S.tab = 'games'; render(true); confetti();
      toast('Gesendet – wartet auf Freigabe');
    } catch (e) { el.disabled = false; el.textContent = 'An Statistik senden'; toast('Fehler: ' + e.message); }
  },
  'draft-approve': async el => {
    if (!(await confirmBox('Spiel freigeben?', 'Das Live-Spiel wird in die Statistik übernommen.', 'Freigeben'))) return;
    try { D = await Store.approveDraft(el.dataset.id, S.pw); indexPlayers(); confetti(); toast('Freigegeben – zählt jetzt in der Statistik'); } catch (e) { toast('Fehler: ' + e.message); }
    render();
  },
  'draft-del': async el => {
    if (!(await confirmBox('Live-Spiel löschen?', 'Das noch nicht freigegebene Spiel wird entfernt.', 'Löschen', true))) return;
    try { D = await Store.deleteDraft(el.dataset.id, S.pw || null); toast('Gelöscht'); } catch (e) { toast('Fehler: ' + e.message); }
    render();
  }
});
function liveGoal(s, a) {
  const L = liveState(); L.goals.push({ s, a }); livePending = null; saveLive(L);
  vibrateGoal(); openLive();
  const p = $('#live .lv-score'); p?.classList.add('pop-score'); setTimeout(() => p?.classList.remove('pop-score'), 500);
}
function vibrateGoal() { buzz([30, 40, 30]); }
