/* ============================================================
   MONATSARTIKEL – baut aus den Zahlen eines Monats einen Zeitungstext.
   Gleicher Monat + gleiche Variante = gleicher Text; "Neu formulieren" erhöht die Variante.
   ============================================================ */
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function buildArticle(ctx, variant) {
  const { month, games, prevGames, player, stats, prevStats, potm, flop } = ctx;
  const r = rng(month + ':' + variant);
  const one = arr => arr[Math.floor(r() * arr.length)];
  const [y, m] = month.split('-').map(Number);
  const mName = MONTHS[m - 1];
  const nm = id => player(id).name;
  const first = id => player(id).name.split(' ')[0];
  const last = id => { const p = player(id).name.split(' '); return p.slice(1).join(' ') || p[0]; };

  const goals = games.reduce((s, g) => s + g.goals.length, 0);
  const assisted = games.reduce((s, g) => s + g.goals.filter(x => x.a).length, 0);
  const avg = games.length ? goals / games.length : 0;
  const scorers = Object.values(stats).filter(s => s.g > 0).sort((a, b) => b.g - a.g || b.a - a.a);
  const assisters = Object.values(stats).filter(s => s.a > 0).sort((a, b) => b.a - a.a || b.g - a.g);
  const pointsList = Object.values(stats).filter(s => s.g + s.a > 0).sort((a, b) => (b.g + b.a) - (a.g + a.a) || b.g - a.g);

  if (!games.length) return null;

  const S1 = scorers[0], S2 = scorers[1], A1 = assisters[0];
  // bestes Duo (Vorlage -> Tor)
  const pairs = {};
  games.forEach(g => g.goals.forEach(x => { if (x.a) { const k = x.a + '>' + x.s; pairs[k] = (pairs[k] || 0) + 1; } }));
  const duo = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
  // bestes Einzelspiel
  let best = null;
  games.forEach(g => {
    const c = {}; g.goals.forEach(x => c[x.s] = (c[x.s] || 0) + 1);
    Object.entries(c).forEach(([id, n]) => { if (!best || n > best.n) best = { id, n, date: g.date }; });
  });
  const wildest = games.slice().sort((a, b) => b.goals.length - a.goals.length)[0];
  const prevGoals = prevGames.reduce((s, g) => s + g.goals.length, 0);
  const prevAvg = prevGames.length ? prevGoals / prevGames.length : null;
  const fmtDate = iso => { const d = new Date(iso + 'T12:00'); return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }); };
  const num = n => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const tore = n => n === 1 ? 'ein Tor' : n + ' Tore';
  const toren = n => n === 1 ? 'einem Tor' : n + ' Toren';
  const mal = n => n === 1 ? 'einmal' : n === 2 ? 'zweimal' : n === 3 ? 'dreimal' : n + '-mal';

  // ---------- Schlagzeile ----------
  let headline;
  const tie = S2 && S2.g === S1.g;
  const dominant = !S2 || S1.g >= S2.g * 1.5;
  if (tie) headline = one([
    `Geteilte Krone: ${last(S1.id)} und ${last(S2.id)} gleichauf`,
    `Patt an der Spitze – ${first(S1.id)} und ${first(S2.id)} teilen sich den Thron`,
    `Zwei Könige, eine Krone: Torjäger-Duell endet unentschieden`
  ]);
  else if (dominant) headline = one([
    `Die ${last(S1.id)}-Show: ${S1.g} Treffer im ${mName}`,
    `${first(S1.id)} ${last(S1.id)} schießt alles kurz und klein`,
    `Nicht zu stoppen: ${last(S1.id)} dominiert den ${mName}`,
    `${last(S1.id)} in Torlaune – der Rest schaut zu`
  ]);
  else if (S1.g - S2.g === 1) headline = one([
    `Fotofinish: ${last(S1.id)} hauchdünn vor ${last(S2.id)}`,
    `Kopf-an-Kopf-Rennen um die Torjägerkrone`,
    `Knapp, knapper, ${last(S1.id)}`
  ]);
  else headline = one([
    `${last(S1.id)} gewinnt das Torjäger-Duell gegen ${last(S2.id)}`,
    `${first(S1.id)} ${last(S1.id)} setzt sich an die Spitze`,
    `Torjägerkrone im ${mName} geht an ${last(S1.id)}`
  ]);

  const deck = one([
    `${games.length} Spiele, ${goals} Tore, ${scorers.length} verschiedene Torschützen – die große Bilanz des Trainingskicks im ${mName}.`,
    `Ob vor dem Training oder mittendrin: Was im ${mName} beim Kicken passiert ist – alle Zahlen, alle Helden, alle Serien.`,
    `Der Monatsrückblick: ${goals} Treffer in ${games.length} Partien – und ein klarer Gewinner.`
  ]);

  // ---------- Vorspann ----------
  const lead = one([
    `Herrenberg. Ob vor dem Training oder mittendrin – sobald bei den 1. Männern der SG H2Ku der Fußball rollt, wird es ernst: Im ${mName} wurde ${games.length === 1 ? 'einmal' : games.length + '-mal'} gekickt, und dabei fielen stolze ${goals} Tore – im Schnitt ${num(avg)} pro Spiel.`,
    `Herrenberg. ${games.length} Trainingskicks, ${goals} Tore und jede Menge Ehrgeiz: Der ${mName} hatte es in sich. Mit durchschnittlich ${num(avg)} Treffern pro Partie ging es alles andere als defensiv zu.`,
    `Herrenberg. Mal vor dem Training, mal mittendrin: Die Torwarthandschuhe blieben beim Kicken meist im Schrank – anders lässt sich die Ausbeute von ${goals} Toren in ${games.length} Spielen kaum erklären. Macht ${num(avg)} Treffer pro Kick.`
  ]);

  const paras = [];
  // ---------- Torjäger ----------
  let pS = one([
    `Ganz vorne steht ${nm(S1.id)}: ${tore(S1.g)} gingen im ${mName} auf sein Konto.`,
    `Der Mann des Monats vor dem Tor heißt ${nm(S1.id)}. ${S1.g}-mal zappelte der Ball nach seinem Abschluss im Netz.`,
    `An ${nm(S1.id)} führte kein Weg vorbei: ${tore(S1.g)} bedeuten Platz eins in der Torjägerliste.`
  ]);
  if (S2) pS += ' ' + (tie
    ? `Genauso oft traf allerdings ${nm(S2.id)} – ein Stechen gibt es nicht, also teilen sich die beiden die Krone.`
    : S1.g - S2.g === 1
      ? one([`Dicht dahinter lauert ${nm(S2.id)} mit ${S2.g} Treffern – ein einziges Tor fehlte zum Gleichstand.`, `Nur ein Treffer trennt ihn von ${nm(S2.id)} (${S2.g}).`])
      : one([`Dahinter folgt ${nm(S2.id)} mit ${S2.g} Treffern.`, `Platz zwei geht an ${nm(S2.id)}, der ${S2.g}-mal erfolgreich war.`]));
  if (scorers[2]) pS += ' ' + one([`Das Podest komplettiert ${nm(scorers[2].id)} (${scorers[2].g}).`, `Bronze sichert sich ${nm(scorers[2].id)} mit ${toren(scorers[2].g)}.`]);
  paras.push({ h: 'Die Torjäger', t: pS });

  // ---------- Vorlagen ----------
  if (A1) {
    let pA = one([
      `Der beste Vorbereiter war ${nm(A1.id)}: ${A1.a} Assists, so viele wie kein anderer.`,
      `Im Schatten der Torschützen glänzte ${nm(A1.id)} als Vorlagengeber – ${A1.a}-mal legte er mustergültig auf.`,
      `Ohne Zuspiel kein Tor: ${nm(A1.id)} bereitete ${A1.a} Treffer vor und ist damit der Assistkönig des Monats.`
    ]);
    pA += ' ' + `Insgesamt fielen ${assisted} der ${goals} Tore nach einer Vorlage – eine Quote von ${Math.round(assisted / goals * 100)} Prozent${assisted / goals > 0.6 ? ', Teamfußball in Reinform' : assisted / goals < 0.4 ? '; viele versuchten es lieber allein' : ''}.`;
    if (duo && duo[1] >= 2) {
      const [a, s] = duo[0].split('>');
      pA += ' ' + one([
        `Das gefährlichste Duo: ${nm(a)} auf ${nm(s)} – ${mal(duo[1])} klingelte es nach dieser Kombination.`,
        `Blind verstanden sich ${first(a)} und ${first(s)}: ${duo[1]} Tore entstanden aus dieser Verbindung.`
      ]);
    }
    paras.push({ h: 'Die Vorbereiter', t: pA });
  }

  // ---------- Rekorde ----------
  let pR = '';
  if (best && best.n >= 3) pR += one([
    `Die Sternstunde des Monats gehörte ${nm(best.id)}, der am ${fmtDate(best.date)} gleich ${best.n}-mal traf.`,
    `Unvergessen bleibt der ${fmtDate(best.date)}: ${nm(best.id)} schnürte einen ${best.n === 3 ? 'Dreierpack' : best.n + 'er-Pack'}.`
  ]) + ' ';
  if (wildest) pR += one([
    `Das torreichste Spiel stieg am ${fmtDate(wildest.date)} mit ${wildest.goals.length} Treffern.`,
    `Am meisten los war am ${fmtDate(wildest.date)}: ${wildest.goals.length} Tore in einer Partie.`
  ]);
  if (prevAvg !== null) {
    const diff = avg - prevAvg;
    pR += ' ' + (Math.abs(diff) < 0.5
      ? `Im Vergleich zum Vormonat (${num(prevAvg)} Tore pro Spiel) blieb die Torausbeute stabil.`
      : diff > 0
        ? one([`Gegenüber dem Vormonat (${num(prevAvg)} pro Spiel) haben die Offensivreihen deutlich zugelegt.`, `Das sind klar mehr als im Vormonat, als nur ${num(prevAvg)} Tore pro Spiel fielen.`])
        : one([`Im Vormonat waren es noch ${num(prevAvg)} pro Spiel – die Abwehrreihen haben offenbar dazugelernt.`, `Etwas weniger als im Vormonat (${num(prevAvg)} pro Spiel), was die Torhüter freuen dürfte.`]));
  }
  // Neulinge in der Torschützenliste
  const newbies = scorers.filter(s => !prevStats[s.id] || prevStats[s.id].g === 0).map(s => s.id);
  if (prevGames.length && newbies.length && newbies.length <= 3) pR += ' ' + `Nach torlosem Vormonat wieder in der Torschützenliste: ${newbies.map(nm).join(', ').replace(/, ([^,]*)$/, ' und $1')}.`;
  if (pR.trim()) paras.push({ h: 'Rekorde & Serien', t: pR.trim() });

  // ---------- Alt gegen Jung ----------
  const tg = games.filter(g => g.result && g.result.winner);
  if (tg.length) {
    const d = { alt: 0, jung: 0, draw: 0 };
    tg.forEach(g => d[g.result.winner]++);
    const lead = d.alt > d.jung ? 'Alt' : d.jung > d.alt ? 'Jung' : null;
    const other = lead === 'Alt' ? 'Jung' : 'Alt';
    let t = lead
      ? one([
          `Das Generationenduell ging im ${mName} an Team ${lead}: ${Math.max(d.alt, d.jung)} Siege gegen ${Math.min(d.alt, d.jung)} von Team ${other}${d.draw ? `, dazu ${d.draw === 1 ? 'ein Unentschieden' : d.draw + ' Unentschieden'}` : ''}.`,
          `Alt gegen Jung – und im ${mName} hatte Team ${lead} die Nase vorn: ${Math.max(d.alt, d.jung)}:${Math.min(d.alt, d.jung)} Siege${d.draw ? ` bei ${d.draw} Remis` : ''}.`
        ])
      : `Im Generationenduell herrscht Gleichstand: Team Alt und Team Jung gewannen je ${d.alt}-mal${d.draw ? `, ${d.draw}-mal trennte man sich unentschieden` : ''}.`;
    const big = tg.slice().sort((a, b) => Math.abs(b.result.alt - b.result.jung) - Math.abs(a.result.alt - a.result.jung))[0];
    if (big && Math.abs(big.result.alt - big.result.jung) >= 3) {
      const w = big.result.winner === 'alt' ? 'Alt' : 'Jung';
      t += ' ' + `Deutlichster Sieg: ${big.result.alt}:${big.result.jung} für Team ${w} am ${fmtDate(big.date)}.`;
    }
    const recs = {};
    tg.forEach(g => ['alt', 'jung'].forEach(side => (g.teams?.[side] || []).forEach(id => {
      const r = recs[id] ||= { w: 0, n: 0 }; r.n++; if (g.result.winner === side) r.w++;
    })));
    const bestRec = Object.entries(recs).filter(([, r]) => r.n >= Math.min(3, tg.length)).sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n || b[1].w - a[1].w)[0];
    if (bestRec && bestRec[1].w >= 2 && bestRec[1].w / bestRec[1].n >= 0.6) t += ' ' + `Glücksbringer des Monats: ${nm(bestRec[0])} gewann ${bestRec[1].w} von ${bestRec[1].n} Spielen.`;
    paras.push({ h: 'Alt gegen Jung', t });
  }

  // ---------- Schönste Tore ----------
  const bests = [];
  games.forEach(g => g.goals.forEach(x => { if (x.best) bests.push({ ...x, date: g.date }); }));
  if (bests.length) {
    const pick = bests.slice(-2);
    const txt = pick.map(b => {
      const who = nm(b.s) + (b.a ? ` nach Vorlage von ${nm(b.a)}` : '');
      const note = b.note ? ` („${b.note}“)` : '';
      return one([`Am ${fmtDate(b.date)} erzielte ${who} das Tor des Spiels${note}.`, `Das Tor des Spiels am ${fmtDate(b.date)}: ${who}${note}.`]);
    }).join(' ');
    paras.push({ h: 'Die schönsten Tore', t: txt + (bests.length > 2 ? ` Insgesamt wurden im ${mName} ${bests.length} Tore des Spiels gekürt.` : '') });
  }

  // ---------- Serie ----------
  let run = null;
  Object.keys(stats).forEach(id => {
    let cur = 0, best = 0;
    games.forEach(g => { cur = g.goals.some(x => x.s === id) ? cur + 1 : 0; best = Math.max(best, cur); });
    if (best >= 3 && (!run || best > run.n)) run = { id, n: best };
  });
  if (run) paras.push({ h: null, t: one([
    `Heißester Lauf des Monats: ${nm(run.id)} traf in ${run.n} Spielen in Folge.`,
    `Eine Serie für die Chronik legte ${nm(run.id)} hin – ${run.n} Spiele am Stück mit mindestens einem Tor.`
  ]) });

  // ---------- Flop ----------
  if (flop) paras.push({ h: 'Der Flop des Monats', t: one([
    `Weniger rund lief es für ${nm(flop.id)}: Die Mannschaft wählte ihn mit ${flop.votes} von ${flop.total} Stimmen zum Flop des Monats. Kopf hoch, der nächste Monat kommt bestimmt!`,
    `Und dann gibt es noch ${nm(flop.id)}, von der Mannschaft zum Flop des Monats gewählt (${flop.votes} von ${flop.total} Stimmen). Wir sind sicher: Das Comeback folgt.`
  ]) });

  // ---------- Abschluss ----------
  paras.push({ h: null, t: potm
    ? one([
        `Zum Spieler des Monats wählte die Mannschaft ${nm(potm.id)} (${potm.votes} von ${potm.total} Stimmen). Glückwunsch!`,
        `Die Mannschaft hat entschieden: Spieler des Monats ist ${nm(potm.id)} mit ${potm.votes} von ${potm.total} Stimmen.`
      ])
    : one([
        `Wer wird Spieler des Monats? Die Abstimmung in der App läuft – jede Stimme zählt.`,
        `Jetzt ist die Mannschaft gefragt: In der App wird der Spieler des Monats gewählt.`
      ]) });

  const table = pointsList.slice(0, 5).map(s => ({ name: nm(s.id), g: s.g, a: s.a, p: s.g + s.a }));
  return {
    kicker: `Trainingskick · ${mName} ${y}`,
    headline, deck, lead, paras, table,
    photo: potm ? potm.id : S1.id,
    caption: potm ? `Spieler des Monats: ${nm(potm.id)}` : `Torjäger des Monats: ${nm(S1.id)} (${tore(S1.g)})`,
    potm, flop,
    dateline: new Date(y, m, 0).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }),
    issue: `Ausgabe ${mName} ${y}`
  };
}

function articleToText(a) {
  return [a.kicker.toUpperCase(), '', a.headline, a.deck, '', a.lead, '', ...a.paras.map(p => (p.h ? p.h.toUpperCase() + '\n' : '') + p.t + '\n'),
    'TOP 5 SCORER', ...a.table.map((r, i) => `${i + 1}. ${r.name} – ${r.g} Tore, ${r.a} Assists`)].join('\n');
}
