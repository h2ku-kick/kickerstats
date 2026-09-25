/* ============================================================
   EASTER EGG: 4× auf das Wappen tippen → Elfmeterschießen
   Wischen vom Ball Richtung Tor: Richtung = Ecke, Länge = Höhe.
   3 Tore → geschafft, zurück zur Übersicht.
   ============================================================ */
(function () {
  let taps = [], game = null;

  document.addEventListener('click', e => {
    if (!e.target.closest('.top .crest')) return;
    const now = Date.now();
    taps = taps.filter(t => now - t < 1500); taps.push(now);
    if (taps.length >= 4) { taps = []; startGame(); }
  });

  function startGame() {
    if (game) return;
    try { navigator.vibrate && navigator.vibrate([20, 40, 20]); } catch {}
    const keepers = D.players.filter(p => p.active && /TW/i.test(p.pos || ''));
    const pool = keepers.length ? keepers : D.players.filter(p => p.active && !p.guest);
    const keeper = pool[Math.floor(Math.random() * pool.length)];

    const wrap = document.createElement('div');
    wrap.className = 'egg';
    wrap.innerHTML = `<canvas></canvas>
      <div class="egg-hud"><div><b id="egg-goals">0</b>/3 Tore</div><div id="egg-shots">0 Schüsse</div><button class="egg-x" aria-label="Schließen">✕</button></div>
      <div class="egg-msg stay hint" id="egg-msg">Wisch vom Ball Richtung Tor!</div>
      <div class="egg-foot">Im Tor: <b>${esc(keeper.name)}</b> · Rekord: <b id="egg-best">${ls.get('h2ku-egg-best', null) ?? '–'}</b></div>`;
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d');
    const img = new Image(); img.src = face(keeper.id);

    const G = game = { wrap, goals: 0, shots: 0, state: 'aim', t0: performance.now(), speed: 1, ball: null, keeperX: 0, dive: 0, msgT: 0, done: false };
    let W, H, dpr, goal;
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gw = Math.min(W - 32, 420), gh = gw * 0.42;
      goal = { x: (W - gw) / 2, y: H * 0.2, w: gw, h: gh };
      resetBall();
    }
    function resetBall() { G.ball = { x: W / 2, y: H * 0.78, r: 22, fly: null }; G.state = 'aim'; G.dive = 0; }
    window.addEventListener('resize', resize); resize();

    // ---------- Eingabe: Wischen ----------
    let start = null;
    cv.addEventListener('pointerdown', e => { if (G.state !== 'aim') return; start = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    cv.addEventListener('pointerup', e => {
      if (!start || G.state !== 'aim') return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
      if (dy > -30) return msg('Nach oben wischen!');
      const len = Math.min(1.35, -dy / (H * 0.45));                     // Länge des Wischens → Höhe
      const tx = G.ball.x + dx * 1.7;
      const ty = goal.y + goal.h - len * goal.h * 1.05;                  // > 1 → über die Latte
      shoot(tx, ty);
    });

    function shoot(tx, ty) {
      G.state = 'fly'; G.shots++; $('#egg-shots').textContent = G.shots + (G.shots === 1 ? ' Schuss' : ' Schüsse');
      G.ball.fly = { sx: G.ball.x, sy: G.ball.y, tx, ty, start: performance.now(), dur: 520 };
      // Torwart reagiert: springt mit etwas Verzögerung Richtung Ball, mit steigendem Tempo besser
      const miss = (1.4 - Math.min(0.9, G.speed * 0.25)) * (Math.random() - 0.5) * goal.w * 0.5;
      G.diveTo = Math.max(goal.x, Math.min(goal.x + goal.w, tx + miss));
      G.diveDelay = 120 + Math.random() * 160;
    }

    function msg(t, cls = '') { const m = $('#egg-msg'); m.textContent = t; m.className = 'egg-msg show ' + cls; clearTimeout(G.msgT); G.msgT = setTimeout(() => m.classList.remove('show'), 1100); }

    function result(tx, ty) {
      const inGoal = tx > goal.x + 6 && tx < goal.x + goal.w - 6 && ty > goal.y + 4 && ty < goal.y + goal.h;
      const kw = goal.w * 0.2, kh = goal.h * 0.78, kx = G.keeperX, ky = goal.y + goal.h - kh;
      const saved = inGoal && tx > kx - kw / 2 - 12 && tx < kx + kw / 2 + 12 && ty > ky - 10;
      if (!inGoal) { msg(ty <= goal.y + 4 ? 'Drüber!' : 'Daneben!', 'bad'); }
      else if (saved) { msg('Gehalten!', 'bad'); try { navigator.vibrate && navigator.vibrate(60); } catch {} }
      else {
        G.goals++; G.speed += 0.45; $('#egg-goals').textContent = G.goals;
        try { navigator.vibrate && navigator.vibrate([30, 30, 30]); } catch {}
        if (G.goals >= 3) return finish();
        msg('TOOOR!', 'good');
      }
      setTimeout(() => { if (!G.done) resetBall(); }, 900);
    }

    function finish() {
      G.done = true;
      const best = ls.get('h2ku-egg-best', null), rec = best === null || G.shots < best;
      if (rec) { ls.set('h2ku-egg-best', G.shots); $('#egg-best').textContent = G.shots; }
      msg(`Geschafft! 3 Tore in ${G.shots} Schüssen${rec ? ' – neuer Rekord!' : ''}`, 'good big');
      $('#egg-msg').classList.add('stay');
      confetti();
      setTimeout(() => { close(); S.tab = 'home'; closeSheet(true); scrollTo(0, 0); render(true); }, 2600);
    }

    function close() {
      if (!game) return;
      game = null; cancelAnimationFrame(G.raf); window.removeEventListener('resize', resize);
      wrap.remove(); document.body.style.overflow = '';
    }
    wrap.querySelector('.egg-x').onclick = close;

    // ---------- Zeichnen ----------
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
    function frame(now) {
      G.raf = requestAnimationFrame(frame);
      const t = (now - G.t0) / 1000;
      // Rasen
      ctx.fillStyle = '#1f6b34'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#237a3b' : '#1f6b34'; ctx.fillRect(0, goal.y + goal.h + i * (H - goal.y - goal.h) / 8, W, (H - goal.y - goal.h) / 8); }
      ctx.fillStyle = '#123e22'; ctx.fillRect(0, 0, W, goal.y + goal.h);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, goal.y + goal.h); ctx.lineTo(W, goal.y + goal.h); ctx.stroke();
      ctx.strokeRect(goal.x - 40, goal.y + goal.h, goal.w + 80, H * 0.22);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2, H * 0.78, 4, 0, 7); ctx.fill();
      // Netz
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
      for (let x = goal.x; x <= goal.x + goal.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, goal.y); ctx.lineTo(x, goal.y + goal.h); ctx.stroke(); }
      for (let y = goal.y; y <= goal.y + goal.h; y += 14) { ctx.beginPath(); ctx.moveTo(goal.x, y); ctx.lineTo(goal.x + goal.w, y); ctx.stroke(); }
      // Torwart
      const base = goal.x + goal.w / 2 + Math.sin(t * (1.1 + G.speed * .55)) * goal.w * 0.3;
      if (G.state === 'fly') G.dive = Math.max(0, Math.min(1, (now - G.ball.fly.start - G.diveDelay) / (260 / (0.8 + G.speed * .3))));   // zeitbasiert, unabhängig von der Bildrate
      G.keeperX = G.state === 'fly' ? base + (G.diveTo - base) * G.dive : base;
      const kw = goal.w * 0.2, kh = goal.h * 0.78, kx = G.keeperX, ky = goal.y + goal.h - kh;
      ctx.fillStyle = '#5db7ff'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(kx - kw / 2, ky + kh * .32, kw, kh * .68, 10); else ctx.rect(kx - kw / 2, ky + kh * .32, kw, kh * .68); ctx.fill();
      ctx.fillStyle = '#e8f3ff'; ctx.fillRect(kx - kw / 2 - 10, ky + kh * .36, 12, kh * .18); ctx.fillRect(kx + kw / 2 - 2, ky + kh * .36, 12, kh * .18);
      const hr = kh * .2;
      ctx.save(); ctx.beginPath(); ctx.arc(kx, ky + hr, hr, 0, 7); ctx.clip();
      if (img.complete && img.naturalWidth) ctx.drawImage(img, kx - hr, ky, hr * 2, hr * 2); else { ctx.fillStyle = '#f1c9a0'; ctx.fill(); }
      ctx.restore();
      // Pfosten + Latte
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(goal.x, goal.y + goal.h); ctx.lineTo(goal.x, goal.y); ctx.lineTo(goal.x + goal.w, goal.y); ctx.lineTo(goal.x + goal.w, goal.y + goal.h); ctx.stroke();
      // Ball
      const b = G.ball;
      if (b.fly) {
        const p = Math.min(1, (now - b.fly.start) / b.fly.dur), e = 1 - Math.pow(1 - p, 2);
        b.x = b.fly.sx + (b.fly.tx - b.fly.sx) * e;
        b.y = b.fly.sy + (b.fly.ty - b.fly.sy) * e - Math.sin(p * Math.PI) * 30;
        b.r = 22 - 10 * e;
        if (p >= 1 && G.state === 'fly') { G.state = 'result'; result(b.fly.tx, b.fly.ty); }
      }
      drawBall(b.x, b.y, b.r);
    }
    G.raf = requestAnimationFrame(frame);
    window.__egg = { G, frame };   // nur für Tests
  }
})();
