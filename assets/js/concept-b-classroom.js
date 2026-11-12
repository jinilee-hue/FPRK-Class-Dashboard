/* Phonics POND · Classroom (concept B, classroom-screen version: the teacher's screen is the classroom screen) — presenter shell for the classroom e-board.
   The student screen is a fixed 16:10 frame: content is made at 1280 × 800 (the academy's activity/tablet size) and the
   dashboard letterboxes it. Teacher view: controls bottom / left / right, notes as a pop-up or a side panel, floating
   board tools, class tools on the student screen (timer, pick a student, eyes on me), the user's phonics games for the
   lesson, share with students. Student view (?view=student): the frame only, mirrored live over BroadcastChannel. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const ic = (n, c) => FP.icon(n, c), esc = FP.esc;
  const root = document.documentElement;
  const qs = new URLSearchParams(location.search);
  const STUDENT = root.dataset.view === 'student';
  const CH = 'BroadcastChannel' in window ? new BroadcastChannel('phonics-pond-class') : null;
  const DESIGN = [1280, 800];
  const put = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };

  /* ---------- colour themes: [id, label, frame, board, action] ---------- */
  const THEMES = [['dark', 'Dark', '#0E1013', '#F6F3EC', '#FFC83D'], ['mint', 'Mint', '#62D4B4', '#FFFFFF', '#D33275'], ['yellow', 'Yellow', '#FFE15A', '#FFFFFF', '#1D1A0F'],
    ['white', 'White', '#FFFFFF', '#FFFFFF', '#0066FF'], ['blue', 'Blue', '#4D8DFF', '#FFFFFF', '#FFD43B'], ['pink', 'Pink', '#FF8DBB', '#FFFFFF', '#3B0F26']];
  function applyTheme(t) { if (!THEMES.some(x => x[0] === t)) t = 'dark'; root.dataset.theme = t; root.dataset.tone = t === 'dark' ? 'dark' : 'bright'; }

  /* ---------- the user's phonics games, matched to the lesson ---------- */
  const GAME_BASE = 'https://jinilee-hue.github.io/';
  // Phonics Match: one board per FPR K unit, six levels each; level k of a unit leads with slot k (slots 4 and 5 share level 4)
  const MATCH = { animals: [[1, 'm a s t p'], [2, 'i c f d'], [3, 'h o r b l'], [4, 'e g x'], [6, 'z']], objects: [[1, 'm a s t p'], [2, 'n i c f d'], [3, 'h r b l'], [4, 'k e g w x'], [5, 'v u j qu y'], [6, 'z']] };
  function matchLevel(L) {
    for (const th of ['animals', 'objects']) {
      const us = MATCH[th];
      for (let i = 0; i < us.length; i++) {
        const sl = us[i][1].split(' '), s = sl.indexOf(L.ltr);
        if (s >= 0) return { theme: th, unit: us[i][0], level: i * 6 + (sl.length === 1 ? 1 : [1, 2, 3, 4, 4][s]) };
      }
    }
    return { theme: 'animals', unit: 6, level: 25 };   // review lessons 27–30 → the Unit 6 board
  }
  const GAMES = [
    { id: 'g-croco', name: 'Croco Phonics', poster: 'croco', path: 'Croco-Phonics/', blurb: 'Crocodile dentist · say the word', has: L => L.n <= 10, q: L => `?level=${L.n}`, sub: L => `Level ${L.n} · ${L.snd}` },
    { id: 'g-magic', name: 'Magic Block', poster: 'magic', path: 'Magic-Block/', blurb: 'Pull a block · read it aloud', has: L => L.n === 1, q: () => '', sub: () => 'm-word tower' },
    { id: 'g-match', name: 'Phonics Match', poster: 'match', path: 'Phonics-Match/', blurb: 'Match three · say the word', has: () => true, q: L => { const m = matchLevel(L); return `?theme=${m.theme}&level=${m.level}`; }, sub: L => { const m = matchLevel(L); return `Unit ${m.unit} · ${m.theme === 'animals' ? 'Animals' : 'Things'} · Level ${m.level}`; } },
    { id: 'g-island', name: 'Phonics Island', poster: 'island', path: 'phonics-island/', blurb: '3D island · lesson stations', has: L => L.n <= 10, q: L => `?start=lesson${L.n}`, sub: L => `Lesson ${L.n} stations` },
  ];
  // class activities that open a game in some lessons (user: Magic Sand is Lesson 1's Handwriting Words, not a game)
  const EXTRA_GAMES = {
    'x-mfh': { name: 'Magic Sand', poster: 'sand', url: 'https://file.koreapolyschool.com/Contents/LCMSContents/temp/glearning/antony/04/', tag: 'Handwriting', icon: 'pen', blurb: 'Trace the letter in magic sand', has: L => L.n === 1, q: () => '', sub: () => 'Magic Sand · trace M and m' },   // POLY G-Learning (Lesson 1 · ④)
  };
  // the lesson's phonics games are Meaning First class activities (user), listed after its own items
  const mfGroup = FP.extras().find(g => g.group === 'Meaning First') || FP.extras()[0];
  const mfBase = mfGroup.items.slice();
  function refreshGames() {
    const L = FP.lesson(); if (!L) return;
    mfGroup.items = [...mfBase, ...GAMES.filter(g => g.has(L) && g.id !== 'g-island').map(g => ({ id: g.id, label: g.name, sub: g.sub(L), group: mfGroup.group, icon: 'gamepad', game: g }))];   // Phonics Island is not a Meaning First activity (user)
    for (const g of FP.extras()) for (const it of g.items) {
      const eg = EXTRA_GAMES[it.id]; if (!eg) continue;
      if (!it.base) it.base = { sub: it.sub, soon: it.soon };
      if (eg.has(L)) Object.assign(it, { game: eg, sub: eg.sub(L), soon: false });
      else { delete it.game; Object.assign(it, it.base); }
    }
  }
  // the same content on the lesson path (user: "activity에 있는거 그 앞에 section에 연결", "handwriting과 meaning first 연결")
  const FLOW_GAMES = [
    { has: (L, sec) => L.n === 1 && sec.name === 'Handwriting', game: () => EXTRA_GAMES['x-mfh'] },   // Lesson 1 › Handwriting › Trace and Write = Magic Sand
  ];
  const MF_GAMES = 3;   // Introduction › Meaning First: step 4 "Games" = the lesson's games (Croco Phonics · Magic Block · Phonics Match)
  const lessonGames = () => { const L = FP.lesson(); return L ? GAMES.filter(g => g.has(L) && g.id !== 'g-island').map(g => ({ id: g.id, label: g.name, sub: g.sub(L), game: g })) : []; };
  function addGamesStep() {   // core builds Meaning First with 3 steps; the games step is added here (also in the classroom-screen window)
    let added = false;
    for (const a of FP.flow()) if (a.id === 'si1' && a.steps.length === MF_GAMES && lessonGames().length) { a.steps = [...a.steps, 'Games']; added = true; }
    return added;
  }
  const flowGame = a => { const L = FP.lesson(), f = L && FLOW_GAMES.find(x => x.has(L, FP.section(), a)); return f ? f.game() : null; };
  const curGame = () => {
    const it = FP.extraInfo(); if (it && it.game) return it;
    if (FP.mode() === 'extra') return null;
    const a = FP.cur(), L = FP.lesson(); if (!a || !L) return null;
    const g = flowGame(a); if (g) return { id: 'f-' + a.id, label: g.name, sub: g.sub(L), game: g };
    if (a.id === 'si1' && FP.state().step === MF_GAMES) { const gs = lessonGames(); return gs.length === 1 ? gs[0] : gs.length ? { id: 'f-si1', label: 'Games', picker: gs } : null; }
    return null;
  };
  const gameUrl = it => (it.game.url || GAME_BASE + it.game.path) + it.game.q(FP.lesson());

  /* ---------- class tools shown on the student screen ---------- */
  let scene = 'lesson', resumeTo = 'lesson';                 // lesson | timer | pick | pause
  const TM = { dur: 60000, left: 60000, endAt: 0, run: false, done: false };
  const tLeft = () => (TM.run ? Math.max(0, TM.endAt - Date.now()) : TM.left);
  const tActive = () => TM.run || TM.done || TM.left < TM.dur;
  const PK = { name: '', seq: null, t0: 0 };
  // the class list (sample names; a real list stays in this browser) — declared up here so the classroom screen can use it too
  const DEF_ROSTER = ['Amy', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Finn', 'Grace', 'Henry', 'Ivy', 'Jake', 'Kate', 'Leo'];
  let roster = get('pond-roster', null); if (!Array.isArray(roster) || !roster.length) roster = DEF_ROSTER.slice();
  let picked = new Set((get('pondc-picked', []) || []).filter(n => roster.includes(n)));
  const SPIN = 2600;
  let game = null;                                           // { id, where: 'here' | 'screen' }
  let live = false;
  // where the student screen goes: the classroom screen (a second window), student tablets (needs the class server — preview) or both
  let shareTo = 'none';
  const hasScreen = () => shareTo === 'screen' || shareTo === 'both', hasTablets = () => shareTo === 'tablets' || shareTo === 'both';
  const TCODE = String(1000 + Math.floor(Math.random() * 9000));   // class code placeholder until the class server exists
  const AV = ['#B85B1A', '#1F7AB6', '#1E8449', '#8E4BD6', '#CF3B3B', '#906C00', '#0D8098', '#C4387F', '#2D8355', '#C94C28'];   // white initials stay ≥ 4.5:1
  const avColor = n => { let h = 7; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
  const initial = n => esc((String(n).trim().charAt(0) || '?').toUpperCase());
  const clock = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function addLayers() {
    $('#stage').insertAdjacentHTML('beforeend', `<div class="b-media" id="media" hidden></div><div class="b-game" id="game" hidden></div><div class="b-scene" id="scene" hidden></div><div class="b-over"><button type="button" class="b-ctimer" id="ctimer" data-b="scene" data-v="timer" title="Timer"${STUDENT ? ' tabindex="-1"' : ''} hidden></button></div>`);
  }

  const RR = 300, RC = 2 * Math.PI * RR;
  let pickIdx = -2;
  function renderScene() {
    const el = $('#scene'); if (!el) return;
    const show = scene === 'timer' || scene === 'pick' || scene === 'pause';   // every class tool stays inside the 16:10 frame
    el.hidden = !show; el.dataset.scene = show ? scene : '';
    if (!show) { el.innerHTML = ''; tick(); return; }
    if (scene === 'timer') {
      // a simple alarm clock: bells, a white face with 12 dots, the coloured slice = time left, one hand
      const dot = i => { const a = i * Math.PI / 6, big = i % 3 === 0; return `<circle cx="${(300 + 166 * Math.sin(a)).toFixed(1)}" cy="${(330 - 166 * Math.cos(a)).toFixed(1)}" r="${big ? 8 : 5.5}"/>`; };
      el.innerHTML = `<div class="b-fit"><div class="b-tm" id="tFull"${STUDENT ? '' : ' data-b="tgo" title="Tap to start or pause"'}>
        <div class="b-tclock"><svg viewBox="0 0 600 600" aria-hidden="true">
          <g class="rings"><path d="M92 156q-24-44 8-86"/><path d="M60 170q-34-62 10-118"/><path d="M508 156q24-44-8-86"/><path d="M540 170q34-62-10-118"/></g>
          <g class="legs"><path d="M200 503 137 539"/><path d="M400 503 463 539"/></g>
          <g class="bells"><path transform="translate(157 125) rotate(-35)" d="M-62 18A62 62 0 0 1 62 18Z"/><path transform="translate(443 125) rotate(35)" d="M-62 18A62 62 0 0 1 62 18Z"/></g>
          <path class="stem" d="M300 106V82"/><circle class="cap" cx="300" cy="70" r="16"/>
          <circle class="body" cx="300" cy="330" r="226"/><circle class="face" cx="300" cy="330" r="190"/>
          <g class="dots">${Array.from({ length: 12 }, (_, i) => dot(i)).join('')}</g>
          <path class="pie" id="tPie"/><line class="hand-halo" id="tHalo" x1="300" y1="330" x2="300" y2="170"/><line class="hand" id="tHand" x1="300" y1="330" x2="300" y2="170"/>
          <circle class="hub" cx="300" cy="330" r="17"/><circle class="hub-dot" cx="300" cy="330" r="6"/>
        </svg></div>
        <b class="b-tnum" id="tBig"></b>
      </div></div>`;
      dialLoop();
    }
    else if (scene === 'pick') { el.innerHTML = '<div class="b-fit"><div class="b-pick" id="pickView"></div></div>'; pickIdx = -2; drawPick(); }
    else { el.innerHTML = `<div class="b-fit"><div class="b-spause"${STUDENT ? '' : ' data-b="scene" data-v="pause" title="Back to the lesson (B)"'}>${!STUDENT && live ? '<span class="b-spchip"><i class="b-live" aria-hidden="true"></i>Classroom screen · paused</span>' : ''}<span class="b-pausel b-attn" aria-hidden="true"><svg viewBox="0 0 200 140" aria-hidden="true"><g class="eye"><ellipse class="sc" cx="60" cy="70" rx="44" ry="56"/><circle class="pu" cx="64" cy="80" r="23"/><circle class="hl" cx="73" cy="69" r="7.5"/></g><g class="eye"><ellipse class="sc" cx="140" cy="70" rx="44" ry="56"/><circle class="pu" cx="144" cy="80" r="23"/><circle class="hl" cx="153" cy="69" r="7.5"/></g></svg></span><p lang="en">Eyes on me!</p></div></div>`; }
    tick();
  }
  // Pick a student: one card in the middle — "Who's next?", the names roll in the same spot, then the reveal
  function fitName(b, min) { if (!b) return; b.style.fontSize = ''; let fs = parseFloat(getComputedStyle(b).fontSize); while (b.scrollWidth > b.clientWidth + 1 && fs > min) { fs -= 2; b.style.fontSize = fs + 'px'; } }
  function drawPick() {
    const v = $('#pickView'); if (!v) return;
    const t = PK.name ? (Date.now() - PK.t0) / SPIN : 0, spinning = !!(PK.name && PK.seq) && t < 1;
    const k = !PK.name ? -1 : spinning ? Math.min(PK.seq.length - 1, Math.floor((1 - Math.pow(1 - Math.max(0, t), 2.6)) * PK.seq.length)) : 1e6;
    if (k !== pickIdx) {
      pickIdx = k;
      if (k === -1) v.innerHTML = `<div class="b-pkcard is-wait"${STUDENT ? '' : ' data-b="pickrand" title="Tap to pick a student"'}><span class="b-pkav">${ic('dices')}</span><b lang="en">Who’s next?</b><span class="b-pkcap is-quiet" aria-hidden="true"></span></div>`;
      else {
        const n = spinning ? PK.seq[k] : PK.name;
        const burst = spinning ? '' : `<span class="b-pkburst" aria-hidden="true">${Array.from({ length: 13 }, (_, i) => `<i style="--a:${-120 + i * 20}deg;--d:${i % 2 ? 184 : 222}px;--c:${AV[(i * 3) % AV.length]}"></i>`).join('')}</span>`;   // an arc over the head, clear of the name
        v.innerHTML = `<div class="b-pkcard ${spinning ? 'is-spin' : 'is-pick'}"${STUDENT || spinning ? '' : ' data-b="pickrand" title="Tap to pick again"'}><span class="b-pkhalo">${burst}<span class="b-pkav" style="--c:${avColor(n)}">${initial(n)}</span></span><b lang="en">${esc(n)}</b>${spinning ? '<span class="b-pkcap is-quiet">Picking…</span>' : `<span class="b-pkcap">${ic('sparkles')}It’s your turn!</span>`}</div>`;
        fitName(v.querySelector('.b-pkcard b'), 64);
      }
    }
    if (spinning) requestAnimationFrame(drawPick);
  }
  function tick() {
    const left = tLeft();
    if (TM.run && left <= 0) { TM.run = false; TM.left = 0; TM.done = true; if (!STUDENT) { chime(); renderDock(); broadcast(); } }
    const f = $('#tFull');
    if (f) {
      const st = TM.done ? 'done' : TM.run ? 'run' : left < TM.dur ? 'paused' : 'ready';
      $('#tBig').textContent = st === 'done' ? 'Time’s up!' : clock(left);
      f.dataset.st = st;
      f.classList.toggle('is-low', TM.run && left <= 10000); f.classList.toggle('is-done', TM.done);
      drawDial(left);
    }
    const ct = $('#ctimer');
    if (ct) {
      const on = scene !== 'timer' && scene !== 'pause' && tActive();
      ct.hidden = !on;
      if (on) {
        const r = 17, c = 2 * Math.PI * r, p = TM.dur ? left / TM.dur : 0;
        ct.classList.toggle('is-low', TM.run && left <= 10000); ct.classList.toggle('is-done', TM.done);
        ct.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="${r}"/><circle class="fg" cx="22" cy="22" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/></svg><b>${TM.done ? 'Time’s up!' : clock(left)}</b>`;
      }
    }
    const dt = $('#dockTimer'); if (dt) dt.textContent = TM.done ? 'Time’s up!' : clock(left);
  }
  function drawDial(left) {   // the slice shrinks back to 12 o'clock and the hand rides its edge
    const pie = $('#tPie'), hand = $('#tHand'); if (!pie) return;
    const p = TM.dur ? Math.max(0, Math.min(1, left / TM.dur)) : 0, a = p * 2 * Math.PI, R = 152, cx = 300, cy = 330;
    const x = (cx - R * Math.sin(a)).toFixed(2), y = (cy - R * Math.cos(a)).toFixed(2);
    pie.setAttribute('d', p >= 0.9995 ? `M${cx} ${cy - R}a${R} ${R} 0 1 0 0.01 0Z` : p <= 0 ? '' : `M${cx} ${cy}L${x} ${y}A${R} ${R} 0 ${p > 0.5 ? 1 : 0} 1 ${cx} ${cy - R}Z`);
    const hx = (cx - 160 * Math.sin(a)).toFixed(2), hy = (cy - 160 * Math.cos(a)).toFixed(2), halo = $('#tHalo');
    hand.setAttribute('x2', hx); hand.setAttribute('y2', hy); if (halo) { halo.setAttribute('x2', hx); halo.setAttribute('y2', hy); }
  }
  function dialLoop() {   // the slice and the hand move smoothly while the timer runs on screen
    if (!$('#tFull')) return;
    if (TM.run) drawDial(tLeft());
    requestAnimationFrame(dialLoop);
  }
  let actx = null;
  function chime() {   // three soft rising tones when the timer ends (teacher window only: it always has a user gesture)
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + 0.03;
      [[784, 0], [988, 0.2], [1319, 0.4]].forEach(([f, d]) => {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(0.2, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.9);
        o.connect(g).connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + 1);
      });
    } catch (e) { /* no audio */ }
  }

  /* ---------- produced class media (videos) in the student-screen frame ---------- */
  // Files live in assets/media/ (published with the shared preview — the user OK'd it). `all` = every lesson, numbers = one lesson.
  const ABC = { title: 'ABC Song', files: ['abc-song.mp4'] };   // the A–Z song, also on the Alphabet section (user picked: L1 Uppercase Letters · Letter Sequence, L2 Lowercase Letters)
  const MEDIA = {
    all: {
      'x-abc': { title: 'ABC Song', files: ['abc-song.mp4'] },                                   // Class activities › Songs › Alphabet Song (A–Z, same song in every lesson)
    },
    1: {
      's0-0': ABC, 's0-1': ABC,                                                                 // Alphabet › Uppercase Letters, Letter Sequence
      'x-chant': { title: 'Sound & Rhythm Chant', files: ['l1-chant-1.mp4', 'l1-chant-2.mp4', 'l1-chant-3.mp4', 'l1-chant-4.mp4'] },   // Class activities › Chant (stage 1–4 in a row)
      ls1: { title: 'Sound Chant', steps: [['l1-chant-1.mp4'], ['l1-chant-2.mp4'], ['l1-chant-3.mp4'], ['l1-chant-4.mp4'],
        ['l1-chant-1.mp4', 'l1-chant-2.mp4', 'l1-chant-3.mp4', 'l1-chant-4.mp4']] },          // step 5 "All together" plays 1–4 in a row
    },
    2: { 's0-0': ABC },                                                                         // Alphabet › Lowercase Letters
  };
  const hasVideo = id => { const L = FP.lesson(); return !!(L && ((MEDIA[L.n] || {})[id] || MEDIA.all[id])); };   // the menus mark activities with a video
  const MD = { key: '', idx: 0, playing: false, pos: 0, at: 0 };   // the teacher's window owns this; the classroom screen follows it
  const DUR = {};
  let mEl = null, mIdleT = 0, mPolicyMute = false;
  const mPos = () => (MD.playing ? MD.pos + (Date.now() - MD.at) / 1000 : MD.pos);
  const mSrc = f => 'assets/media/' + f;
  const mClock = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function curMedia() {
    const L = FP.lesson(); if (!L) return null;
    const set = { ...MEDIA.all, ...(MEDIA[L.n] || {}) };
    const s = FP.state();
    if (FP.mode() === 'extra') { const m = set[s.extra]; return m && m.files ? { key: `${L.n}|${s.extra}`, group: `${L.n}|${s.extra}`, title: m.title, files: m.files } : null; }
    const m = set[s.act]; if (!m) return null;
    const files = m.steps ? m.steps[s.step] : m.files; if (!files || !files.length) return null;
    return { key: `${L.n}|${s.act}|${s.step}`, group: `${L.n}|${s.act}`, title: m.steps ? `${m.title} · ${files.length > 1 ? 'All together' : 'Step ' + (s.step + 1)}` : m.title, files };
  }
  function renderMedia() {
    const el = $('#media'); if (!el) return;
    const m = curMedia();
    root.classList.toggle('has-media', !!m);
    if (!m) {
      if (el.dataset.key) { dropVideo(); el.hidden = true; el.innerHTML = ''; el.dataset.key = ''; }
      if (!STUDENT && MD.key) Object.assign(MD, { key: '', idx: 0, playing: false, pos: 0, at: Date.now() });
      return;
    }
    if (el.dataset.key !== m.key) {
      if (!STUDENT) {   // moving on inside the same activity keeps playing (Sound Chant step 1 → 2 → …)
        const keep = MD.playing && MD.key && MD.key.split('|').slice(0, 2).join('|') === m.group;
        Object.assign(MD, { key: m.key, idx: 0, playing: !!keep && scene === 'lesson', pos: 0, at: Date.now() });
      }
      dropVideo();
      el.dataset.key = m.key; el.hidden = false;
      el.innerHTML = `<div class="b-fit"><video playsinline preload="auto"></video>
        <div class="b-mui">
          <span class="b-mtag">${ic('music')}<span lang="en">${esc(m.title)}</span></span>
          <button type="button" class="b-mbig" data-b="mtoggle" aria-label="Play">${ic('play')}</button>
          <div class="b-mbar">
            <button type="button" class="b-mpp" data-b="mtoggle" aria-label="Play or pause" title="Play / pause (K)">${ic('play')}</button>
            <span class="b-mtime">0:00 / 0:00</span>
            <div class="b-mtrack" data-b="mseek" title="Jump to">${m.files.map(() => '<span class="b-mseg"><i></i></span>').join('')}</div>
            <button type="button" class="b-mre" data-b="mrestart" aria-label="Play from the start" title="From the start">${ic('rotate-ccw')}</button>
            ${STUDENT ? '' : `<span class="b-mnote" hidden>${ic('volume-2')}Sound on the classroom screen</span>`}
          </div>
          <button type="button" class="b-mtap" hidden>${ic('volume-2')}Tap for sound</button>
        </div>
        <div class="b-mmiss" hidden></div></div>`;
      const v = mEl = el.querySelector('video'); v.dataset.src = ''; mPolicyMute = false;   // listeners below ignore a video that has been replaced
      v.addEventListener('loadedmetadata', () => { DUR[v.dataset.src] = v.duration; if (v === mEl) syncMedia(true); });
      v.addEventListener('timeupdate', () => {
        if (v !== mEl) return;
        paintMedia();
        if (!STUDENT && MD.playing && !mEl.paused && Math.abs(mEl.currentTime - mPos()) > 0.6) { MD.pos = mEl.currentTime; MD.at = Date.now(); broadcast(); }   // re-anchor after buffering
      });
      v.addEventListener('ended', () => {
        if (STUDENT || v !== mEl) return;   // the teacher's window drives the playlist
        const mm = curMedia(); if (!mm) return;
        if (MD.idx < mm.files.length - 1) Object.assign(MD, { idx: MD.idx + 1, pos: 0, at: Date.now(), playing: true });
        else Object.assign(MD, { playing: false, pos: mEl.duration || MD.pos, at: Date.now() });
        syncMedia(true); broadcast();
      });
      v.addEventListener('error', () => {
        if (v !== mEl) return;
        const box = el.querySelector('.b-mmiss'); if (!box) return;
        const web = /^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname);
        box.innerHTML = `<span class="b-mmicon">${ic('monitor-pause')}</span><b>${web ? 'This video couldn’t be loaded' : 'Video file not found'}</b><p>${web ? 'Check the internet connection and try again.' : 'assets/media/' + esc(m.files[MD.idx] || '')}</p>`;
        box.hidden = false; el.classList.add('is-missing');
      });
    }
    syncMedia(true);
  }
  // put the local <video> where MD says; `seek` forces the position (commands, new files), otherwise only big drifts are fixed
  function dropVideo() {   // stop the old video before its layer is replaced (no stray loading or events)
    if (!mEl) return;
    const v = mEl; mEl = null;
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* already gone */ }
  }
  function syncMedia(seek) {
    const el = $('#media'), m = curMedia(); if (!el || !mEl || !m || MD.key !== m.key) return;
    const src = mSrc(m.files[Math.min(MD.idx, m.files.length - 1)]);
    if (mEl.dataset.src !== src) { mEl.dataset.src = src; mEl.src = src; seek = true; }
    const want = mPos(), dur = mEl.duration || DUR[src] || 0;
    if (mEl.readyState >= 1 && (seek || STUDENT) && Math.abs(mEl.currentTime - want) > (seek ? 0.05 : 0.45)) { try { mEl.currentTime = dur ? Math.min(want, dur - 0.05) : want; } catch (e) { /* not seekable yet */ } }
    mEl.muted = STUDENT ? mPolicyMute : (live && hasScreen());   // sharing: the classroom screen plays the sound
    const on = MD.playing && scene === 'lesson';
    if (on && mEl.paused) {
      const p = mEl.play();
      if (p && p.catch) p.catch(err => {   // a new window can't start sound before someone touches it
        if (err && err.name === 'NotAllowedError' && !mEl.muted) { mPolicyMute = true; mEl.muted = true; mEl.play().catch(() => {}); const tap = el.querySelector('.b-mtap'); if (tap) tap.hidden = false; }
      });
    } else if (!on && !mEl.paused) mEl.pause();
    el.classList.toggle('is-playing', on);
    const note = el.querySelector('.b-mnote'); if (note) note.hidden = !(live && hasScreen());
    paintMedia(); mediaIdle();
  }
  function paintMedia() {
    const el = $('#media'); if (!el || !mEl) return;
    const cur = mEl.currentTime || 0, dur = mEl.duration || DUR[mEl.dataset.src] || 0;
    el.querySelectorAll('.b-mseg i').forEach((s, i) => { s.style.width = (i < MD.idx ? 100 : i > MD.idx ? 0 : dur ? Math.min(100, (cur / dur) * 100) : 0).toFixed(2) + '%'; });
    const t = el.querySelector('.b-mtime'); if (t) t.textContent = `${mClock(cur)} / ${mClock(dur)}`;
    const on = MD.playing && scene === 'lesson', st = on ? 'pause' : 'play';
    const pp = el.querySelector('.b-mpp'); if (pp && pp.dataset.st !== st) { pp.dataset.st = st; pp.innerHTML = ic(st); }
  }
  function mediaIdle() {   // the control bar fades while a video plays and nobody touches the board
    const el = $('#media'); if (!el) return;
    el.classList.remove('is-idle'); clearTimeout(mIdleT);
    if (MD.playing) mIdleT = setTimeout(() => el.classList.add('is-idle'), 2600);
  }
  function seekAt(e, track) {
    const seg = e.target.closest('.b-mseg'); if (!seg) return null;
    const r = seg.getBoundingClientRect();
    return { i: [...track.children].indexOf(seg), f: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) };
  }
  function mediaCmd(a, v) {
    const m = curMedia(); if (!m) return;
    const here = () => (mEl && mEl.readyState >= 1 ? mEl.currentTime : mPos());   // the teacher's own video is the clock
    let seek = false;
    if (a === 'mtoggle') {
      if (MD.playing) Object.assign(MD, { pos: here(), playing: false, at: Date.now() });
      else {
        const dur = DUR[mSrc(m.files[MD.idx])] || 0;
        if (MD.idx >= m.files.length - 1 && dur && here() >= dur - 0.3) { Object.assign(MD, { idx: 0, pos: 0 }); seek = true; }   // finished: start over
        else MD.pos = here();
        Object.assign(MD, { playing: true, at: Date.now() });
        if (scene !== 'lesson') setScene('lesson');
      }
    }
    if (a === 'mrestart') { Object.assign(MD, { idx: 0, pos: 0, at: Date.now(), playing: true }); seek = true; }
    if (a === 'mseek' && v) { const i = Math.max(0, Math.min(m.files.length - 1, v.i | 0)); Object.assign(MD, { idx: i, pos: (DUR[mSrc(m.files[i])] || 0) * v.f, at: Date.now() }); seek = true; }
    syncMedia(seek); broadcast();
  }
  function pauseMedia() { if (MD.playing) { Object.assign(MD, { pos: mEl && mEl.readyState >= 1 ? mEl.currentTime : mPos(), playing: false, at: Date.now() }); syncMedia(); } }
  // commands from the classroom screen (touch boards): its buttons ask the teacher's window, which stays in charge
  function runCmd(a, v) {
    if (a === 'gplay') { const it = curGame(); if (it) { game = { id: it.id, where: v === 'here' ? 'here' : 'screen' }; renderGame(); renderDock(); broadcast(); } }
    if (a === 'mtoggle' || a === 'mrestart' || a === 'mseek') mediaCmd(a, v);
    if (a === 'extra' && /^g-/.test(v || '')) { FP.openExtra(v); if (scene !== 'lesson') setScene('lesson'); }   // a game card tapped on the classroom screen
  }

  /* ---------- games in the student-screen frame ---------- */
  let guarded = false;
  function guardHistory() {   // a game's own Exit may call history.back(); keep the dashboard from leaving
    if (guarded) return; guarded = true; try { history.pushState({ pond: 'game' }, ''); } catch (e) { /* file:// quirks */ }
  }
  addEventListener('popstate', () => { if ($('#game iframe')) { try { history.pushState({ pond: 'game' }, ''); } catch (e) { /* ignore */ } } else guarded = false; });
  function renderGame() {
    const el = $('#game'); if (!el) return;
    const it = curGame();
    if (!it) { game = game && STUDENT ? game : null; el.hidden = true; el.innerHTML = ''; el.dataset.key = ''; return; }
    if (it.picker) {
      game = STUDENT ? game : null;
      const key = ['picker', FP.lesson().n, it.picker.map(x => x.id).join(',')].join('|');
      el.hidden = false; if (el.dataset.key === key) return; el.dataset.key = key;
      el.innerHTML = `<div class="b-fit"><div class="b-gpick"><h3 lang="en">Let’s play!</h3><div class="b-gpcards">${it.picker.map(x => `<button type="button" class="b-gpcard" data-b="extra" data-v="${x.id}" title="Open ${esc(x.label)}"><span class="b-gpimg"><img src="assets/games/${x.game.poster}.webp" alt="" onerror="this.remove()"></span><b lang="en">${esc(x.label)}</b><small lang="en">${esc(x.sub)}</small></button>`).join('')}</div></div></div>`;
      return;
    }
    if (game && game.id !== it.id) game = null;
    const runHere = STUDENT ? !!(game && game.where === 'screen') : !!(game && game.where === 'here');
    const key = [it.id, FP.lesson().n, runHere, game ? game.where : '', live].join('|');
    el.hidden = false; if (el.dataset.key === key) return; el.dataset.key = key;
    if (runHere) {
      el.innerHTML = `<div class="b-fit"><iframe src="${esc(gameUrl(it))}" title="${esc(it.label)}" allow="autoplay; microphone; fullscreen; screen-wake-lock; gamepad"></iframe></div>`;
      if (!STUDENT) guardHistory(); return;
    }
    const g = it.game;
    let acts;
    if (STUDENT) acts = game && game.where === 'here' ? `<p class="b-gstat">Playing on the teacher’s screen</p><div class="b-gacts"><button type="button" class="b-gbtn" data-b="gplay" data-v="screen">${ic('play')}Play on this screen</button></div>` : `<div class="b-gacts"><button type="button" class="b-gbtn b-gbtn--go b-gbtn--lg" data-b="gplay" data-v="screen">${ic('play')}Play</button></div>`;
    else if (game && game.where === 'screen') acts = `<p class="b-gstat"><i class="b-live" aria-hidden="true"></i>Playing on the classroom screen</p><div class="b-gacts"><button type="button" class="b-gbtn" data-b="gplay" data-v="here">${ic('monitor')}Play here instead</button><button type="button" class="b-gbtn" data-b="gstop">${ic('x')}Stop</button></div>`;
    else if (live) acts = `<div class="b-gacts"><button type="button" class="b-gbtn b-gbtn--go b-gbtn--lg" data-b="gplay" data-v="screen">${ic('cast')}Play on classroom screen</button><button type="button" class="b-gbtn" data-b="gplay" data-v="here">${ic('play')}Play here</button></div>`;
    else acts = `<div class="b-gacts"><button type="button" class="b-gbtn b-gbtn--go b-gbtn--lg" data-b="gplay" data-v="here">${ic('play')}Play</button></div>`;
    el.innerHTML = `<div class="b-fit"><div class="b-gcover"><img src="assets/games/${g.poster}.webp" alt="" onerror="this.remove()"><div class="b-gshade"></div><div class="b-ginfo"><span class="b-gtag">${ic(g.icon || 'gamepad')}${esc(g.tag || 'Phonics game')} · Lesson ${FP.lesson().n}</span><h3 lang="en">${esc(it.label)}</h3><p lang="en">${esc(it.sub)} · ${esc(g.blurb)}</p>${acts}</div></div></div>`;
  }

  /* ================= student view ================= */
  function studentMain() {
    document.title = 'Phonics POND — Student screen';
    FP.on(e => { if (e.type === 'lesson') refreshGames(); if (e.type === 'lesson' || e.type === 'nav') addGamesStep(); if (e.type === 'nav') renderGame(); });
    FP.mount($('#stage'), { storageKey: 'pondc-student', fresh: true, keys: false, keepAwake: true, design: DESIGN, viewTransitions: false });
    addLayers(); refreshGames(); addGamesStep();
    const wait = $('#wait');
    const card = (title, sub) => { wait.innerHTML = `<div class="b-waitin"><span class="b-logo b-logo--lg"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#pond-mark"/></svg></span><b>${title}</b><p>${sub}</p></div>`; wait.hidden = false; };
    if (!CH) { card('This browser can’t show the student screen', 'Open it in Chrome, Edge or Safari.'); return; }
    card('Waiting for your teacher…', 'On the teacher’s dashboard: Share → Classroom screen.');
    const apply = m => {
      applyTheme(m.theme);
      if (FP.lesson().n !== m.lesson) FP.setLesson(m.lesson);
      if (FP.state().sec !== m.sec) FP.setSection(m.sec);
      const s = FP.state();
      if (m.extra) { if (s.extra !== m.extra) FP.openExtra(m.extra); }
      else if (s.extra || s.act !== m.act || s.step !== m.step) FP.go(m.act, m.step);
      FP.ink.import(m.ink);
      const { roster: rs, picked: pd, ...pk } = m.pick;
      const redraw = scene !== m.scene || PK.t0 !== pk.t0 || PK.name !== pk.name || JSON.stringify([rs, pd]) !== JSON.stringify([roster, [...picked]]);
      if (Array.isArray(rs)) roster = rs; if (Array.isArray(pd)) picked = new Set(pd);
      scene = m.scene; Object.assign(TM, m.timer); Object.assign(PK, pk); game = m.game;
      if (m.media) Object.assign(MD, m.media);
      if (redraw) renderScene();
      renderGame(); renderMedia(); tick();
    };
    CH.onmessage = ({ data: m }) => {
      if (!m) return;
      if (m.type === 'state') { wait.hidden = true; apply(m); }
      if (m.type === 'stop') { card('Sharing has ended', 'You can close this window.'); setTimeout(() => window.close(), 1500); }
    };
    document.addEventListener('click', e => {   // touch boards: the activity's own buttons work here too
      const t = e.target.closest('[data-b]'); if (!t) return;
      const a = t.dataset.b;
      if (a === 'gplay' || a === 'mtoggle' || a === 'mrestart' || (a === 'extra' && /^g-/.test(t.dataset.v || ''))) CH.postMessage({ type: 'cmd', a, v: t.dataset.v });
      if (a === 'mseek') { const v = seekAt(e, t); if (v) CH.postMessage({ type: 'cmd', a, v }); }
    });
    addEventListener('pointerdown', () => {   // the first touch on this window allows sound
      if (mPolicyMute && mEl) { mPolicyMute = false; mEl.muted = false; const tap = $('#media .b-mtap'); if (tap) tap.hidden = true; }
    }, true);
    addEventListener('pointermove', mediaIdle);
    CH.postMessage({ type: 'hello' });
    setInterval(() => CH.postMessage({ type: 'ping' }), 2000);
    setInterval(tick, 250);
    setInterval(() => { if (MD.playing) syncMedia(); }, 1000);   // keep the classroom screen in step with the teacher
    addEventListener('pagehide', () => CH.postMessage({ type: 'bye' }));
    const fsb = document.createElement('button'); fsb.type = 'button'; fsb.className = 'b-stufs';
    fsb.innerHTML = `${ic('maximize')}<span>Full screen</span>`; fsb.addEventListener('click', () => FP.fullscreen()); document.body.appendChild(fsb);
    let hideT = 0; const showFs = () => { fsb.classList.add('is-show'); clearTimeout(hideT); hideT = setTimeout(() => fsb.classList.remove('is-show'), 2500); };
    addEventListener('pointermove', showFs); showFs();
    document.addEventListener('fullscreenchange', () => { fsb.hidden = !!document.fullscreenElement; });
    addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') FP.fullscreen(); });
  }
  if (STUDENT) { studentMain(); return; }

  /* ================= teacher view ================= */
  let notesOpen = false, flowOpen = false, notesTab = 'plan', mapPick = null, palOpen = false;
  let menuOpen = false, guideOpen = false, dialOpen = false;   // classroom screen: the menu, the teacher guide and the one button's Menu · Guide · Pen stay hidden until asked for
  let fanGeo = null;   // classroom screen: where the one button's arc opens
  let pos = get('pondc-pos', {});   // where the teacher dragged the one button (classroom screen): centre as a fraction of the board
  pos = pos && typeof pos === 'object' && Array.isArray(pos.fab) ? { fab: pos.fab } : {};

  function setTheme(t) { applyTheme(t); put('fprk-bc-theme', root.dataset.theme); broadcast(); refreshDisplay(); }
  function cycleTheme() { const i = THEMES.findIndex(x => x[0] === root.dataset.theme); setTheme(THEMES[(i + 1) % THEMES.length][0]); }

  /* ---------- layout: panel arrangement chosen by the teacher ---------- */
  const LAYOUT = { screen: [['full', 'Full screen'], ['desk', 'With controls']], controls: [['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']], notes: [['sheet', 'Pop-up'], ['panel', 'Side panel']] };
  function setLayout(k, v) {
    if (!LAYOUT[k] || !LAYOUT[k].some(x => x[0] === v)) return;
    root.dataset[k] = v; put('pondc-' + k, v);
    if (k === 'notes') { notesOpen = false; root.dataset.npanel = 'shown'; put('pondc-npanel', 'shown'); }
    if (k === 'controls') root.dataset.menuside = v === 'left' ? 'right' : 'left';   // the menu takes the other side from a side guide
    if (k === 'screen') { if (v !== 'full') { setMenu(false); setGuide(false); } fitTop(true); }
    renderDock(); renderFlow(); renderNotes(); renderFab(); refreshDisplay(); requestAnimationFrame(placeFab);
    if (k === 'controls' || k === 'screen') requestAnimationFrame(() => { const p = $('#displayPop'); if (p.matches(':popover-open')) { placePop(p, $('#displayBtn')); clampPop(p); } });
  }

  /* ---------- what students see (top bar) ---------- */
  // what students see: the lesson, a class activity or game, or a class tool
  const SCENES = [['lesson', 'presentation', 'Lesson', 'Show the lesson'], ['timer', 'timer', 'Timer', 'Timer (T)'], ['pick', 'dices', 'Pick', 'Pick a student (P)'], ['pause', 'monitor-pause', 'Pause', 'Eyes on me (B)']];
  function renderScenes() {
    const el = $('#scenes'); if (!el || !FP.lesson()) return;
    el.innerHTML = `<span class="b-scnl" title="${live ? 'Sharing to the classroom screen' : 'What students see'}">${live ? '<i class="b-live" aria-hidden="true"></i>' : ''}<span>Students see</span></span>${SCENES.map(([v, i, l, t]) => `<button type="button" data-b="scene" data-v="${v}" aria-pressed="${scene === v}" title="${t}">${ic(i)}<span>${l}</span></button>`).join('')}`;
    fitTop();
  }
  // the Class activities select shows what is picked, like the other selects (no extra path in the top bar)
  const ACTS_DEF = () => `${ic('grid')}<span class="b-actl">Class activities</span>${ic('chevron-down', 'b-dd')}`;
  const actsVal = it => {
    const g = FP.extras().find(x => x.items.some(y => y.id === it.id));
    return `${ic(it.icon || (g && g.icon) || 'grid')}<b class="b-actv" lang="en">${esc(it.label)}</b>${ic('chevron-down', 'b-dd')}`;   // the group icon + the name, 2 lines max
  };
  function renderActs() {
    const b = $('#extrasBtn'); if (!b || !FP.lesson()) return;
    const it = FP.mode() === 'extra' ? FP.extraInfo() : null;
    b.classList.toggle('has-val', !!it); b.setAttribute('aria-pressed', !!it);
    b.innerHTML = it ? actsVal(it) : ACTS_DEF();
  }
  function setScene(v) {
    if (v === 'pause' && scene === 'pause') v = resumeTo;
    else if (v === scene) return;
    if (v === 'pause') resumeTo = scene;
    if (v !== 'lesson') pauseMedia();
    if (v === 'pick' && scene !== 'pick' && Date.now() - PK.t0 > 1500) { PK.name = ''; PK.seq = null; }   // a fresh "Who's next?" board
    scene = v;
    renderScenes(); renderScene(); renderDock(); broadcast();
  }
  const coreGuide = FP.guide;   // Meaning First › Games: what to say and do
  FP.guide = (...args) => {
    const g = coreGuide(...args), a = args[0] ? FP.flow().find(x => x.id === args[0]) : FP.cur();
    if (g && g.steps && a && a.id === 'si1' && a.steps.length > MF_GAMES && g.steps.length === MF_GAMES) {
      const names = lessonGames().map(x => x.label).join(' · ');
      g.steps = [...g.steps, { title: 'Games', do: `Tap a game on the board, then Play (${names}). Come back to the lesson when the round is over.`, say: 'Let’s play a game with our words!', kids: 'Play and say the words.' }];
      if (!args[0]) g.cur = g.steps[Math.min(FP.state().step, g.steps.length - 1)];
    }
    return g;
  };
  const coreNext = FP.next, corePrev = FP.prev;   // a clicker press on a class tool brings the lesson back first
  FP.next = () => (scene !== 'lesson' ? setScene(scene === 'pause' ? 'pause' : 'lesson') : coreNext());
  FP.prev = () => (scene !== 'lesson' ? setScene(scene === 'pause' ? 'pause' : 'lesson') : corePrev());

  /* ---------- top ---------- */
  function renderTop() {
    const L = FP.lesson();
    $('#lessonBtn').innerHTML = `<span class="b-lt${L.key.length > 3 ? ' is-long' : ''}" lang="en">${esc(L.key)}</span><span class="b-ltx"><b>Lesson ${L.n} <i lang="en"${L.snd.length > 9 ? ' class="is-long"' : ''}>${esc(L.snd)}</i></b><small>Unit ${L.unit} · ${esc(L.day)}</small></span>${ic('chevron-down')}`;
    $('#lessonBtn').title = `Lesson map (M) — Lesson ${L.n} ${L.snd} · Unit ${L.unit} · ${FP.unitTheme(L.unit)}`;
    fitTop();
  }
  // The activity title must never be cut. When the bar runs short (long lesson names, narrow windows) secondary
  // labels go first: "Students see" → the "Class activities" text → the lesson's sound line (still on the tile and
  // in the tooltip) → the Share text → the screen-button texts (icons + tooltips stay). Decided once per lesson +
  // window width from every section/title pair, so nothing jumps on Next.
  const FIT = ['is-tight', 'is-tighter', 'is-tightest', 'is-tight4', 'is-tight5', 'is-tight6', 'is-tight7'];
  let fitKey = '', fitLevel = 0, fitT = 0;
  const actBtn = (title, tip) => `<button type="button" class="b-crumbact" data-b="actmenu" title="${tip}" aria-haspopup="true"><b lang="en">${esc(title)}</b>${ic('chevron-down')}</button>`;
  const crumbHTML = (sec, title) => `<button type="button" data-b="sections" title="Sections">${esc(sec)}${ic('chevron-down')}</button>${actBtn(title, 'Activities in this section')}`;
  function fitTop(force) {
    const top = $('.b-top'), crumb = $('#crumb'), L = FP.lesson(); if (!top || !crumb || !L) return;
    if (CLASSROOM()) { FIT.forEach(c => top.classList.remove(c)); fitKey = ''; return; }   // the menu drawer has room for every label
    const key = `${L.n}|${innerWidth}|${live ? 1 : 0}|${shareTo}|${FP.mode()}`;
    if (key !== fitKey || force) {
      fitKey = key; fitLevel = 0;
      const keep = crumb.innerHTML, cut = () => { const b = crumb.querySelector('b'), last = crumb.lastElementChild;   // title cut, or the activity select pushed out of the path
        return b.scrollHeight > b.clientHeight + 4 || (last && last.getBoundingClientRect().right > crumb.getBoundingClientRect().right + 1); };
      const btn = $('#extrasBtn'), keepBtn = btn.innerHTML, keepVal = btn.classList.contains('has-val');
      btn.classList.toggle('has-val', FP.mode() === 'extra');   // measure the box as it will look (renderActs may not have run yet)
      if (FP.mode() === 'extra') { let w = 0, best = ''; for (const g of FP.extras()) for (const it of g.items) { btn.innerHTML = actsVal(it); if (btn.offsetWidth > w) { w = btn.offsetWidth; best = btn.innerHTML; } } btn.innerHTML = best; }
      else btn.innerHTML = ACTS_DEF();
      const intro = ['Lesson Words', 'Sound Chant', L.a1, 'Meaning First', 'Sound Awareness', 'Sound–Letter Match', 'Sound Review', 'Sound Blending', L.a2, 'G-Learning'];
      for (const s of FP.sections()) for (const t of (s.built ? intro : s.subs.length ? s.subs : [s.name])) {
        crumb.innerHTML = crumbHTML(s.name, t || '');
        while (fitLevel < FIT.length) { FIT.forEach((c, i) => top.classList.toggle(c, i < fitLevel)); if (!cut()) break; fitLevel++; }
      }
      crumb.innerHTML = keep; btn.innerHTML = keepBtn; btn.classList.toggle('has-val', keepVal);
    }
    FIT.forEach((c, i) => top.classList.toggle(c, i < fitLevel));
  }
  function renderCrumb() {
    const sec = FP.section();
    $('#crumb').innerHTML = crumbHTML(sec.name, FP.cur().title);
    const am = $('#actMenu'); if (am && am.matches(':popover-open')) am.hidePopover();   // picked: the menu closes
    fitTop();
  }

  /* ---------- floating board tools ---------- */
  function renderFab() {
    const k = FP.ink.state(), cur = k.on ? k.tool : 'select';
    const tIcon = { pen: 'pen', hl: 'highlighter', er: 'eraser' }[cur] || 'pen';
    const b = $('#fabBtn'), dial = CLASSROOM(), shut = palOpen || (dial && (dialOpen || menuOpen));   // classroom: the one button closes what is open
    b.classList.toggle('is-ink', k.on && !shut); b.classList.toggle('is-open', shut);
    b.setAttribute('aria-expanded', dial ? dialOpen || palOpen || menuOpen : palOpen); b.setAttribute('aria-label', dial ? 'Menu, guide and board tools' : 'Board tools');
    b.title = dial ? (palOpen ? 'Hide board tools' : menuOpen ? 'Close the menu (Esc)' : dialOpen ? 'Close' : k.on ? 'Phonics POND — Menu · Guide · Pen · drawing is on (D) · drag to move' : 'Phonics POND — Menu · Guide · Pen · drag to move')
      : palOpen ? 'Hide board tools' : k.on ? 'Board tools — drawing is on (D)' : 'Board tools (D = pen)';
    const face = dial ? '<svg class="b-fabmark" viewBox="0 0 64 64" aria-hidden="true"><use href="#pond-mark"/></svg>' : ic(k.on ? tIcon : 'pen');   // classroom: our symbol on the one button (user: "메뉴 표시 대신에 우리 심볼아이콘")
    b.innerHTML = shut ? ic('x') : `${face}${k.on && cur !== 'er' ? `<i class="b-fabdot" style="--c:${k.color}"></i>` : ''}${k.count && !k.on && !dial ? `<i class="b-fabn">${k.count}</i>` : ''}`;
    const items = $('#dialItems');   // Menu · Guide · Pen, toward the middle of the board
    if (items) {
      items.hidden = !(dial && dialOpen);
      const it = (a, icon, label, on, tip, n) => `<button type="button" class="b-dialitem${on ? ' is-on' : ''}" data-b="${a}" aria-pressed="${on}" title="${tip}">${ic(icon)}<span>${label}</span>${n ? `<i class="b-fabn">${n}</i>` : ''}</button>`;
      if (!items.hidden) {
        items.innerHTML = it('dmenu', 'menu', 'Menu', menuOpen, 'Menu — lessons, activities, share, display')
          + it('dpen', 'pen', 'Pen', k.on, 'Pen — draw on the board, tools at hand (D)', k.count && !k.on ? k.count : 0) + it('dguide', 'notebook-pen', 'Guide', guideOpen, 'Teacher guide — what to say and do (G)');   // Menu · Pen · Guide (user: "판서버튼이랑 가이드 버튼 위치 순서 바꿔줘")
        layoutFan();
      }
    }
    const pal = $('#fabPal'); pal.hidden = !palOpen; if (!palOpen) return;
    const t = (id, n, l) => `<button type="button" class="b-tool${cur === id ? ' is-on' : ''}" data-b="tool" data-v="${id}" title="${l}" aria-label="${l}" aria-pressed="${cur === id}">${ic(n)}</button>`;
    pal.innerHTML = `<div class="b-palgrp">${t('select', 'pointer', 'Select — use the content')}${t('pen', 'pen', 'Pen (D)')}${t('hl', 'highlighter', 'Highlighter')}${t('er', 'eraser', 'Eraser')}</div><i class="b-palsep"></i>
      <div class="b-palgrp b-palgrp--sw">${FP.inkColors.map(([c, n]) => `<button type="button" class="b-sw${k.color === c ? ' is-on' : ''}" data-b="color" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="${k.color === c}"></button>`).join('')}</div><i class="b-palsep"></i>
      <div class="b-palgrp b-palgrp--wd">${[[3, 'Thin'], [6, 'Medium'], [12, 'Thick']].map(([w, n]) => `<button type="button" class="b-wd${k.width === w ? ' is-on' : ''}" data-b="width" data-v="${w}" title="${n} line" aria-label="${n} line"><i style="--w:${w}px"></i></button>`).join('')}</div><i class="b-palsep"></i>
      <div class="b-palgrp"><button type="button" class="b-tool" data-b="undo" title="Undo" aria-label="Undo" ${k.count ? '' : 'disabled'}>${ic('undo')}</button><button type="button" class="b-tool" data-b="clear" title="Clear drawing" aria-label="Clear drawing" ${k.count ? '' : 'disabled'}>${ic('trash')}</button></div>`;
  }
  function setPal(open) { palOpen = open; renderFab(); if (open) requestAnimationFrame(placeFab); }   // (the strip is placed once it has its size)

  /* ---------- classroom screen: the teacher's screen IS the classroom screen (user: "강사용 대시보드가 곧 수업시 교실안에 스크린과 동일하게")
     The board fills the screen; one button (our symbol, bottom centre) fans out Menu · Guide · Pen: the menu (former top bar) is a bar along the bottom, the teacher guide (dock, notes) slides in on demand —
     no menus along the top ("위에 메뉴들이 있으면 불편"). Display › Screen › With controls keeps the desk layout. ---------- */
  const CLASSROOM = () => root.dataset.screen === 'full' && !STUDENT;
  const MENU_POPS = ['extrasPop', 'sharePop', 'displayPop', 'helpPop', 'secMenu', 'actMenu'];
  function setMenu(on) {
    menuOpen = !!on && CLASSROOM(); root.dataset.menu = menuOpen ? 'open' : 'closed';
    if (!menuOpen) MENU_POPS.forEach(id => { const p = document.getElementById(id); if (p && p.matches(':popover-open')) p.hidePopover(); });
    else { if (dialOpen) setDial(false); if (palOpen) setPal(false); }   // one thing open at a time
    renderFab(); requestAnimationFrame(placeFab);   // the button steps above the menu bar
  }
  function setGuide(on) { guideOpen = !!on && CLASSROOM(); root.dataset.guide = guideOpen ? 'open' : 'closed'; renderFab(); requestAnimationFrame(placeFab); }
  function setDial(on) {   // the one button's menu: dim + the layer (today's flow, Meaning First) + Menu · Guide · Pen on a half disc
    dialOpen = !!on && CLASSROOM(); root.dataset.dial = dialOpen ? 'open' : 'closed';
    renderLayer(); placeFab(); renderFab();
  }
  function renderLayer() {   // user: "버튼 밑에는 오늘 학습 플로우와 meaning first 활동들이 밑에서 레이어 팝업형태로 올라오게"
    const el = $('#layer'), dim = $('#dim'); if (!el || !dim) return;
    el.hidden = dim.hidden = !dialOpen; if (!dialOpen) { el.innerHTML = ''; return; }
    const flow = FP.flow(), cur = FP.cur(), extra = FP.mode() === 'extra', L = FP.lesson(), xi = FP.extraInfo();
    const card = a => { const on = !extra && a.id === cur.id, done = !extra && a.index < cur.index;
      return `<button type="button" class="b-card${on ? ' is-on' : ''}${done ? ' is-done' : ''}" data-b="go" data-v="${a.id}"><small>${done ? ic('check') : ''}${esc(a.kicker)}</small><b lang="en">${esc(a.title)}</b><span class="b-cmeta"><em class="b-type b-type--${a.type}">${a.type === 'sb' ? 'SB' : a.type === 'home' ? 'Home' : 'Prep'}</em><span class="b-lymin">${planMin(a)} min</span></span></button>`; };
    const tile = it => `<button type="button" class="b-xi${it.soon ? ' is-soon' : ''}${xi && xi.id === it.id ? ' is-on' : ''}" data-b="extra" data-v="${it.id}"><b lang="en">${esc(it.label)}</b><small lang="en">${esc(it.sub)}</small>${it.soon ? '<em>Soon</em>' : it.game ? `<span class="b-xgame">${ic('gamepad')}Game</span>` : hasVideo(it.id) ? `<span class="b-xvid">${ic('play')}Video</span>` : ''}</button>`;
    el.innerHTML = `<div class="b-lyrow"><div class="b-lyhead"><h3>Today <span lang="en">Lesson ${L.n} ${esc(L.snd || '')}</span></h3><div class="b-lysecs" role="group" aria-label="Sections">${FP.sections().map(x => `<button type="button" class="b-lysec${x.on ? ' is-on' : ''}" data-b="sec" data-v="${x.i}" aria-pressed="${x.on}" lang="en">${esc(x.name)}</button>`).join('')}</div></div>
        <div class="b-lycards">${flow.map(card).join('')}</div></div>
      <div class="b-lyrow"><div class="b-lyhead"><h3>${ic('layers')}Meaning First</h3></div><div class="b-lycards">${mfGroup.items.map(tile).join('')}</div></div>`;
    const on = el.querySelector('.b-card.is-on'); if (on) { const box = on.parentElement; box.scrollLeft = on.offsetLeft - box.offsetLeft - (box.clientWidth - on.offsetWidth) / 2; }
    const sec = el.querySelector('.b-lysec.is-on'); if (sec) sec.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function placePop(pop, btn) {   // classroom: menus rise from the bottom edge over the menu bar, in line with their button (desk layout: under the button)
    if (!CLASSROOM()) return false;
    const r = btn.getBoundingClientRect();
    pop.style.top = 'auto'; pop.style.right = 'auto'; pop.style.bottom = '12px'; pop.style.left = Math.max(12, r.left) + 'px';
    return true;
  }
  function clampPop(pop) {   // classroom: keep it on screen (it scrolls inside when taller than the screen)
    if (!CLASSROOM()) return;
    pop.style.top = 'auto'; pop.style.bottom = '12px';
    pop.style.left = Math.max(12, Math.min(parseFloat(pop.style.left) || 12, innerWidth - pop.offsetWidth - 12)) + 'px';
  }
  function placeFab() {   // the pen lives inside the 16:10 frame (user: "판서 버튼은 가운데 화면에 포함"): bottom-right, on the frame's own 24 px margin; the video bar stops short of it
    const wrap = $('#stagewrap'), st = $('#stage'), fab = $('#fab'); if (!wrap || !st || !fab) return;
    const sw = st.offsetWidth, sh = st.offsetHeight, gx = (wrap.clientWidth - sw) / 2, gy = (wrap.clientHeight - sh) / 2, k = Math.min(sw / 1280, sh / 800);
    const m = Math.max(12, Math.round(24 * k));
    fab.dataset.mode = 'inside';
    const lift = Math.max(0, Math.ceil(90 * k + 8 - (m + 76)));   // on big frames the open palette clears the video bar's top (bar: 22 + 68 px, scaled)
    fab.style.setProperty('--pal-lift', lift + 'px');
    fab.style.setProperty('--pal-max', Math.max(160, Math.floor(sh - m - 76 - lift - 98 * k)) + 'px');   // and stays under the corner timer's row
    const app = $('#app');   // side panels (notes, side controls) line up with the frame's top and bottom
    app.style.setProperty('--frame-top', Math.max(0, gy) + 'px'); app.style.setProperty('--frame-h', sh + 'px');
    if (!CLASSROOM()) {   // desk: the pen in the frame's bottom-right corner (the classroom screen places it below without a reset in between: a reset would be measured and animated)
      fab.style.left = 'auto'; fab.style.top = 'auto'; fab.style.right = gx + m + 'px'; fab.style.bottom = gy + m + 'px'; fab.style.transform = ''; fab.classList.remove('is-moved', 'is-down', 'is-start', 'is-mid', 'is-side');
      ['--sheet-l', '--sheet-r', '--sheet-b'].forEach(p => wrap.style.removeProperty(p)); return;
    }
    const W = wrap.offsetLeft, Wr = W + wrap.offsetWidth, Wb = wrap.offsetTop + wrap.offsetHeight;
    const fx = Math.round(W + gx), fy = Math.round(wrap.offsetTop + gy), fr = Math.round(innerWidth - fx - sw), fb = Math.round(innerHeight - fy - sh);
    [['--fx', fx], ['--fy', fy], ['--fw', sw], ['--fh', sh], ['--fr', fr], ['--fb', fb]].forEach(([p, v]) => root.style.setProperty(p, v + 'px'));   // the floating buttons and drawers follow the frame
    // the one button: where the teacher dragged it, else the middle of the board's bottom edge (Naver's green dot). It never hides:
    // above an open bottom guide, beside a side guide or the notes panel.
    const S = Math.round(Math.min(96, Math.max(72, 68 * k))), SD = Math.round(S * .78);   // the one button grows with the screen (user: "화면 비율에 비해 조금 작은거 같아. 조금 키워줘"); ‹ › a size smaller
    root.style.setProperty('--fab-s', S + 'px'); root.style.setProperty('--fab-sd', SD + 'px');
    const H = S / 2, M = 8, RW = H + 12 + SD, side = root.dataset.controls, P = pos.fab, cw = wrap.clientWidth, ch = wrap.clientHeight;   // RW: half the row ‹ ● › (12 px gaps)
    const box = el => el && el.offsetWidth && getComputedStyle(el).display !== 'none' ? { l: el.offsetLeft - W, t: el.offsetTop - wrap.offsetTop, r: el.offsetLeft - W + el.offsetWidth, b: el.offsetTop - wrap.offsetTop + el.offsetHeight } : null;   // resting place, wrap coordinates
    let cx = P ? gx + P[0] * sw : gx + sw / 2, cy = P ? gy + P[1] * sh : gy + sh - m - H;
    cx = Math.min(Math.max(cx, gx + M + RW), gx + sw - M - RW); cy = Math.min(Math.max(cy, gy + M + H), gy + sh - M - H);
    let sl = 16, sr = 16, sb = gy + 16;
    if (guideOpen) {
      const d = box($('#dock')), q = box($('#npanel'));
      if (d && side === 'bottom') { cy = Math.min(cy, d.t - 12 - H); sb = ch - d.t + 12; }   // above the guide
      else if (d) {
        if (side === 'right') sr = cw - d.l + 12; else sl = d.r + 12;
        if (cx + RW > d.l - 12 && cx - RW < d.r + 12) cx = side === 'right' ? d.l - 12 - RW : d.r + 12 + RW;   // beside a side guide
      }
      if (q) { sl = Math.max(sl, q.r + 12); if (cx + RW > q.l - 12 && cx - RW < q.r + 12 && cy + H > q.t && cy - H < q.b) cx = q.r + 12 + RW; }   // beside the notes panel
    }
    if (menuOpen && !dialOpen) { const tb = $('.b-top'), top = tb ? tb.offsetTop - wrap.offsetTop : ch; if (cy + H > top - 12) cy = top - 12 - H; }   // above the menu bar
    if (dialOpen) { const ly = $('#layer'); cx = gx + sw / 2; cy = Math.max(gy + 190, ly && !ly.hidden ? ch - ly.offsetHeight : gy + sh - m - H); }   // open: the button rides on the layer's top edge, the menu above it
    const up = cy > gy + sh / 2, onRight = cx > gx + sw / 2, mid = dialOpen || (Math.abs(cx - (gx + sw / 2)) < sw / 6 && cw - sr - sl >= 560);   // in the middle (and room for the tools strip)
    const beside = mid && guideOpen && side === 'bottom', pal = $('#fabPal');   // a guide along the bottom leaves no room above the button: the strip goes beside it
    fab.classList.toggle('is-side', beside);
    if (mid && !beside && pal && !pal.hidden) { const pw = pal.offsetWidth, l0 = cx - pw / 2, l = Math.max(sl, Math.min(l0, cw - sr - pw)); fab.style.setProperty('--pal-dx', Math.round(l - l0) + 'px'); }   // clear of side panels
    else fab.style.setProperty('--pal-dx', '0px');
    const hangR = !onRight || cx - RW - sl < 120;   // the board tools open toward the middle — or away from a panel the button sits against
    let palX = null;   // a column of tools hanging from a button near the middle would sit on the middle of the board (the video's play button): beside it instead
    if (!mid && up && pal && !pal.hidden) {
      const pw = pal.offsetWidth, zone = 68 * k + 14, bc = gx + sw / 2, left0 = hangR ? cx - RW : cx + RW - pw;
      if (left0 < bc + zone && left0 + pw > bc - zone) { if (cw - sr - (bc + zone) >= pw) palX = bc + zone; else if (bc - zone - sl >= pw) palX = bc - zone - pw; }
    }
    fab.classList.toggle('is-aside', palX != null); fab.style.setProperty('--pal-x', palX != null ? Math.round(palX - (cx - RW)) + 'px' : '0px');
    fab.classList.toggle('is-moved', !!P); fab.classList.toggle('is-down', !up); fab.classList.toggle('is-start', hangR); fab.classList.toggle('is-mid', mid);   // in the middle, centred over the button
    if (mid) { fab.style.left = cx + 'px'; fab.style.right = 'auto'; fab.style.transform = 'translateX(-50%)'; }
    else { fab.style.transform = ''; fab.style.left = hangR ? (cx - RW) + 'px' : 'auto'; fab.style.right = hangR ? 'auto' : (cw - cx - RW) + 'px'; }
    fab.style.top = up ? 'auto' : (cy - H) + 'px'; fab.style.bottom = up ? (ch - cy - H) + 'px' : 'auto';
    fab.style.setProperty('--pal-lift', '0px');   // no video bar on the classroom screen
    fab.style.setProperty('--pal-max', Math.max(160, Math.floor(up ? cy - H - 12 - gy - M : gy + sh - M - cy - H - 12)) + 'px');
    if (up) { if (mid) sb = Math.max(sb, ch - (cy - H) + 12); else if (onRight) sr = Math.max(sr, cw - (cx - RW) + 12); else sl = Math.max(sl, cx + RW + 12); }   // pop-up sheets end before the buttons
    wrap.style.setProperty('--sheet-l', sl + 'px'); wrap.style.setProperty('--sheet-r', sr + 'px'); wrap.style.setProperty('--sheet-b', sb + 'px');
    fanGeo = { cx, cy, th: -Math.PI / 2, x0: gx + M + 40, x1: gx + sw - M - 40, y0: gy + M + 34, y1: gy + sh - M - 34 }; layoutFan();
  }

  /* ---------- the one button moves (user: "한개 버튼만 이동도 가능하게") ----------
     Press and move more than 6 px (10 px by finger) = drag; a press that stays put is still a click. The centre is saved as a
     fraction of the board (pondc-pos), so it holds on any window size; Display › Button › Reset position puts it back. */
  function layoutFan() {   // Menu · Guide · Pen on the half disc above the button (Naver's green dot), kept on the board
    const items = $('#dialItems'); if (!items || items.hidden || !fanGeo) return;
    const { cx, cy, th, x0, x1, y0, y1 } = fanGeo, R = 112, STEP = 60 * Math.PI / 180;
    [...items.children].forEach((b, i) => {
      const a = th + (i - 1) * STEP, x = Math.min(Math.max(cx + R * Math.cos(a), x0), x1), y = Math.min(Math.max(cy + R * Math.sin(a), y0), y1);
      b.style.setProperty('--dx', (x - cx).toFixed(1) + 'px'); b.style.setProperty('--dy', (y - cy).toFixed(1) + 'px'); b.style.setProperty('--i', i);
    });
  }

  /* ---------- ‹ › beside the one button: back / next at any time, finished or not (user: "가운데 버튼 옆으로 좌우 이동할수
     있는 버튼 추가해줘. 학습을 다 안하고 다음학습이나 이전학습으로 넘어갈수도 있어서") — the guide's Back / Next (→ ←): step by
     step, on into the next activity at the end of one; a whole activity at once = the flow cards under the button. ---------- */
  function renderSides() {
    if (STUDENT) return;
    const pv = $('#fabPrev'), nx = $('#fabNext'); if (!pv || !nx) return;
    if (!pv.firstChild) { pv.innerHTML = ic('chevron-left'); nx.innerHTML = ic('chevron-left'); }
    const x = FP.mode() === 'extra', p = FP.peek(-1), n = FP.peek(1);
    pv.disabled = !x && !p; nx.disabled = !x && !n;
    pv.title = x ? 'Back to the lesson' : p ? `Back — ${p.label} (←)` : 'Back';
    nx.title = x ? 'Back to the lesson' : n ? `Next — ${n.label} (→)` : 'Next';
  }
  let drag = null, eatClickUntil = 0;
  function initMove() {
    const start = (e, el, key) => {
      if (!CLASSROOM() || e.button > 0 || !e.target.closest('button')) return;
      const r = el.getBoundingClientRect();
      drag = { key, el, id: e.pointerId, x0: e.clientX, y0: e.clientY, cx: r.left + r.width / 2, cy: r.top + r.height / 2, th: e.pointerType === 'touch' ? 10 : 6, moved: false };
    };
    $('#fabBtn').addEventListener('pointerdown', e => start(e, $('#fabBtn'), 'fab'));
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) { if (Math.hypot(dx, dy) < drag.th) return; drag.moved = true; root.classList.add('is-moving'); if (palOpen) setPal(false); if (dialOpen) setDial(false); }
      const b = $('#stage').getBoundingClientRect();
      pos[drag.key] = [(drag.cx + dx - b.left) / b.width, (drag.cy + dy - b.top) / b.height];
      placeFab();
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {   // keep what was saved on the board (the lift above an open guide is not saved)
        const b = $('#stage').getBoundingClientRect(), P = pos[drag.key], hw = (drag.el.offsetWidth / 2 + 8) / b.width, hh = (drag.el.offsetHeight / 2 + 8) / b.height;
        pos[drag.key] = [Math.min(Math.max(P[0], hw), 1 - hw), Math.min(Math.max(P[1], hh), 1 - hh)];
        put('pondc-pos', pos); eatClickUntil = performance.now() + 400; root.classList.remove('is-moving'); placeFab(); refreshDisplay();
      }
      drag = null;
    };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    addEventListener('click', e => { if (performance.now() < eatClickUntil) { eatClickUntil = 0; e.stopPropagation(); e.preventDefault(); } }, true);   // the drop is not a click
  }

  /* ---------- dock ---------- */
  const R = 25, C = 2 * Math.PI * R;
  /* planned minutes per activity (Lesson 1 TG: phonemic awareness 5, sound-spelling 10 = Learn and Say 5 + Say It 5, sound sort 5);
     the progress bar under the frame is sized by them and fills with the time spent (user: "진행시간을 미리 넣고 진행율") */
  const PLAN_MIN = { lmf: 3, ls1: 5, lssb: 5, si1: 5, si2: 5, si3: 3, bl1: 3, bl3: 5, sisb: 5, sigl: 2 };
  const planMin = a => PLAN_MIN[a.id] || (a.type === 'home' ? 2 : 5);
  const mmss = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function lessonPct() {   // planned minutes done (finished activities + time in the current one, up to its plan) / planned minutes in this section
    const flow = FP.flow(), cur = FP.cur(), extra = FP.mode() === 'extra';
    const total = flow.reduce((t, a) => t + planMin(a), 0) || 1;
    const done = flow.reduce((t, a) => t + (a.index < cur.index ? planMin(a) : 0), 0) + (extra ? 0 : Math.min(1, FP.timer.actElapsed() / (planMin(cur) * 60000)) * planMin(cur));
    return Math.min(100, Math.round(done / total * 100));
  }
  const back = l => `<button type="button" class="b-prev b-back" data-b="scene" data-v="lesson" title="Back to the lesson" aria-label="Back to the lesson">${ic('presentation')}<span>${l || 'Lesson'}</span></button>`;
  function renderDock() {
    const d = $('#dock'); if (!d) return;
    d.dataset.mode = scene;
    if (scene === 'timer') d.innerHTML = dockTimer();
    else if (scene === 'pick') d.innerHTML = dockPick();
    else if (scene === 'pause') d.innerHTML = dockPause();
    else d.innerHTML = dockLesson();
    tickRing(); tick();
  }
  function dockLesson() {
    const extra = FP.mode() === 'extra', flow = FP.flow(), cur = FP.cur(), st = FP.state();
    const segs = flow.map(a => { const on = !extra && a.index === cur.index, m = planMin(a), ms = on ? FP.timer.actElapsed() : 0, fill = a.index < cur.index ? 1 : on ? Math.min(1, ms / (m * 60000)) : 0;
      return `<button type="button" class="b-segm${on ? ' is-on' : ''}${on && ms > m * 60000 ? ' is-over' : ''}" style="flex:${m}" data-b="go" data-v="${a.id}" title="${esc(a.title)} · ${m} min" aria-label="${esc(a.title)}, ${m} minutes"><span class="b-segl"><b lang="en">${esc(a.title)}</b><em>${on ? `<span class="b-segt">${mmss(ms)}</span><span class="b-segp"> / ${m} min</span>` : `${m} min`}</em></span><i style="width:${(fill * 100).toFixed(1)}%"></i></button>`; }).join('')
      + `<span class="b-segsum" title="Planned time for this section · progress"><small>${flow.reduce((t, a) => t + planMin(a), 0)} min</small><b id="segPct">${lessonPct()}%</b></span>`;
    let left, mid, right;
    if (extra) {
      const it = FP.extraInfo(), gm = it.game ? it : null;
      left = `<div class="b-now"><div class="b-ring b-ring--icon">${ic(it.icon)}</div><div class="b-nowtx"><small>${esc(it.group)}${gm ? ` · Lesson ${FP.lesson().n}` : ''}</small><b>${esc(it.label)}</b><span lang="en">${esc(it.sub)}</span></div></div>`;
      const gmsg = !gm ? '' : game && game.where === 'here' ? `${esc(it.label)} is running on the board. Go back to the lesson when the round is over.` : game && game.where === 'screen' ? `${esc(it.label)} is running on the classroom screen.` : `Tap Play on the board to start ${esc(it.label)}.`;
      mid = `<div class="b-say b-say--quiet"><p>${curMedia() ? `Tap ▶ on the board or press K to play${live && hasScreen() ? ' — the sound plays on the classroom screen' : ''}.` : gm ? gmsg : it.soon ? 'This activity is in production — the content area is ready for it.' : 'Run the activity, then go back to where you left the lesson.'}</p></div>`;
      right = `<div class="b-pn"><button type="button" class="b-next" data-b="close"><span><b>Back to lesson</b><small lang="en">${esc(cur.title)}</small></span>${ic('arrow-left')}</button></div>`;
    } else {
      const g = FP.guide(), c = g.cur || {}, nx = FP.peek(1), pv = FP.peek(-1), grp = FP.groups().find(x => x.id === cur.group) || {};
      left = `<div class="b-now"><div class="b-ring" id="ring" title="Time in this activity"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${R}" class="b-ring-bg"/><circle cx="30" cy="30" r="${R}" class="b-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><span id="ringTx">0:00</span></div>
        <div class="b-nowtx"><small lang="en">${esc(grp.label || '')}${grp.label ? ' · ' : ''}${esc(cur.kicker)}</small><b lang="en">${esc(cur.title)}</b><span lang="en">${cur.steps.length > 1 ? `Step ${st.step + 1} of ${cur.steps.length} · ${esc(cur.steps[st.step])}` : (cur.type === 'sb' ? 'SB ' + esc(cur.page || '') : cur.type === 'home' ? 'Home practice preview' : 'POLY prep · before the SB')}</span></div></div>`;
      mid = c.say ? `<div class="b-say"><span class="b-lab">Say</span><p lang="en">“${FP.hlSay(c.say)}”</p><span class="b-do"><b>Do</b> ${esc(c.do)}</span></div>` : `<div class="b-say"><span class="b-lab">Do</span><p class="b-p-do">${esc(c.do || '')}</p></div>`;
      const nl = nx ? ({ step: 'Next', activity: 'Next activity', section: 'Next section' }[nx.kind]) : 'Finished';
      right = `<div class="b-pn"><button type="button" class="b-prev" data-b="prev" ${pv ? '' : 'disabled'} aria-label="Back" title="Back (←)">${ic('chevron-left')}</button><button type="button" class="b-next" data-b="next" ${nx ? '' : 'disabled'} title="Next (→ / Space)"><span><b>${nl}</b><small lang="en">${nx ? esc(nx.label) : 'End of lesson'}</small></span>${ic('arrow-right')}</button></div>`;
    }
    const notesOn = root.dataset.notes === 'panel' ? root.dataset.npanel !== 'hidden' : notesOpen;
    return `<div class="b-segs" role="group" aria-label="Lesson progress">${segs}</div>
      <div class="b-dockrow">${left}${mid}<div class="b-dright"><div class="b-toggles"><button type="button" class="b-tg${notesOn ? ' is-on' : ''}" data-b="notes" aria-pressed="${notesOn}" title="Teacher notes (N)">${ic('notebook-pen')}<span>Notes</span></button><button type="button" class="b-tg${flowOpen ? ' is-on' : ''}" data-b="flow" aria-pressed="${flowOpen}" title="Run of show (L)">${ic('flow')}<span>Flow</span></button></div>${right}</div></div>`;
  }
  const PRESETS = [[30000, '30 s'], [60000, '1 min'], [120000, '2 min'], [180000, '3 min'], [300000, '5 min']];
  function dockTimer() {
    const left = tLeft(), state = TM.done ? 'Time’s up' : TM.run ? 'Running' : left < TM.dur ? 'Paused' : 'Ready';
    const go = TM.run ? ['Pause', 'The time stops', 'pause'] : TM.done ? ['Start again', clock(TM.dur), 'play'] : left < TM.dur ? ['Resume', clock(left) + ' left', 'play'] : ['Start', clock(TM.dur), 'play'];
    return `<div class="b-dockrow b-dockrow--tool"><div class="b-now"><div class="b-ring b-ring--icon">${ic('timer')}</div><div class="b-nowtx"><small>On the student screen</small><b>Timer</b><span><b class="b-tnum" id="dockTimer">${TM.done ? 'Time’s up!' : clock(left)}</b> · ${state}</span></div></div>
      <div class="b-tooltray"><div class="b-chips" role="group" aria-label="Timer length">${PRESETS.map(([ms, l]) => `<button type="button" class="b-chip${TM.dur === ms ? ' is-on' : ''}" data-b="tset" data-v="${ms}" title="Start ${l}">${l}</button>`).join('')}</div>
        <div class="b-chips"><button type="button" class="b-chip b-chip--icon" data-b="tadd" data-v="-30000" title="30 seconds less" aria-label="30 seconds less">${ic('minus')}</button><span class="b-chipl">30 s</span><button type="button" class="b-chip b-chip--icon" data-b="tadd" data-v="30000" title="30 seconds more" aria-label="30 seconds more">${ic('plus')}</button><button type="button" class="b-chip b-chip--quiet" data-b="treset">${ic('rotate-ccw')}Reset</button></div></div>
      <div class="b-dright"><div class="b-pn">${back()}<button type="button" class="b-next" data-b="tgo"><span><b>${go[0]}</b><small>${go[1]}</small></span>${ic(go[2])}</button></div></div></div>`;
  }
  function dockPick() {
    const notYet = roster.filter(n => !picked.has(n)).length;
    return `<div class="b-dockrow b-dockrow--tool"><div class="b-now"><div class="b-ring b-ring--icon">${ic('dices')}</div><div class="b-nowtx"><small>On the student screen</small><b>Pick a student</b><span>${notYet} of ${roster.length} still to go</span></div></div>
      <div class="b-tooltray b-tooltray--roster"><div class="b-roster" role="group" aria-label="Class list">${roster.map(n => `<button type="button" class="b-rchip${picked.has(n) ? ' is-done' : ''}${PK.name === n ? ' is-on' : ''}" data-b="pickone" data-v="${esc(n)}" title="Show ${esc(n)}"><i style="--c:${avColor(n)}">${initial(n)}</i><span lang="en">${esc(n)}</span></button>`).join('')}<button type="button" class="b-rchip b-rchip--edit" data-b="rosteredit">${ic('pencil')}<span>Edit list</span></button></div></div>
      <div class="b-dright"><div class="b-pn">${back()}<button type="button" class="b-next" data-b="pickrand"><span><b>Pick at random</b><small>Everyone gets a turn</small></span>${ic('shuffle')}</button></div></div></div>`;
  }
  function dockPause() {
    const to = { lesson: 'the lesson', timer: 'the timer', pick: 'the student pick' }[resumeTo] || 'the lesson';
    return `<div class="b-dockrow b-dockrow--tool"><div class="b-now"><div class="b-ring b-ring--icon">${ic('monitor-pause')}</div><div class="b-nowtx"><small>On the student screen</small><b>Eyes on me</b><span>${live ? 'The classroom screen is paused' : 'The student screen is paused'}</span></div></div>
      <div class="b-say b-say--quiet"><p>${live ? 'Only the classroom screen is paused — your dashboard keeps working.' : 'Students see “Eyes on me!” in the frame — your notes and controls keep working.'}</p></div>
      <div class="b-dright"><div class="b-pn"><button type="button" class="b-next" data-b="scene" data-v="pause"><span><b>Resume</b><small>Back to ${to}</small></span>${ic('play')}</button></div></div></div>`;
  }
  function tickRing() {
    const seg = document.querySelector('.b-segs .b-segm.is-on');
    if (seg) {   // the current activity fills with the time spent, against its planned minutes
      const pl = planMin(FP.cur()) * 60000, t = FP.timer.actElapsed();
      seg.querySelector('i').style.width = (Math.min(1, t / pl) * 100).toFixed(1) + '%';
      seg.classList.toggle('is-over', t > pl);
      const tx = seg.querySelector('.b-segt'); if (tx) tx.textContent = mmss(t);
    }
    const pct = $('#segPct'); if (pct) pct.textContent = lessonPct() + '%';
    const ring = $('#ring'); if (!ring) return;
    const a = FP.cur(), ms = FP.timer.actElapsed(), plan = planMin(a) * 60000;   // same plan as the progress bar
    const fg = ring.querySelector('.b-ring-fg');
    const p = plan ? Math.min(1, ms / plan) : (ms % 60000) / 60000;
    fg.setAttribute('stroke-dashoffset', (C * (1 - p)).toFixed(1));
    ring.classList.toggle('is-over', plan && ms > plan);
    ring.classList.toggle('is-free', !plan);
    const s = Math.floor(ms / 1000); $('#ringTx').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ---------- timer actions ---------- */
  function timerChanged() { renderDock(); tick(); broadcast(); }
  function timerAct(a, v) {
    if (a === 'tset') { TM.dur = TM.left = v; TM.done = false; TM.run = true; TM.endAt = Date.now() + v; }
    if (a === 'tgo') {
      if (TM.run) { TM.left = tLeft(); TM.run = false; }
      else { if (TM.done || TM.left <= 0) TM.left = TM.dur; TM.done = false; TM.run = true; TM.endAt = Date.now() + TM.left; }
    }
    if (a === 'tadd') { const l = Math.max(0, tLeft() + v); TM.left = l; TM.dur = Math.max(TM.dur, l); TM.done = false; if (TM.run) TM.endAt = Date.now() + l; }
    if (a === 'treset') { TM.left = TM.dur; TM.run = false; TM.done = false; }
    timerChanged();
  }

  /* ---------- pick a student ---------- */
  function showStudent(n, spin) {
    if (!n) return;
    PK.name = n; PK.t0 = Date.now(); PK.seq = null;
    if (spin && roster.length > 1) {
      const rest = roster.filter(x => x !== n && !picked.has(x)), pool = rest.length >= 2 ? rest : roster.filter(x => x !== n), seq = [];
      for (let i = 0; i < 16; i++) { let x; do x = pool[Math.floor(Math.random() * pool.length)]; while (pool.length > 1 && x === seq[seq.length - 1]); seq.push(x); }
      seq.push(n); PK.seq = seq;
    }
    picked.add(n); put('pondc-picked', [...picked]);
    if (scene !== 'pick') setScene('pick'); else { renderScene(); renderDock(); broadcast(); }
  }
  function pickRandom() { let pool = roster.filter(n => !picked.has(n)); if (!pool.length) { picked.clear(); pool = roster.slice(); } showStudent(pool[Math.floor(Math.random() * pool.length)], true); }
  function renderRoster() {
    $('#rosterPop').innerHTML = `<div class="b-pophead"><h3>Class list</h3><p>One name per line. The list stays on this device.</p></div><textarea id="rosterTx" rows="12" spellcheck="false" aria-label="Student names">${esc(roster.join('\n'))}</textarea>
      <div class="b-ractions"><button type="button" class="b-sbtn" data-b="rosterclear" title="Everyone can be picked again">${ic('rotate-ccw')}Clear picks</button><span></span><button type="button" class="b-sbtn" data-b="rosterclose">Cancel</button><button type="button" class="b-sbtn b-sbtn--go" data-b="rostersave">${ic('check')}Save</button></div>`;
  }
  function saveRoster() {
    const names = [...new Set($('#rosterTx').value.split('\n').map(s => s.trim()).filter(Boolean))].slice(0, 60);
    roster = names.length ? names : DEF_ROSTER.slice(); put('pond-roster', roster);
    picked = new Set([...picked].filter(n => roster.includes(n))); put('pondc-picked', [...picked]);
    if (PK.name && !roster.includes(PK.name)) { PK.name = ''; PK.seq = null; }
    if (scene === 'pick') renderScene();
    $('#rosterPop').hidePopover(); renderDock(); broadcast();
  }

  /* ---------- run of show ---------- */
  function renderFlow() {
    const el = $('#flowStrip'); el.hidden = !flowOpen; if (!flowOpen) return;
    const flow = FP.flow(), cur = FP.cur(), st = FP.state(), extra = FP.mode() === 'extra';
    el.innerHTML = `<div class="b-sheethead"><h3>Run of show <span lang="en">${esc(FP.section().name)}</span></h3><button type="button" class="b-x" data-b="flow" aria-label="Close run of show">${ic('x')}</button></div>
      <div class="b-cards">${FP.groups().map(g => { const items = flow.filter(a => a.group === g.id); return items.length ? `<div class="b-cgroup"><p lang="en">${esc(g.label)}</p><div>${items.map(a => { const on = !extra && a.id === cur.id, done = !extra && a.index < cur.index;
        return `<button type="button" class="b-card${on ? ' is-on' : ''}${done ? ' is-done' : ''}" data-b="go" data-v="${a.id}"><small>${esc(a.kicker)}</small><b lang="en">${esc(a.title)}</b><span class="b-cmeta"><em class="b-type b-type--${a.type}">${a.type === 'sb' ? 'SB' : a.type === 'home' ? 'Home' : 'Prep'}</em>${a.steps.length > 1 ? `<span class="b-dots">${a.steps.map((_, i) => `<i class="${on && i === st.step ? 'is-on' : (done || (on && i < st.step)) ? 'is-done' : ''}"></i>`).join('')}</span>` : ''}</span></button>`; }).join('')}</div></div>` : ''; }).join('')}</div>`;
    const on = el.querySelector('.b-card.is-on'), box = el.querySelector('.b-cards');
    if (on && box) box.scrollLeft = on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2;
  }

  /* ---------- teacher notes: pop-up sheet or docked side panel ---------- */
  function notesParts() {
    const g = FP.guide(), st = FP.state();
    let main = '';
    if (g.mode === 'extra') main = `<p class="b-goal">${esc(g.goal)}</p>`;
    else {
      main = `<p class="b-goal"><b>Goal</b> ${esc(g.goal)}</p><ol class="b-steps">${g.steps.map((s, i) => { const on = i === st.step;
        return `<li class="${on ? 'is-on' : ''}${i < st.step ? ' is-done' : ''}"><button type="button" data-b="step" data-v="${i}"><span>${i < st.step ? ic('check') : i + 1}</span><b lang="en">${esc(s.title)}</b></button>${on ? `<div class="b-stepbody">${s.say ? `<p class="b-sayl" lang="en">“${FP.hlSay(s.say)}”</p>` : ''}<p><b>Do</b> ${esc(s.do)}</p>${s.kids ? `<p><b>Kids</b> ${esc(s.kids)}</p>` : ''}${s.tg ? `<p class="b-tgq"><b>TG</b> <span lang="en">${esc(s.tg)}</span></p>` : ''}</div>` : ''}</li>`; }).join('')}</ol>`;
      if (g.words && g.words.length) main += `<div class="b-words"><b>Words</b>${g.words.map(w => `<button type="button" data-b="say" data-v="${esc(w)}" lang="en">${esc(w)}</button>`).join('')}</div>`;
      if (g.answer) main += `<p class="b-answer"><b>Answer key</b> Yes: ${g.answer.yes.map(esc).join(' · ')} &nbsp;·&nbsp; No: ${g.answer.no.map(esc).join(' · ')}</p>`;
      if (g.pending) main += `<p class="b-muted">${ic('sparkle')} The step-by-step script arrives with this section’s content.</p>`;
    }
    const p = FP.plan(), t = g.tip;
    const body = notesTab === 'plan'
      ? `<p class="b-lab2">Today · ${esc(p.day)}</p><ol class="b-day">${p.flow.map(f => `<li${/Sound-Spelling/.test(f) ? ' class="is-on"' : ''}>${esc(f)}</li>`).join('')}</ol>
         <p class="b-lab2">Materials</p><p>${esc(p.materials)}</p>
         ${[p.a1, p.a2].map((x, i) => `<div class="b-pcard"><b lang="en">${i + 1} · ${esc(x.title)}</b><p>${esc(x.goal)}</p>${x.tg ? `<small>TG objective · <span lang="en">${esc(x.tg)}</span></small>` : ''}</div>`).join('')}`
      : `<p class="b-tip">${esc(t.text)}</p>${t.pairs.length ? `<div class="b-pairs">${t.pairs.map(q => `<span><button type="button" data-b="say" data-v="${esc(q[0])}" lang="en">${esc(q[0])}</button><i>vs</i><button type="button" data-b="say" data-v="${esc(q[1])}" lang="en">${esc(q[1])}</button></span>`).join('')}</div>` : ''}
         ${t.tg ? `<p class="b-tgq"><b>TG · English Learners</b> <span lang="en">${esc(t.tg)}</span></p>` : ''}
         <p class="b-lab2">Corrective feedback</p><p><b lang="en">My turn.</b> → <b lang="en">What’s the sound?</b> → <b lang="en">Let’s start over.</b></p>`;
    const side = `<div class="b-tabs" role="tablist"><button type="button" role="tab" aria-selected="${notesTab === 'plan'}" data-b="ntab" data-v="plan">Plan</button><button type="button" role="tab" aria-selected="${notesTab === 'support'}" data-b="ntab" data-v="support">Korean learners</button></div>${body}`;
    return { g, main, side };
  }
  function renderNotes() {
    const sheet = $('#notes'), np = $('#npanel');
    if (root.dataset.notes === 'panel') {
      sheet.hidden = true;
      const { g, main, side } = notesParts();
      np.innerHTML = `<div class="b-nphead"><h3>Teacher notes</h3><span lang="en">${esc(g.title)}</span><button type="button" class="b-x" data-b="notes" aria-label="Hide notes" title="Hide notes (N)">${ic('x')}</button></div><div class="b-npbody">${main}<div class="b-npside">${side}</div></div>`;
      const on = np.querySelector('.b-steps li.is-on'), body = np.querySelector('.b-npbody');
      if (on && body) body.scrollTop = Math.max(0, on.offsetTop - 70);
      return;
    }
    np.innerHTML = '';
    sheet.hidden = !notesOpen; if (!notesOpen) return;
    const { g, main, side } = notesParts();
    sheet.innerHTML = `<div class="b-sheethead"><h3>Teacher notes <span lang="en">${esc(g.title)}</span></h3><button type="button" class="b-x" data-b="notes" aria-label="Close notes">${ic('x')}</button></div>
      <div class="b-notesgrid"><div class="b-ncol">${main}</div><div class="b-ncol b-ncol--side">${side}</div></div>`;
  }
  function toggleSheet(which) {
    if (which === 'notes' && root.dataset.notes === 'panel') {
      root.dataset.npanel = root.dataset.npanel === 'hidden' ? 'shown' : 'hidden'; put('pondc-npanel', root.dataset.npanel);
      renderNotes(); renderDock(); requestAnimationFrame(placeFab); return;
    }
    if (which === 'notes') { notesOpen = !notesOpen; if (notesOpen) flowOpen = false; }
    else { flowOpen = !flowOpen; if (flowOpen) notesOpen = false; }
    renderFlow(); renderNotes(); renderDock();
  }

  /* ---------- lesson map ---------- */
  function renderMap() {
    const D = FP.data, L = FP.lesson(), pick = mapPick || L.n, P = D.lessons[pick], lab = (P.lab || '').split(' · ');
    const secs = P.secs || [], curSec = FP.state().sec;
    $('#map').innerHTML = `<div class="b-maphead"><div><h2>Lesson map</h2><p>From Phonics to Reading · Level K</p></div><button type="button" class="b-x b-x--lg" data-b="mapclose" aria-label="Close lesson map">${ic('x')}</button></div>
      <div class="b-mapbody"><div class="b-units">${D.units.map(u => `<section class="b-ucol"><h3><b>Unit ${u.n}</b><span>${esc(u.theme)}</span></h3>${u.lessons.map(n => { const d = D.lessons[n], lb = (d.lab || '').split(' · ');
        return `<button type="button" class="b-ltile${n === pick ? ' is-pick' : ''}${n === L.n ? ' is-cur' : ''}" data-b="mappick" data-v="${n}"><span class="b-ltl${(lb[0] || d.ltr).length > 3 ? ' is-long' : ''}" lang="en">${esc(lb[0] || d.ltr)}</span><span class="b-ltinfo"><b>Lesson ${n}</b><small lang="en">${esc(d.snd)}${lb[1] ? ' · ' + esc(lb[1]) : ''}</small></span>${n === L.n ? '<em>Now</em>' : ''}</button>`; }).join('')}</section>`).join('')}</div>
      <aside class="b-preview"><span class="b-pvl" lang="en">${esc(P.key)}</span><h3>Lesson ${pick} <span lang="en">${esc(P.snd)}</span></h3><p>Unit ${P.unit || 1} · ${esc(FP.unitTheme(P.unit || 1))} · ${esc(P.day)} · SB p${P.sb}${lab[1] ? ` · <span lang="en">${esc(lab[1])}</span>` : ''}</p>
        <ol class="b-secs">${secs.map((s, i) => `<li><button type="button" data-b="mapsec" data-v="${i}" class="${pick === L.n && i === curSec ? 'is-cur' : ''}"><span>${i + 1}</span><b lang="en">${esc(s[0])}</b><small>SB ${esc(s[1])}</small>${s[0] === 'Introduction' ? '<em class="is-ready">Ready</em>' : '<em>Soon</em>'}</button></li>`).join('')}</ol>
        <button type="button" class="b-open" data-b="mapopen">${pick === L.n ? 'Back to the lesson' : `Open Lesson ${pick}`}${ic('arrow-right')}</button></aside></div>`;
  }
  function openMap(on) { const m = $('#map'); if (on) { mapPick = FP.lesson().n; renderMap(); m.hidden = false; m.querySelector('.b-x').focus(); } else m.hidden = true; }

  /* ---------- class activities + games ---------- */
  function renderExtras() {
    const cur = FP.extraInfo();
    $('#extrasPop').innerHTML = `<div class="b-pophead"><h3>Class activities</h3><p>Outside the lesson flow — the lesson waits where you left it.</p></div><div class="b-xgrid">${FP.extras().map(g => `<section><h4>${ic(g.icon)}${esc(g.group)}</h4>${g.items.map(it => `<button type="button" class="b-xi${it.soon ? ' is-soon' : ''}${cur && cur.id === it.id ? ' is-on' : ''}" data-b="extra" data-v="${it.id}"><b>${esc(it.label)}</b><small>${esc(it.sub)}</small>${it.soon ? '<em>Soon</em>' : it.game ? `<span class="b-xgame">${ic('gamepad')}Game</span>` : hasVideo(it.id) ? `<span class="b-xvid">${ic('play')}Video</span>` : ''}</button>`).join('')}</section>`).join('')}</div>`;
  }

  /* ---------- sections menu (breadcrumb) ---------- */
  function sectionsMenu(btn) {
    let m = $('#secMenu'); if (!m) { m = document.createElement('div'); m.id = 'secMenu'; m.className = 'b-pop b-pop--secs'; m.popover = 'auto'; document.body.appendChild(m); }
    m.innerHTML = `<p class="b-lab2">Lesson ${FP.lesson().n} sections</p>${FP.sections().map(s => `<button type="button" class="b-secitem${s.on ? ' is-on' : ''}" data-b="sec" data-v="${s.i}"><span>${s.i + 1}</span><b lang="en">${esc(s.name)}</b><small>SB ${esc(s.pages)}</small>${s.built ? '<em class="is-ready">Ready</em>' : '<em>Soon</em>'}</button>`).join('')}`;
    const r = btn.getBoundingClientRect(); if (!placePop(m, btn)) { m.style.left = r.left + 'px'; m.style.top = (r.bottom + 8) + 'px'; }
    m.showPopover(); clampPop(m);
  }

  /* ---------- activity menu (breadcrumb): the section's activities, or the class activities of the open group ---------- */
  function actMenu(btn) {
    let m = $('#actMenu'); if (!m) { m = document.createElement('div'); m.id = 'actMenu'; m.className = 'b-pop b-pop--secs b-pop--acts'; m.popover = 'auto'; document.body.appendChild(m); }
    {
      const flow = FP.flow(), cur = FP.cur(), groups = FP.groups().map(g => [g, flow.filter(a => a.group === g.id)]).filter(([, a]) => a.length);
      const row = a => { const on = a.id === cur.id, done = a.index < cur.index;
        return `<button type="button" class="b-secitem${on ? ' is-on' : ''}${done ? ' is-done' : ''}" data-b="${on && FP.mode() === 'extra' ? 'close' : 'go'}" data-v="${a.id}"><span>${done ? ic('check') : a.index + 1}</span><b lang="en">${esc(a.title)}</b><small>${hasVideo(a.id) ? ic('play') + 'Video · ' : ''}${flowGame(a) || (a.id === 'si1' && a.steps.length > MF_GAMES) ? ic('gamepad') + 'Game · ' : ''}${a.pending ? 'SB ' + esc(a.page) : a.steps.length + (a.steps.length > 1 ? ' steps' : ' step')}</small><em>${a.type === 'sb' ? 'SB' : a.type === 'home' ? 'Home' : 'Prep'}</em></button>`; };
      m.innerHTML = `<p class="b-lab2" lang="en">${esc(FP.section().name)} · ${flow.length} ${flow.length === 1 ? 'activity' : 'activities'}</p>${groups.map(([g, items]) => `${groups.length > 1 ? `<p class="b-lab3" lang="en">${esc(g.label)}</p>` : ''}${items.map(row).join('')}`).join('')}`;
    }
    const r = btn.getBoundingClientRect(); if (!placePop(m, btn)) { m.style.left = Math.max(8, Math.min(r.left, innerWidth - 428)) + 'px'; m.style.top = (r.bottom + 8) + 'px'; }
    m.showPopover(); clampPop(m);
  }

  /* ---------- display: layout + colour ---------- */
  function renderDisplay() {
    const opt = (k, v, label) => `<button type="button" class="b-opt" data-b="layout" data-k="${k}" data-v="${v}" aria-pressed="${root.dataset[k] === v}"><span class="b-thumb b-thumb--${k}-${v}" aria-hidden="true"><i class="t"></i><i class="s"></i><i class="d"></i><i class="n"></i></span><b>${label}</b></button>`;
    const col = ([v, label, frame, board, act]) => `<button type="button" class="b-opt" data-b="theme" data-v="${v}" aria-pressed="${root.dataset.theme === v}"><span class="b-thumb b-thumb--color" style="--f:${frame};--st:${board};--a:${act}" aria-hidden="true"><i class="s"></i><i class="a"></i></span><b>${label}</b></button>`;
    $('#displayPop').innerHTML = `<div class="b-pophead"><h3>Display</h3><p>Arrange the dashboard your way — saved on this device.${CLASSROOM() ? '' : ' The student screen stays 16:10 (1280 × 800).'}</p></div>
      <section class="b-dsec"><h4>Screen</h4><div class="b-opts">${LAYOUT.screen.map(([v, l]) => opt('screen', v, l)).join('')}</div></section>
      <section class="b-dsec"><h4>${CLASSROOM() ? 'Teacher guide' : 'Controls'}</h4><div class="b-opts">${LAYOUT.controls.map(([v, l]) => opt('controls', v, l)).join('')}</div></section>
      <section class="b-dsec"><h4>Teacher notes</h4><div class="b-opts">${LAYOUT.notes.map(([v, l]) => opt('notes', v, l)).join('')}</div></section>
      <section class="b-dsec"><h4>Color</h4><div class="b-opts b-opts--color">${THEMES.map(col).join('')}</div></section>
      ${CLASSROOM() ? `<section class="b-dsec"><h4>Button</h4><button type="button" class="b-sbtn b-dreset" data-b="posreset" title="The Menu · Guide · Pen button back to the middle of the bottom edge" ${pos.fab ? '' : 'disabled'}>${ic('rotate-ccw')}Reset position</button></section>` : ''}`;
  }
  function refreshDisplay() { if ($('#displayPop').matches(':popover-open')) renderDisplay(); }

  /* ---------- share with students ---------- */
  let lastPing = 0, inkRaf = 0;
  function broadcast() {
    if (!CH || !FP.lesson()) return;
    const s = FP.state();
    CH.postMessage({ type: 'state', lesson: FP.lesson().n, sec: s.sec, act: s.act, step: s.step, extra: s.extra, theme: root.dataset.theme, scene, timer: { dur: TM.dur, left: tLeft(), endAt: TM.endAt, run: TM.run, done: TM.done }, pick: { name: PK.name, seq: PK.seq, t0: PK.t0, roster, picked: [...picked] }, game, media: { key: MD.key, idx: MD.idx, playing: MD.playing, pos: mPos(), at: Date.now() }, ink: FP.ink.export() });
  }
  function broadcastInk() { if (inkRaf) return; inkRaf = requestAnimationFrame(() => { inkRaf = 0; broadcast(); }); }
  function setLive(on) {
    if (live === on) return; live = on;
    if (on && !hasScreen()) shareTo = hasTablets() ? 'both' : 'screen';    // a student window said hello
    if (!on && hasScreen()) shareTo = hasTablets() ? 'tablets' : 'none';   // …or went away
    if (!on && game && game.where === 'screen') game = null;
    renderShareBtn(); renderScenes(); renderGame(); renderScene(); renderDock(); syncMedia();
    fitTop(true);   // measure again now that the live dot sits in the top bar too
    if ($('#sharePop').matches(':popover-open')) renderShare();
  }
  if (CH) CH.onmessage = ({ data: m }) => {
    if (!m) return;
    if (m.type === 'hello' || m.type === 'ping') { const was = live; lastPing = Date.now(); setLive(true); if (m.type === 'hello' || !was) broadcast(); }
    if (m.type === 'bye') { lastPing = 0; setLive(false); }
    if (m.type === 'cmd') runCmd(m.a, m.v);
  };
  setInterval(() => { if (live && Date.now() - lastPing > 5000) setLive(false); }, 1000);
  function renderShareBtn() {
    const b = $('#shareBtn'), on = shareTo !== 'none';
    b.classList.toggle('is-live', live); b.classList.toggle('is-on', on);
    b.innerHTML = `${live ? '<i class="b-live" aria-hidden="true"></i>' : ''}${on ? (hasScreen() ? ic('monitor') : '') + (hasTablets() ? ic('tablet') : '') : ic('cast')}<span>${live ? 'Sharing' : 'Share'}</span>`;
    const to = [hasScreen() && 'the classroom screen', hasTablets() && 'student tablets (preview)'].filter(Boolean).join(' and ');
    b.title = on ? `Sharing to ${to} (S)` : 'Share with students (S)'; b.setAttribute('aria-label', on ? `Sharing to ${to}` : 'Share with students');
    fitTop();
  }
  function openStudent() { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('view', 'student'); window.open(u.href, 'pondc-student', 'popup,width=1280,height=800'); }
  function stopScreen() { if (CH) CH.postMessage({ type: 'stop' }); lastPing = 0; setLive(false); }
  function setShareTo(v) {
    const had = hasScreen(); shareTo = v;
    if (hasScreen() && !live) openStudent();   // runs from a click, so the browser lets the window open
    if (had && !hasScreen()) stopScreen();
    renderShareBtn(); if ($('#sharePop').matches(':popover-open')) renderShare();
  }
  function renderShare() {
    const scr = hasScreen(), tab = hasTablets();
    const opt = (v, icons, label, tip) => `<button type="button" data-b="shareto" data-v="${v}" aria-pressed="${shareTo === v}" title="${tip}"><span class="b-stic">${icons}</span><span>${label}</span></button>`;
    $('#sharePop').innerHTML = `<div class="b-pophead"><h3>Share with students</h3><p>Students see the 16:10 board only (1280 × 800) — never your notes or controls.</p></div>
      <div class="b-sto" role="group" aria-label="Share to">${opt('screen', ic('monitor'), 'Classroom screen', 'A second screen or projector')}${opt('tablets', ic('tablet'), 'Student tablets', 'Each student’s tablet')}${opt('both', ic('monitor') + ic('tablet'), 'Both', 'The classroom screen and the tablets show the same screen')}</div>
      <div class="b-scards">
        <article class="b-scard${scr ? (live ? ' is-live' : ' is-on') : ' is-off'}"><span class="b-sicon">${ic('monitor')}</span><div class="b-stx"><b>Classroom screen</b><p>For a second screen or projector. It follows every step, your drawing, the timer, the student pick and the pause screen.</p>
          ${scr ? `<div class="b-sact">${live ? `<span class="b-sstat"><i class="b-live" aria-hidden="true"></i>Connected</span><button type="button" class="b-sbtn" data-b="shareopen">${ic('external-link')}Bring to front</button>` : `<span class="b-sstat is-wait">Opening the student screen…</span><button type="button" class="b-sbtn" data-b="shareopen">${ic('external-link')}Open again</button>`}</div>` : ''}</div></article>
        <article class="b-scard${tab ? ' is-on' : ' is-off'}"><span class="b-sicon">${ic('tablet')}</span><div class="b-stx"><b>Student tablets <em>Soon</em></b><p>Students join with the QR code or the class code and see the same 1280 × 800 screen.</p>
          ${tab ? `<div class="b-scode"><span class="b-sqr">${ic('qr-code')}</span><div><small>Class code</small><b class="num">${TCODE}</b><span>0 joined · preview — tablets can join once the class server is ready</span></div></div>` : ''}</div></article>
      </div>
      ${shareTo !== 'none' ? `<div class="b-sfoot"><button type="button" class="b-sbtn b-sbtn--stop" data-b="sharestop">${ic('x')}Stop sharing</button></div>` : ''}`;
  }


  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-b]'); if (!t || t.disabled) return;
    const a = t.dataset.b, v = t.dataset.v;
    switch (a) {
      case 'go': FP.go(v, 0); break;
      case 'step': FP.setStep(+v); break;
      case 'next': FP.next(); break;
      case 'prev': FP.prev(); break;
      case 'close': FP.closeExtra(); break;
      case 'tool': FP.ink.set({ tool: v }); break;
      case 'color': FP.ink.set({ color: v }); break;
      case 'width': FP.ink.set({ width: +v }); break;
      case 'undo': FP.ink.undo(); break;
      case 'clear': FP.ink.clear(); break;
      case 'notes': toggleSheet('notes'); break;
      case 'flow': toggleSheet('flow'); break;
      case 'ntab': notesTab = v; renderNotes(); break;
      case 'say': FP.speak(v); break;
      case 'extra': FP.openExtra(v); if ($('#extrasPop').matches(':popover-open')) $('#extrasPop').hidePopover(); if (scene !== 'lesson') setScene('lesson'); break;
      case 'sections': sectionsMenu(t); break;
      case 'actmenu': actMenu(t); break;
      case 'sec': { FP.setSection(+v); const sm = $('#secMenu'); if (sm && sm.matches(':popover-open')) sm.hidePopover(); break; }
      case 'mappick': mapPick = +v; renderMap(); break;
      case 'mapsec': if (mapPick !== FP.lesson().n) FP.setLesson(mapPick); FP.setSection(+v); openMap(false); break;
      case 'mapopen': if (mapPick !== FP.lesson().n) FP.setLesson(mapPick); openMap(false); break;
      case 'mapclose': openMap(false); break;
      case 'theme': setTheme(v); break;
      case 'layout': setLayout(t.dataset.k, v); break;
      case 'scene': setScene(v); break;
      case 'tset': case 'tgo': case 'tadd': case 'treset': timerAct(a, +v || 0); break;
      case 'pickone': showStudent(v, false); break;
      case 'pickrand': pickRandom(); break;
      case 'rosteredit': $('#rosterPop').showPopover(); break;
      case 'rostersave': saveRoster(); break;
      case 'rosterclose': $('#rosterPop').hidePopover(); break;
      case 'rosterclear': picked.clear(); put('pondc-picked', []); PK.name = ''; PK.seq = null; $('#rosterPop').hidePopover(); if (scene === 'pick') renderScene(); renderDock(); broadcast(); break;
      case 'gplay': { const it = curGame(); if (it) { game = { id: it.id, where: v === 'screen' ? 'screen' : 'here' }; renderGame(); renderDock(); broadcast(); } break; }
      case 'gstop': game = null; renderGame(); renderDock(); broadcast(); break;
      case 'mtoggle': case 'mrestart': mediaCmd(a); break;
      case 'mseek': mediaCmd(a, seekAt(e, t)); break;
      case 'shareopen': openStudent(); break;
      case 'shareto': if (v === shareTo && hasScreen()) openStudent(); else setShareTo(v); break;
      case 'sharestop': setShareTo('none'); break;
      case 'dmenu': setDial(false); setMenu(!menuOpen); break;   // the one button's Menu · Guide · Pen
      case 'dguide': setDial(false); setGuide(!guideOpen); break;
      case 'dpen': setDial(false); if (menuOpen) setMenu(false); if (!FP.ink.state().on) FP.ink.toggle(); setPal(true); break;   // Pen = drawing on now, the tools at hand
      case 'posreset': pos = {}; put('pondc-pos', pos); placeFab(); renderDisplay(); break;
    }
    if (menuOpen && ['go', 'extra', 'close', 'mapsec', 'mapopen', 'scene'].includes(a) && !t.closest('.b-dock, .b-sheet, .b-npanel')) setMenu(false);   // picked: the class sees it
    if (dialOpen && (a === 'go' || a === 'extra')) setDial(false);   // picked in the layer: the class sees it
  });
  $('#fabBtn').addEventListener('click', () => {   // classroom: the one button opens Menu · Guide · Pen, or closes what is open
    if (!CLASSROOM()) { setPal(!palOpen); return; }
    if (palOpen) setPal(false); else if (menuOpen) setMenu(false); else setDial(!dialOpen);
  });
  $('#lessonBtn').addEventListener('click', () => openMap(true));
  $('#fsBtn').addEventListener('click', () => FP.fullscreen());
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').innerHTML = ic(document.fullscreenElement ? 'minimize' : 'maximize'); });
  const POPS = { extrasPop: ['extrasBtn', renderExtras], helpPop: ['helpBtn', null], sharePop: ['shareBtn', renderShare], displayPop: ['displayBtn', renderDisplay] };
  Object.entries(POPS).forEach(([p, [b, fill]]) => {
    $('#' + p).addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return; if (fill) fill();
      const r = $('#' + b).getBoundingClientRect(), pop = $('#' + p);
      if (placePop(pop, $('#' + b))) return;
      pop.style.top = (r.bottom + 10) + 'px';
      if (p === 'extrasPop') { pop.style.left = r.left + 'px'; pop.style.right = 'auto'; }
      else { pop.style.right = Math.max(10, innerWidth - r.right) + 'px'; pop.style.left = 'auto'; }
    });
  });
  Object.keys(POPS).forEach(p => $('#' + p).addEventListener('toggle', e => { if (e.newState === 'open') clampPop($('#' + p)); }));
  MENU_POPS.forEach(id => { const p = document.getElementById(id); if (p) p.addEventListener('toggle', e => { if (e.newState === 'closed') requestAnimationFrame(() => { if (CLASSROOM() && !document.querySelector(MENU_POPS.map(x => '#' + x + ':popover-open').join(','))) placeFab(); }); }); });   // a menu slid aside for a popover comes back
  $('#extrasPop').addEventListener('toggle', e => {
    if (e.newState !== 'open' || CLASSROOM()) return; const pop = $('#extrasPop');
    pop.style.left = Math.max(10, Math.min(parseFloat(pop.style.left) || 10, innerWidth - pop.offsetWidth - 10)) + 'px';
  });
  $('#rosterPop').addEventListener('beforetoggle', e => { if (e.newState === 'open') renderRoster(); });
  $('#rosterPop').addEventListener('toggle', e => { if (e.newState === 'open') { const tx = $('#rosterTx'); if (tx) tx.focus(); } });

  FP.on(e => {
    if ((e.type === 'lesson' || e.type === 'nav') && addGamesStep()) { FP.render(); renderDock(); }
    if (e.type === 'lesson') { refreshGames(); renderTop(); }
    if (e.type === 'nav') { renderCrumb(); renderActs(); renderMedia(); renderDock(); renderFlow(); renderNotes(); renderGame(); broadcast(); renderSides(); if (dialOpen) { renderLayer(); requestAnimationFrame(placeFab); } }
    if (e.type === 'ink') { renderFab(); broadcast(); }
    if (e.type === 'inkmove') broadcastInk();
    if (e.type === 'key') {
      const k = e.key.toLowerCase();
      if (!$('#map').hidden) { if (k === 'escape' || k === 'm') openMap(false); return; }
      if (k === 'escape') {
        if (palOpen) setPal(false);
        else if (dialOpen) setDial(false);
        else if (notesOpen || flowOpen) { notesOpen = flowOpen = false; renderFlow(); renderNotes(); renderDock(); }
        else if (menuOpen) { if (!document.querySelector(MENU_POPS.map(id => '#' + id + ':popover-open').join(','))) setMenu(false); }
        else if (guideOpen) setGuide(false);
        else if (scene !== 'lesson') setScene(scene === 'pause' ? 'pause' : 'lesson');
        return;
      }
      if (k === 'n') toggleSheet('notes');
      if (k === 'l') toggleSheet('flow');
      if (k === 'm') openMap(true);
      if (k === 'b' || k === '.') setScene('pause');
      if (k === 't') setScene(scene === 'timer' ? 'lesson' : 'timer');
      if (k === 'p') setScene(scene === 'pick' ? 'lesson' : 'pick');
      if (k === 'a') { if (CLASSROOM() && !menuOpen) setMenu(true); $('#extrasPop').togglePopover(); }
      if (k === 's') { if (CLASSROOM() && !menuOpen) setMenu(true); $('#sharePop').togglePopover(); }
      if (k === 'g' && CLASSROOM()) setGuide(!guideOpen);
      if (k === 'c') cycleTheme();
      if (k === 'k' && curMedia()) mediaCmd('mtoggle');
    }
  });
  setInterval(tickRing, 1000);
  setInterval(tick, 250);

  FP.mount($('#stage'), { storageKey: 'fprk-bc', keepAwake: true, fresh: qs.has('fresh'), lesson: +qs.get('lesson') || 1, act: qs.get('act') || 'ls1', design: DESIGN });
  addLayers(); refreshGames(); if (addGamesStep()) FP.render();
  renderScenes(); renderActs(); renderFab(); renderShareBtn(); renderMedia(); renderDock(); renderGame(); renderSides();
  new ResizeObserver(() => { root.style.setProperty('--guide-h', ($('#dock').offsetHeight || 0) + 'px'); placeFab(); }).observe($('#dock'));
  $('#stagewrap').addEventListener('click', e => { if ((menuOpen || dialOpen) && !e.target.closest('.b-fab, .b-layer')) { setMenu(false); setDial(false); e.stopPropagation(); e.preventDefault(); } }, true);   // a tap on the board closes the menu / Menu · Guide · Pen first
  $('#stagewrap').addEventListener('click', e => {   // classroom: tap the video = play / pause (no player bar)
    if (!CLASSROOM() || FP.ink.state().on || scene !== 'lesson' || !curMedia()) return;
    const path = e.composedPath().filter(n => n.nodeType === 1);   // the path at the tap: a button may have re-rendered (detached) its insides by now
    if (path.some(n => n.matches('button, a, input, select, textarea, label, iframe, [data-b], .b-fab, .b-sheet, .b-pop'))) return;
    if (path.some(n => n.id === 'media')) mediaCmd('mtoggle');
  });
  $('#stage').addEventListener('pointermove', mediaIdle);
  new ResizeObserver(() => placeFab()).observe($('#stagewrap'));
  initMove();
  new ResizeObserver(() => { clearTimeout(fitT); fitT = setTimeout(fitTop, 60); }).observe($('.b-top'));
  if (document.fonts) document.fonts.ready.then(() => fitTop(true));
  placeFab();
  if (qs.get('scene')) setScene(qs.get('scene'));   // QA / deep link: ?scene=timer|pick|pause
})();
