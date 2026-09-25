/* ============================================================
   EASTER EGG: 4× auf das Wappen tippen → Elfmeter-Challenge
   Modus 1: gegen den Torwart – 3 Tore, möglichst wenige Schüsse
   Modus 2: Zielschießen auf Zeit – 3 Ziele nacheinander, Zeit ab dem ersten Schuss
   Schießen wie bei Score Hero: Flugbahn mit dem Finger malen, ein Bogen im Wischen = Bogen im Flug.
   ============================================================ */
(function () {
  let taps = [], game = null;

  document.addEventListener('click', e => {
    if (!e.target.closest('.top .crest')) return;
    const now = Date.now();
    taps = taps.filter(t => now - t < 1500); taps.push(now);
    if (taps.length >= 4) { taps = []; openMenu(); }
  });
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  const fmtT = ms => (ms / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s';

  function shell() {
    const wrap = document.createElement('div');
    wrap.className = 'egg';
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    return wrap;
  }
  function openMenu() {
    if (game || document.querySelector('.egg')) return;
    vib([20, 40, 20]);
    const wrap = shell();
    const bestK = ls.get('h2ku-egg-best', null), bestT = ls.get('h2ku-egg-best-time', null);
    wrap.innerHTML = `<div class="egg-menu">
        <button class="egg-x" aria-label="Schließen">✕</button>
        <div class="egg-title">Elfmeter-Challenge</div>
        <p>Mal die Flugbahn mit dem Finger – ein Bogen beim Wischen gibt Effet.</p>
        <button class="egg-mode" data-mode="keeper"><b>Gegen den Torwart</b><span>3 Tore mit möglichst wenigen Schüssen</span><em>Rekord: ${bestK ?? '–'}${bestK ? ' Schüsse' : ''}</em></button>
        <button class="egg-mode" data-mode="targets"><b>Zielschießen auf Zeit</b><span>3 Ziele, die Zeit läuft ab dem ersten Schuss</span><em>Rekord: ${bestT ? fmtT(bestT) : '–'}</em></button>
      </div>`;
    wrap.querySelector('.egg-x').onclick = () => { wrap.remove(); document.body.style.overflow = ''; };
    wrap.querySelectorAll('.egg-mode').forEach(b => b.onclick = () => { wrap.remove(); startGame(b.dataset.mode); });
  }

  function startGame(mode) {
    const keepers = D.players.filter(p => p.active && /TW/i.test(p.pos || ''));
    const pool = keepers.length ? keepers : D.players.filter(p => p.active && !p.guest);
    const keeper = pool[Math.floor(Math.random() * pool.length)];
    const wrap = shell();
    const K = mode === 'keeper';
    wrap.innerHTML = `<canvas></canvas>
      <div class="egg-hud"><div id="egg-a">${K ? '<b>0</b>/3 Tore' : 'Ziel <b>1</b>/3'}</div><div id="egg-b">${K ? '0 Schüsse' : '0,0 s'}</div><button class="egg-x" aria-label="Schließen">✕</button></div>
      <div class="egg-msg stay hint" id="egg-msg">${K ? 'Mal die Flugbahn Richtung Tor!' : 'Triff die Zielscheibe – die Zeit startet mit dem ersten Schuss'}</div>
      <div class="egg-foot">${K ? `Im Tor: <b>${esc(keeper.name)}</b> · ` : ''}Rekord: <b id="egg-best">${K ? (ls.get('h2ku-egg-best', null) ?? '–') : (ls.get('h2ku-egg-best-time', null) ? fmtT(ls.get('h2ku-egg-best-time', null)) : '–')}</b></div>`;
    const cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d');
    const img = new Image(); img.src = face(keeper.id);
    const G = game = { mode, wrap, goals: 0, shots: 0, hits: 0, state: 'aim', t0: performance.now(), speed: 1, ball: null, kx: 0, dive: 0, diveDir: 0, done: false, tStart: null, tEnd: null, target: null };
    let W, H, dpr, goal;

    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gw = Math.min(W - 32, 420), gh = gw * 0.44;
      goal = { x: (W - gw) / 2, y: H * 0.2, w: gw, h: gh };
      if (!G.kx) G.kx = G.kxStart = goal.x + gw / 2;
      if (!G.target && !K) newTarget();
      resetBall();
    }
    function resetBall() { G.ball = { x: W / 2, y: H * 0.78, r: 22, fly: null }; G.state = 'aim'; G.dive = 0; G.diveDir = 0; }
    function newTarget() {
      const sizes = [0.13, 0.095, 0.065];                                   // groß, mittel, klein (Anteil der Torbreite)
      const r = goal.w * sizes[Math.floor(Math.random() * sizes.length)];
      G.target = { r, x: goal.x + r + 8 + Math.random() * (goal.w - 2 * r - 16), y: goal.y + r + 8 + Math.random() * (goal.h - 2 * r - 12), born: performance.now() };
    }
    window.addEventListener('resize', resize); resize();

    // ---------- Eingabe: Flugbahn malen ----------
    let path = null;
    cv.addEventListener('pointerdown', e => { if (G.state !== 'aim') return; path = [{ x: e.clientX, y: e.clientY }]; try { cv.setPointerCapture(e.pointerId); } catch {} });
    cv.addEventListener('pointermove', e => { if (path) path.push({ x: e.clientX, y: e.clientY }); });
    cv.addEventListener('pointerup', e => {
      if (!path || G.state !== 'aim') return;
      path.push({ x: e.clientX, y: e.clientY });
      const s = path[0], en = path[path.length - 1], dx = en.x - s.x, dy = en.y - s.y;
      if (dy > -30) { path = null; return msg('Nach oben wischen!'); }
      // Bogen: größte seitliche Abweichung vom geraden Weg (Vorzeichen = Seite)
      const L = Math.hypot(dx, dy); let curve = 0;
      path.forEach(p => { const d = ((p.x - s.x) * dy - (p.y - s.y) * dx) / L; if (Math.abs(d) > Math.abs(curve)) curve = d; });
      // Anfangsrichtung – danach rät der Torwart
      const early = path[Math.max(1, Math.floor(path.length * 0.35))] || en;
      const ex = early.x - s.x, ey = early.y - s.y;
      path = null;
      const len = Math.min(1.35, -dy / (H * 0.45));
      const tx = G.ball.x + dx * 1.7, ty = goal.y + goal.h - len * goal.h * 1.05;
      const guessX = ey < -5 ? G.ball.x + (ex / -ey) * -dy * 1.7 : tx;
      shoot(tx, ty, Math.max(-1, Math.min(1, curve / 60)), guessX);
    });

    function shoot(tx, ty, bend, guessX) {
      G.state = 'fly'; G.shots++;
      if (!K && G.tStart === null) G.tStart = performance.now();
      if (K) $('#egg-b').textContent = G.shots + (G.shots === 1 ? ' Schuss' : ' Schüsse');
      const sx = G.ball.x, sy = G.ball.y, mx = (sx + tx) / 2, my = (sy + ty) / 2, nx = -(ty - sy), ny = tx - sx, nl = Math.hypot(nx, ny) || 1;
      const amt = bend * Math.hypot(tx - sx, ty - sy) * 0.45;
      G.ball.fly = { sx, sy, tx, ty, cx: mx + nx / nl * amt, cy: my + ny / nl * amt - 20, start: performance.now(), dur: 560 };
      if (K) {
        G.kxStart = G.kx || goal.x + goal.w / 2; G.diveDir = 0;
        // Torwart rät nach der Anfangsrichtung – mit steigendem Tempo besser
        let guess = guessX;
        if (Math.random() < Math.max(0.2, 0.42 - G.speed * 0.06)) guess = goal.x + goal.w - (guess - goal.x);   // falsche Ecke
        const err = (1.3 - Math.min(0.7, G.speed * 0.15)) * (Math.random() - 0.5) * goal.w * 0.5;
        G.diveTo = Math.max(goal.x + 20, Math.min(goal.x + goal.w - 20, guess + err));
        G.diveDelay = 90 + Math.random() * 140;
      }
    }

    function msg(t, cls = '') { const m = $('#egg-msg'); if (!m) return; m.textContent = t; m.className = 'egg-msg show ' + cls; clearTimeout(G.msgT); G.msgT = setTimeout(() => m.classList.remove('show'), 1100); }

    function keeperBox() {
      // beim Hechten reichen die gestreckten Arme bis in die obere Ecke
      const kh = goal.h * 0.86, kw = goal.w * 0.13, reach = G.dive * goal.w * 0.2;
      const left = G.kx - kw / 2 - (G.diveDir < 0 ? reach : 0) - 8, right = G.kx + kw / 2 + (G.diveDir > 0 ? reach : 0) + 8;
      const top = goal.y + goal.h - kh - G.dive * goal.h * 0.08 - 6;
      return { left, right, top };
    }
    function result(tx, ty) {
      const inGoal = tx > goal.x + 6 && tx < goal.x + goal.w - 6 && ty > goal.y + 4 && ty < goal.y + goal.h;
      if (K) {
        const b = keeperBox();
        const saved = inGoal && tx > b.left && tx < b.right && ty > b.top;
        if (!inGoal) msg(ty <= goal.y + 4 ? 'Drüber!' : 'Daneben!', 'bad');
        else if (saved) { msg('Gehalten!', 'bad'); vib(60); }
        else {
          G.goals++; G.speed += 0.45; $('#egg-a').innerHTML = `<b>${G.goals}</b>/3 Tore`; vib([30, 30, 30]);
          if (G.goals >= 3) return finish();
          msg('TOOOR!', 'good');
        }
      } else {
        const t = G.target, hit = inGoal && Math.hypot(tx - t.x, ty - t.y) <= t.r + 8;
        if (hit) {
          G.hits++; vib([30, 30, 30]);
          if (G.hits >= 3) { G.tEnd = performance.now(); return finish(); }
          msg('Treffer!', 'good'); $('#egg-a').innerHTML = `Ziel <b>${G.hits + 1}</b>/3`;
          setTimeout(() => { if (!G.done) newTarget(); }, 450);
        } else msg(!inGoal ? (ty <= goal.y + 4 ? 'Drüber!' : 'Daneben!') : 'Knapp vorbei!', 'bad');
      }
      setTimeout(() => { if (!G.done) resetBall(); }, 850);
    }

    function finish() {
      G.done = true;
      let text;
      if (K) {
        const best = ls.get('h2ku-egg-best', null), rec = best === null || G.shots < best;
        if (rec) { ls.set('h2ku-egg-best', G.shots); $('#egg-best').textContent = G.shots; }
        text = `Geschafft! 3 Tore in ${G.shots} Schüssen${rec ? ' – neuer Rekord!' : ''}`;
      } else {
        const ms = G.tEnd - G.tStart, best = ls.get('h2ku-egg-best-time', null), rec = best === null || ms < best;
        if (rec) { ls.set('h2ku-egg-best-time', Math.round(ms)); $('#egg-best').textContent = fmtT(ms); }
        $('#egg-b').textContent = fmtT(ms);
        text = `Alle 3 Ziele in ${fmtT(ms)}${rec ? ' – neuer Rekord!' : ''}`;
      }
      msg(text, 'good big'); $('#egg-msg').classList.add('stay');
      confetti();
      setTimeout(() => reward(text), 1400);
    }
    // Belohnung (Insider): ein Jacky Cola – rein zum Spaß, ohne Auswirkung auf irgendwas
    function reward(text) {
      const r = document.createElement('div');
      r.className = 'egg-reward';
      r.innerHTML = `<div class="jc-title">Belohnung</div>
        <svg class="jc" viewBox="0 0 200 260" aria-hidden="true">
          <defs><clipPath id="jcg"><path d="M40 30 L160 30 L148 238 Q146 250 134 250 L66 250 Q54 250 52 238 Z"/></clipPath>
            <linearGradient id="jcl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a3b12"/><stop offset="1" stop-color="#3a1204"/></linearGradient></defs>
          <g clip-path="url(#jcg)">
            <rect class="jc-liquid" x="30" y="60" width="140" height="200" fill="url(#jcl)"/>
            <rect class="jc-foam" x="30" y="56" width="140" height="8" fill="#c9895a" opacity=".85"/>
            <g class="jc-ice"><rect x="62" y="70" width="34" height="30" rx="6" fill="#e8f6ff" opacity=".75" transform="rotate(-12 79 85)"/><rect x="104" y="84" width="30" height="28" rx="6" fill="#e8f6ff" opacity=".7" transform="rotate(14 119 98)"/></g>
            <g class="jc-bubbles">${Array.from({ length: 12 }, (_, i) => `<circle cx="${50 + (i * 37) % 100}" cy="240" r="${2 + (i % 3)}" fill="#fff" opacity=".55" style="animation-delay:${(i * 0.23).toFixed(2)}s"/>`).join('')}</g>
          </g>
          <path d="M40 30 L160 30 L148 238 Q146 250 134 250 L66 250 Q54 250 52 238 Z" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="5" stroke-linejoin="round"/>
          <path d="M58 44 L66 220" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
          <g class="jc-straw"><path d="M120 250 L150 -6 L174 -6" fill="none" stroke="#e10026" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
          <g class="jc-lemon"><circle cx="160" cy="34" r="22" fill="#f6d743" stroke="#fff" stroke-width="3"/><path d="M160 14v40M140 34h40M146 20l28 28M174 20l-28 28" stroke="#fff6c2" stroke-width="2"/></g>
        </svg>
        <div class="jc-name">1 Jacky Cola</div>
        <div class="jc-sub">${esc(text)}</div>
        <button class="btn gold jc-btn">Prost!</button>`;
      wrap.appendChild(r);
      vib([40, 60, 40, 60, 120]);
      const back = () => { close(); S.tab = 'home'; closeSheet(true); scrollTo(0, 0); render(true); };
      r.querySelector('.jc-btn').onclick = back;
      G.rewardT = setTimeout(back, 9000);
    }
    function close() {
      if (!game) return;
      clearTimeout(G.rewardT);
      game = null; cancelAnimationFrame(G.raf); window.removeEventListener('resize', resize);
      wrap.remove(); document.body.style.overflow = '';
    }
    wrap.querySelector('.egg-x').onclick = close;

    // ---------- Zeichnen ----------
    const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); };
    function drawBall(x, y, r) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, r * .9, r * .9, r * .28, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.lineTo(Math.cos(a) * r * .38, Math.sin(a) * r * .38); }
      ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = r * .08;
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .38, Math.sin(a) * r * .38); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
      ctx.restore();
    }
    const limb = (x1, y1, x2, y2, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    function drawKeeper(now) {
      const s = goal.h / 190;                                       // Körper ≈ 0,86 × Torhöhe
      const ground = goal.y + goal.h - 2, d = G.dive * G.diveDir;
      const hop = G.state === 'aim' ? Math.abs(Math.sin(now / 260)) * 4 * s : 0;
      ctx.save();
      ctx.translate(G.kx, ground - hop);
      ctx.rotate(d * 1.05);                                         // Hechtsprung: Körper kippt zur Seite
      ctx.translate(0, -Math.abs(d) * 22 * s);
      const hipY = -58 * s, shY = -128 * s, jersey = '#f4c20d', skin = '#f1c9a0';
      // Beine + Schuhe
      const spread = 16 * s + Math.abs(d) * 10 * s;
      limb(-7 * s, hipY, -spread, -4 * s, 13 * s, '#222'); limb(7 * s, hipY, spread, -4 * s, 13 * s, '#222');
      limb(-spread, -4 * s, -spread - 6 * s, 0, 12 * s, '#111'); limb(spread, -4 * s, spread + 6 * s, 0, 12 * s, '#111');
      // Hose
      ctx.fillStyle = '#1b1b1b'; rr(-20 * s, hipY - 10 * s, 40 * s, 26 * s, 6 * s);
      // Arme: bereit (schräg nach unten/außen) oder beim Hechten über den Kopf gestreckt
      const up = Math.abs(d) > 0.15;
      const armL = up ? [-40 * s, shY - 48 * s] : [-46 * s, shY + 34 * s];
      const armR = up ? [40 * s, shY - 48 * s] : [46 * s, shY + 34 * s];
      limb(-20 * s, shY + 8 * s, armL[0], armL[1], 12 * s, jersey); limb(20 * s, shY + 8 * s, armR[0], armR[1], 12 * s, jersey);
      ctx.fillStyle = '#fff'; [armL, armR].forEach(a => { ctx.beginPath(); ctx.arc(a[0], a[1], 9 * s, 0, 7); ctx.fill(); });
      // Trikot
      ctx.fillStyle = jersey; rr(-24 * s, shY, 48 * s, 78 * s, 10 * s);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-24 * s, shY + 30 * s, 48 * s, 6 * s);
      // Hals + Kopf mit echtem Gesicht
      ctx.fillStyle = skin; ctx.fillRect(-6 * s, shY - 10 * s, 12 * s, 12 * s);
      const hr = 20 * s, hy = shY - 26 * s;
      ctx.save(); ctx.beginPath(); ctx.arc(0, hy, hr, 0, 7); ctx.clip();
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -hr, hy - hr, hr * 2, hr * 2); else { ctx.fillStyle = skin; ctx.fill(); }
      ctx.restore();
      ctx.restore();
    }
    function drawTarget(now) {
      const t = G.target; if (!t) return;
      const pop = Math.min(1, (now - t.born) / 220), r = t.r * (0.6 + 0.4 * pop) * (1 + Math.sin(now / 180) * 0.03);
      [['#e10026', 1], ['#ffffff', .72], ['#e10026', .44], ['#ffffff', .18]].forEach(([c, f]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(t.x, t.y, r * f, 0, 7); ctx.fill(); });
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 7); ctx.stroke();
    }
    function frame(now) {
      G.raf = requestAnimationFrame(frame);
      const t = (now - G.t0) / 1000;
      // Rasen + Strafraum
      ctx.fillStyle = '#123e22'; ctx.fillRect(0, 0, W, goal.y + goal.h);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#237a3b' : '#1f6b34'; ctx.fillRect(0, goal.y + goal.h + i * (H - goal.y - goal.h) / 8, W, (H - goal.y - goal.h) / 8 + 1); }
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, goal.y + goal.h); ctx.lineTo(W, goal.y + goal.h); ctx.stroke();
      ctx.strokeRect(goal.x - 40, goal.y + goal.h, goal.w + 80, H * 0.22);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2, H * 0.78, 4, 0, 7); ctx.fill();
      // Netz
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
      for (let x = goal.x; x <= goal.x + goal.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, goal.y); ctx.lineTo(x, goal.y + goal.h); ctx.stroke(); }
      for (let y = goal.y; y <= goal.y + goal.h; y += 14) { ctx.beginPath(); ctx.moveTo(goal.x, y); ctx.lineTo(goal.x + goal.w, y); ctx.stroke(); }
      // Torwart oder Ziel
      if (K) {
        const base = goal.x + goal.w / 2 + Math.sin(t * (0.9 + G.speed * 0.45)) * goal.w * 0.22;
        if (G.state === 'fly') {
          const p = Math.max(0, Math.min(1, (now - G.ball.fly.start - G.diveDelay) / (300 / (0.8 + G.speed * .3))));
          if (!G.diveDir) G.diveDir = Math.sign(G.diveTo - G.kx) || 1;
          G.dive = p; G.kx = G.kxStart + (G.diveTo - G.kxStart) * p * 0.75;
        } else if (G.state === 'aim') { G.kx = base; G.kxStart = base; G.dive = 0; }
        drawKeeper(now);
      } else drawTarget(now);
      // Pfosten + Latte
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(goal.x, goal.y + goal.h); ctx.lineTo(goal.x, goal.y); ctx.lineTo(goal.x + goal.w, goal.y); ctx.lineTo(goal.x + goal.w, goal.y + goal.h); ctx.stroke();
      // Ball auf gekrümmter Bahn
      const b = G.ball;
      if (b.fly) {
        const f = b.fly, p = Math.min(1, (now - f.start) / f.dur), e = 1 - Math.pow(1 - p, 2), u = 1 - e;
        b.x = u * u * f.sx + 2 * u * e * f.cx + e * e * f.tx;
        b.y = u * u * f.sy + 2 * u * e * f.cy + e * e * f.ty;
        b.r = 22 - 10 * e;
        if (p >= 1 && G.state === 'fly') { G.state = 'result'; result(f.tx, f.ty); }
      }
      drawBall(b.x, b.y, b.r);
      // Zeit (Zielschießen)
      if (!K && G.tStart !== null && !G.done) $('#egg-b').textContent = fmtT(now - G.tStart);
    }
    G.raf = requestAnimationFrame(frame);
    window.__egg = { G, frame, reward, get goal() { return goal; } };   // nur für Tests
  }
})();
