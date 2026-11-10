/* Phonics POND · Stage (concept B, developed) — presenter shell for the classroom e-board.
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
  const CH = 'BroadcastChannel' in window ? new BroadcastChannel('phonics-pond') : null;
  const DESIGN = [1280, 800];
  const put = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };

  /* ---------- colour themes: [id, label, frame, board, action] ---------- */
  const THEMES = [['dark', 'Dark', '#0E1013', '#F6F3EC', '#FFC83D'], ['mint', 'Mint', '#62D4B4', '#FFFFFF', '#EC4F8E'], ['yellow', 'Yellow', '#FFE15A', '#FFFFFF', '#1D1A0F']];
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
  const gameGroup = { group: 'Games', icon: 'gamepad', items: [] };
  FP.extras().unshift(gameGroup);
  function refreshGames() { const L = FP.lesson(); if (!L) return; gameGroup.items = GAMES.filter(g => g.has(L)).map(g => ({ id: g.id, label: g.name, sub: g.sub(L), group: 'Games', icon: 'gamepad', game: g })); }
  const curGame = () => { const it = FP.extraInfo(); return it && it.game ? it : null; };
  const gameUrl = it => GAME_BASE + it.game.path + it.game.q(FP.lesson());

  /* ---------- class tools shown on the student screen ---------- */
  let scene = 'lesson', resumeTo = 'lesson';                 // lesson | timer | pick | pause
  const TM = { dur: 60000, left: 60000, endAt: 0, run: false, done: false };
  const tLeft = () => (TM.run ? Math.max(0, TM.endAt - Date.now()) : TM.left);
  const tActive = () => TM.run || TM.done || TM.left < TM.dur;
  const PK = { name: '', seq: null, t0: 0 };
  const SPIN = 1700;
  let game = null;                                           // { id, where: 'here' | 'screen' }
  let live = false;
  const AV = ['#F2994A', '#2D9CDB', '#27AE60', '#9B51E0', '#EB5757', '#E0A800', '#13A8C4', '#E26DAE', '#3DAA6E', '#F2784B'];
  const avColor = n => { let h = 7; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
  const initial = n => esc((String(n).trim().charAt(0) || '?').toUpperCase());
  const clock = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function addLayers() {
    $('#stage').insertAdjacentHTML('beforeend', `<div class="b-game" id="game" hidden></div><div class="b-scene" id="scene" hidden></div><div class="b-over"><button type="button" class="b-ctimer" id="ctimer" data-b="scene" data-v="timer" title="Timer"${STUDENT ? ' tabindex="-1"' : ''} hidden></button></div>`);
  }

  const RR = 300, RC = 2 * Math.PI * RR;
  let pickIdx = -2;
  function renderScene() {
    const el = $('#scene'); if (!el) return;
    const preview = scene === 'pause' && !STUDENT && live;   // the classroom screen is paused; the teacher keeps working
    const show = scene === 'timer' || scene === 'pick' || preview;
    el.hidden = !show; el.dataset.scene = show ? scene : '';
    if (!show) { el.innerHTML = ''; tick(); return; }
    if (scene === 'timer') el.innerHTML = `<div class="b-fit"><div class="b-tfull" id="tFull"><svg viewBox="0 0 680 680" aria-hidden="true"><circle class="bg" cx="340" cy="340" r="${RR}"/><circle class="fg" cx="340" cy="340" r="${RR}" stroke-dasharray="${RC.toFixed(1)}"/></svg><div class="b-tread"><b id="tBig"></b><span id="tCap"></span></div></div></div>`;
    else if (scene === 'pick') { el.innerHTML = '<div class="b-fit"><div class="b-pick" id="pickView"></div></div>'; pickIdx = -2; drawPick(); }
    else { const L = FP.lesson(); el.innerHTML = `<div class="b-fit"><div class="b-spause"><span class="b-spchip"><i class="b-live" aria-hidden="true"></i>Classroom screen · paused</span><span class="b-pausel" lang="en">${esc(L.key)}</span><p lang="en">Eyes on me!</p></div></div>`; }
    tick();
  }
  function renderPause() {
    const p = $('#pause'), on = scene === 'pause' && (STUDENT || !live);
    if (on && p.hidden) { const L = FP.lesson(); p.innerHTML = `<div class="b-pausein"><span class="b-pausel" lang="en">${esc(L.key)}</span><p lang="en">Eyes on me!</p>${STUDENT ? '' : '<small>Tap anywhere or press B to go back</small>'}</div>`; }
    p.hidden = !on;
  }
  function drawPick() {
    const v = $('#pickView'); if (!v) return;
    if (!PK.name) { if (pickIdx !== -1) { pickIdx = -1; v.innerHTML = `<div class="b-pkcard is-wait"><span class="b-pkav">${ic('dices')}</span><b>Who’s next?</b></div>`; } return; }
    const t = (Date.now() - PK.t0) / SPIN, spinning = !!PK.seq && t < 1;
    const k = spinning ? Math.min(PK.seq.length - 1, Math.floor((1 - Math.pow(1 - Math.max(0, t), 2.4)) * PK.seq.length)) : 1e6;
    if (k !== pickIdx) {
      pickIdx = k; const n = spinning ? PK.seq[k] : PK.name;
      v.innerHTML = `<div class="b-pkcard ${spinning ? 'is-spin' : 'is-pick'}"><span class="b-pkav" style="--c:${avColor(n)}">${initial(n)}</span><b lang="en">${esc(n)}</b>${spinning ? '<span class="b-pkcap is-quiet">Picking…</span>' : '<span class="b-pkcap">It’s your turn!</span>'}</div>`;
    }
    if (spinning) requestAnimationFrame(drawPick);
  }
  function tick() {
    const left = tLeft();
    if (TM.run && left <= 0) { TM.run = false; TM.left = 0; TM.done = true; if (!STUDENT) { chime(); renderDock(); broadcast(); } }
    const f = $('#tFull');
    if (f) {
      $('#tBig').textContent = clock(left);
      $('#tCap').textContent = TM.done ? 'Time’s up!' : TM.run ? 'Time left' : left < TM.dur ? 'Paused' : 'Ready';
      f.classList.toggle('is-low', TM.run && left <= 10000); f.classList.toggle('is-done', TM.done);
      f.querySelector('.fg').style.strokeDashoffset = (RC * (1 - (TM.dur ? left / TM.dur : 0))).toFixed(1);
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
    if (STUDENT) acts = `<p class="b-gstat">${game && game.where === 'here' ? 'Playing on the teacher’s screen' : 'Get ready to play!'}</p>`;
    else if (game && game.where === 'screen') acts = `<p class="b-gstat"><i class="b-live" aria-hidden="true"></i>Playing on the classroom screen</p><div class="b-gacts"><button type="button" class="b-gbtn" data-b="gplay" data-v="here">${ic('monitor')}Play here instead</button><button type="button" class="b-gbtn" data-b="gstop">${ic('x')}Stop</button></div>`;
    else if (live) acts = `<div class="b-gacts"><button type="button" class="b-gbtn b-gbtn--go b-gbtn--lg" data-b="gplay" data-v="screen">${ic('cast')}Play on classroom screen</button><button type="button" class="b-gbtn" data-b="gplay" data-v="here">${ic('play')}Play here</button></div>`;
    else acts = `<div class="b-gacts"><button type="button" class="b-gbtn b-gbtn--go b-gbtn--lg" data-b="gplay" data-v="here">${ic('play')}Play</button></div>`;
    el.innerHTML = `<div class="b-fit"><div class="b-gcover"><img src="assets/games/${g.poster}.webp" alt="" onerror="this.remove()"><div class="b-gshade"></div><div class="b-ginfo"><span class="b-gtag">${ic('gamepad')}Phonics game · Lesson ${FP.lesson().n}</span><h3 lang="en">${esc(it.label)}</h3><p lang="en">${esc(it.sub)} · ${esc(g.blurb)}</p>${acts}</div></div></div>`;
  }

  /* ================= student view ================= */
  function studentMain() {
    document.title = 'Phonics POND — Student screen';
    FP.on(e => { if (e.type === 'lesson') refreshGames(); if (e.type === 'nav') renderGame(); });
    FP.mount($('#stage'), { storageKey: 'pond-student', fresh: true, keys: false, keepAwake: true, design: DESIGN, viewTransitions: false });
    addLayers(); refreshGames();
    const wait = $('#wait');
    const card = (title, sub) => { wait.innerHTML = `<div class="b-waitin"><span class="b-logo b-logo--lg"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#pond-mark"/></svg></span><b>${title}</b><p>${sub}</p></div>`; wait.hidden = false; };
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
      const redraw = scene !== m.scene || PK.t0 !== m.pick.t0 || PK.name !== m.pick.name;
      scene = m.scene; Object.assign(TM, m.timer); Object.assign(PK, m.pick); game = m.game;
      if (redraw) renderScene();
      renderGame(); renderPause(); tick();
    };
    CH.onmessage = ({ data: m }) => {
      if (!m) return;
      if (m.type === 'state') { wait.hidden = true; apply(m); }
      if (m.type === 'stop') { card('Sharing has ended', 'You can close this window.'); setTimeout(() => window.close(), 1500); }
    };
    CH.postMessage({ type: 'hello' });
    setInterval(() => CH.postMessage({ type: 'ping' }), 2000);
    setInterval(tick, 250);
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

  function setTheme(t) { applyTheme(t); put('fprk-b-theme', root.dataset.theme); broadcast(); refreshDisplay(); }
  function cycleTheme() { const i = THEMES.findIndex(x => x[0] === root.dataset.theme); setTheme(THEMES[(i + 1) % THEMES.length][0]); }

  /* ---------- layout: panel arrangement chosen by the teacher ---------- */
  const LAYOUT = { controls: [['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']], notes: [['sheet', 'Pop-up'], ['panel', 'Side panel']] };
  function setLayout(k, v) {
    if (!LAYOUT[k] || !LAYOUT[k].some(x => x[0] === v)) return;
    root.dataset[k] = v; put('pond-' + k, v);
    if (k === 'notes') { notesOpen = false; root.dataset.npanel = 'shown'; put('pond-npanel', 'shown'); }
    renderDock(); renderFlow(); renderNotes(); renderFab(); refreshDisplay(); requestAnimationFrame(placeFab);
  }

  /* ---------- what students see (top bar) ---------- */
  // what students see: the lesson, a class activity or game, or a class tool
  const SCENES = [['lesson', 'presentation', 'Lesson', 'Show the lesson'], ['timer', 'timer', 'Timer', 'Timer (T)'], ['pick', 'dices', 'Pick', 'Pick a student (P)'], ['pause', 'monitor-pause', 'Pause', 'Eyes on me (B)']];
  function renderScenes() {
    const el = $('#scenes'); if (!el || !FP.lesson()) return;
    el.innerHTML = `<span class="b-scnl" title="${live ? 'Sharing to the classroom screen' : 'What students see'}">${live ? '<i class="b-live" aria-hidden="true"></i>' : ''}<span>Students see</span></span>${SCENES.map(([v, i, l, t]) => `<button type="button" data-b="scene" data-v="${v}" aria-pressed="${scene === v}" title="${t}">${ic(i)}<span>${l}</span></button>`).join('')}`;
    fitTop();
  }
  function renderActs() {   // the lesson's class activities + games, next to the lesson button
    const b = $('#extrasBtn'); if (!b || !FP.lesson()) return;
    const on = FP.mode() === 'extra';
    b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on);
    b.innerHTML = `${ic('grid')}<span>Class activities</span>${ic('chevron-down', 'b-dd')}`;
  }
  function setScene(v) {
    if (v === 'pause' && scene === 'pause') v = resumeTo;
    else if (v === scene) return;
    if (v === 'pause') resumeTo = scene;
    scene = v;
    renderScenes(); renderScene(); renderPause(); renderDock(); broadcast();
  }
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
  const FIT = ['is-tight', 'is-tighter', 'is-tightest', 'is-tight4', 'is-tight5'];
  let fitKey = '', fitLevel = 0, fitT = 0;
  const crumbHTML = (sec, title) => `<button type="button" data-b="sections" title="Sections">${esc(sec)}${ic('chevron-down')}</button>${ic('chevron-right')}<b lang="en">${esc(title)}</b>`;
  function fitTop(force) {
    const top = $('.b-top'), crumb = $('#crumb'), L = FP.lesson(); if (!top || !crumb || !L) return;
    const key = `${L.n}|${innerWidth}|${live ? 1 : 0}`;
    if (key !== fitKey || force) {
      fitKey = key; fitLevel = 0;
      const keep = crumb.innerHTML, cut = () => { const b = crumb.querySelector('b'); return b.scrollHeight > b.clientHeight + 4; };
      const intro = ['Lesson Words', 'Sound Chant', L.a1, 'Meaning First', 'Sound Awareness', 'Sound–Letter Match', 'Sound Review', 'Sound Blending', L.a2, 'G-Learning'];
      for (const s of FP.sections()) for (const t of (s.built ? intro : s.subs.length ? s.subs : [s.name])) {
        crumb.innerHTML = crumbHTML(s.name, t || '');
        while (fitLevel < FIT.length) { FIT.forEach((c, i) => top.classList.toggle(c, i < fitLevel)); if (!cut()) break; fitLevel++; }
      }
      crumb.innerHTML = keep;
    }
    FIT.forEach((c, i) => top.classList.toggle(c, i < fitLevel));
  }
  function renderCrumb() {
    const c = FP.context(), sec = FP.section();
    if (c.mode === 'extra') $('#crumb').innerHTML = `<span>${esc((FP.extraInfo() || {}).group || 'Class activity')}</span>${ic('chevron-right')}<b>${esc(c.title)}</b>`;
    else $('#crumb').innerHTML = crumbHTML(sec.name, FP.cur().title);
    fitTop();
  }

  /* ---------- floating board tools ---------- */
  function renderFab() {
    const k = FP.ink.state(), cur = k.on ? k.tool : 'select';
    const tIcon = { pen: 'pen', hl: 'highlighter', er: 'eraser' }[cur] || 'pen';
    const b = $('#fabBtn');
    b.classList.toggle('is-ink', k.on && !palOpen); b.classList.toggle('is-open', palOpen);
    b.setAttribute('aria-expanded', palOpen);
    b.title = palOpen ? 'Hide board tools' : k.on ? 'Board tools — drawing is on (D)' : 'Board tools (D = pen)';
    b.innerHTML = palOpen ? ic('x') : `${ic(k.on ? tIcon : 'pen')}${k.on && cur !== 'er' ? `<i class="b-fabdot" style="--c:${k.color}"></i>` : ''}${k.count && !k.on ? `<i class="b-fabn">${k.count}</i>` : ''}`;
    const pal = $('#fabPal'); pal.hidden = !palOpen; if (!palOpen) return;
    const t = (id, n, l) => `<button type="button" class="b-tool${cur === id ? ' is-on' : ''}" data-b="tool" data-v="${id}" title="${l}" aria-label="${l}" aria-pressed="${cur === id}">${ic(n)}</button>`;
    pal.innerHTML = `<div class="b-palgrp">${t('select', 'pointer', 'Select — use the content')}${t('pen', 'pen', 'Pen (D)')}${t('hl', 'highlighter', 'Highlighter')}${t('er', 'eraser', 'Eraser')}</div><i class="b-palsep"></i>
      <div class="b-palgrp b-palgrp--sw">${FP.inkColors.map(([c, n]) => `<button type="button" class="b-sw${k.color === c ? ' is-on' : ''}" data-b="color" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="${k.color === c}"></button>`).join('')}</div><i class="b-palsep"></i>
      <div class="b-palgrp b-palgrp--wd">${[[3, 'Thin'], [6, 'Medium'], [12, 'Thick']].map(([w, n]) => `<button type="button" class="b-wd${k.width === w ? ' is-on' : ''}" data-b="width" data-v="${w}" title="${n} line" aria-label="${n} line"><i style="--w:${w}px"></i></button>`).join('')}</div><i class="b-palsep"></i>
      <div class="b-palgrp"><button type="button" class="b-tool" data-b="undo" title="Undo" aria-label="Undo" ${k.count ? '' : 'disabled'}>${ic('undo')}</button><button type="button" class="b-tool" data-b="clear" title="Clear drawing" aria-label="Clear drawing" ${k.count ? '' : 'disabled'}>${ic('trash')}</button></div>`;
  }
  function setPal(open) { palOpen = open; renderFab(); }
  function placeFab() {   // in the side margin when the 16:10 frame leaves room, else on the frame's corner
    const wrap = $('#stagewrap'), st = $('#stage'), fab = $('#fab'); if (!wrap || !st || !fab) return;
    const gx = (wrap.clientWidth - st.offsetWidth) / 2, gy = (wrap.clientHeight - st.offsetHeight) / 2;
    const left = root.dataset.controls === 'left', out = gx >= 96;
    fab.dataset.side = left ? 'left' : 'right'; fab.dataset.mode = out ? 'gutter' : 'inside';
    const x = out ? Math.max(8, (gx - 64) / 2) : gx + 16, y = gy + (out ? 0 : 16);
    fab.style.left = left ? x + 'px' : 'auto'; fab.style.right = left ? 'auto' : x + 'px'; fab.style.bottom = y + 'px';
    fab.style.setProperty('--pal-max', Math.max(200, st.offsetHeight - 76) + 'px');
    const app = $('#app');   // side panels (notes, side controls) line up with the frame's top and bottom
    app.style.setProperty('--frame-top', Math.max(0, gy) + 'px'); app.style.setProperty('--frame-h', st.offsetHeight + 'px');
  }

  /* ---------- dock ---------- */
  const R = 25, C = 2 * Math.PI * R;
  const back = l => `<button type="button" class="b-prev b-back" data-b="scene" data-v="lesson" title="Back to the lesson" aria-label="Back to the lesson">${ic('presentation')}<span>${l || 'Lesson'}</span></button>`;
  function renderDock() {
    const d = $('#dock'); if (!d) return;
    d.dataset.mode = scene === 'pause' && !live ? 'lesson' : scene;
    if (scene === 'timer') d.innerHTML = dockTimer();
    else if (scene === 'pick') d.innerHTML = dockPick();
    else if (scene === 'pause' && live) d.innerHTML = dockPause();
    else d.innerHTML = dockLesson();
    tickRing(); tick();
  }
  function dockLesson() {
    const extra = FP.mode() === 'extra', flow = FP.flow(), cur = FP.cur(), st = FP.state();
    const segs = flow.map(a => { const fill = extra ? 0 : a.index < cur.index ? 1 : a.index === cur.index ? (st.step + 1) / a.steps.length : 0;
      return `<button type="button" class="b-segm${a.index === cur.index && !extra ? ' is-on' : ''}" style="flex:${a.steps.length}" data-b="go" data-v="${a.id}" title="${esc(a.title)}" aria-label="${esc(a.title)}"><i style="width:${(fill * 100).toFixed(1)}%"></i></button>`; }).join('');
    let left, mid, right;
    if (extra) {
      const it = FP.extraInfo(), gm = it.game ? it : null;
      left = `<div class="b-now"><div class="b-ring b-ring--icon">${ic(it.icon)}</div><div class="b-nowtx"><small>${esc(it.group)}${gm ? ` · Lesson ${FP.lesson().n}` : ''}</small><b>${esc(it.label)}</b><span lang="en">${esc(it.sub)}</span></div></div>`;
      const gmsg = !gm ? '' : game && game.where === 'here' ? `${esc(it.label)} is running on the board. Go back to the lesson when the round is over.` : game && game.where === 'screen' ? `${esc(it.label)} is running on the classroom screen.` : `Tap Play on the board to start ${esc(it.label)}.`;
      mid = `<div class="b-say b-say--quiet"><p>${gm ? gmsg : it.soon ? 'This activity is in production — the content area is ready for it.' : 'Run the activity, then go back to where you left the lesson.'}</p></div>`;
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
    return `<div class="b-segs" role="group" aria-label="Progress">${segs}</div>
      <div class="b-dockrow">${left}${mid}<div class="b-dright"><div class="b-toggles"><button type="button" class="b-tg${notesOn ? ' is-on' : ''}" data-b="notes" aria-pressed="${notesOn}" title="Teacher notes (N)">${ic('notebook-pen')}<span>Notes</span></button><button type="button" class="b-tg${flowOpen ? ' is-on' : ''}" data-b="flow" aria-pressed="${flowOpen}" title="Run of show (L)">${ic('list')}<span>Flow</span></button></div>${right}</div></div>`;
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
    return `<div class="b-dockrow b-dockrow--tool"><div class="b-now"><div class="b-ring b-ring--icon">${ic('monitor-pause')}</div><div class="b-nowtx"><small>On the student screen</small><b>Eyes on me</b><span>The classroom screen is paused</span></div></div>
      <div class="b-say b-say--quiet"><p>Only the classroom screen is paused — your dashboard keeps working.</p></div>
      <div class="b-dright"><div class="b-pn"><button type="button" class="b-next" data-b="scene" data-v="pause"><span><b>Resume</b><small>Back to ${to}</small></span>${ic('play')}</button></div></div></div>`;
  }
  function tickRing() {
    const ring = $('#ring'); if (!ring) return;
    const a = FP.cur(), ms = FP.timer.actElapsed(), plan = a.type === 'sb' && FP.isIntro() ? 5 * 60000 : 0;
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
  const DEF_ROSTER = ['Amy', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Finn', 'Grace', 'Henry', 'Ivy', 'Jake', 'Kate', 'Leo'];
  let roster = get('pond-roster', null); if (!Array.isArray(roster) || !roster.length) roster = DEF_ROSTER.slice();
  let picked = new Set((get('pond-picked', []) || []).filter(n => roster.includes(n)));
  function showStudent(n, spin) {
    if (!n) return;
    PK.name = n; PK.t0 = Date.now(); PK.seq = null;
    if (spin && roster.length > 1) { const pool = roster.filter(x => x !== n), seq = []; for (let i = 0; i < 14; i++) seq.push(pool[Math.floor(Math.random() * pool.length)]); seq.push(n); PK.seq = seq; }
    picked.add(n); put('pond-picked', [...picked]);
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
    picked = new Set([...picked].filter(n => roster.includes(n))); put('pond-picked', [...picked]);
    if (PK.name && !roster.includes(PK.name)) { PK.name = ''; PK.seq = null; renderScene(); broadcast(); }
    $('#rosterPop').hidePopover(); renderDock();
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
      root.dataset.npanel = root.dataset.npanel === 'hidden' ? 'shown' : 'hidden'; put('pond-npanel', root.dataset.npanel);
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
    const games = gameGroup.items.length ? `<section class="b-xgames"><h4>${ic('gamepad')}Games for Lesson ${FP.lesson().n} <span lang="en">${esc(FP.lesson().snd)}</span></h4><div>${gameGroup.items.map(it => `<button type="button" class="b-xg${cur && cur.id === it.id ? ' is-on' : ''}" data-b="extra" data-v="${it.id}"><img src="assets/games/${it.game.poster}-thumb.webp" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><b lang="en">${esc(it.label)}</b><small lang="en">${esc(it.sub)}</small></button>`).join('')}</div></section>` : '';
    $('#extrasPop').innerHTML = `<div class="b-pophead"><h3>Class activities</h3><p>Outside the lesson flow — the lesson waits where you left it.</p></div>${games}<div class="b-xgrid">${FP.extras().filter(g => g !== gameGroup).map(g => `<section><h4>${ic(g.icon)}${esc(g.group)}</h4>${g.items.map(it => `<button type="button" class="b-xi${it.soon ? ' is-soon' : ''}${cur && cur.id === it.id ? ' is-on' : ''}" data-b="extra" data-v="${it.id}"><b>${esc(it.label)}</b><small>${esc(it.sub)}</small>${it.soon ? '<em>Soon</em>' : ''}</button>`).join('')}</section>`).join('')}</div>`;
  }

  /* ---------- sections menu (breadcrumb) ---------- */
  function sectionsMenu(btn) {
    let m = $('#secMenu'); if (!m) { m = document.createElement('div'); m.id = 'secMenu'; m.className = 'b-pop b-pop--secs'; m.popover = 'auto'; document.body.appendChild(m); }
    m.innerHTML = `<p class="b-lab2">Lesson ${FP.lesson().n} sections</p>${FP.sections().map(s => `<button type="button" class="b-secitem${s.on ? ' is-on' : ''}" data-b="sec" data-v="${s.i}"><span>${s.i + 1}</span><b lang="en">${esc(s.name)}</b><small>SB ${esc(s.pages)}</small>${s.built ? '<em class="is-ready">Ready</em>' : '<em>Soon</em>'}</button>`).join('')}`;
    const r = btn.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 8) + 'px';
    m.showPopover();
  }

  /* ---------- display: layout + colour ---------- */
  function renderDisplay() {
    const opt = (k, v, label) => `<button type="button" class="b-opt" data-b="layout" data-k="${k}" data-v="${v}" aria-pressed="${root.dataset[k] === v}"><span class="b-thumb b-thumb--${k}-${v}" aria-hidden="true"><i class="t"></i><i class="s"></i><i class="d"></i><i class="n"></i></span><b>${label}</b></button>`;
    const col = ([v, label, frame, board, act]) => `<button type="button" class="b-opt" data-b="theme" data-v="${v}" aria-pressed="${root.dataset.theme === v}"><span class="b-thumb b-thumb--color" style="--f:${frame};--st:${board};--a:${act}" aria-hidden="true"><i class="s"></i><i class="a"></i></span><b>${label}</b></button>`;
    $('#displayPop').innerHTML = `<div class="b-pophead"><h3>Display</h3><p>Arrange the dashboard your way — saved on this device. The student screen stays 16:10 (1280 × 800).</p></div>
      <section class="b-dsec"><h4>Controls</h4><div class="b-opts">${LAYOUT.controls.map(([v, l]) => opt('controls', v, l)).join('')}</div></section>
      <section class="b-dsec"><h4>Teacher notes</h4><div class="b-opts">${LAYOUT.notes.map(([v, l]) => opt('notes', v, l)).join('')}</div></section>
      <section class="b-dsec"><h4>Color</h4><div class="b-opts">${THEMES.map(col).join('')}</div></section>`;
  }
  function refreshDisplay() { if ($('#displayPop').matches(':popover-open')) renderDisplay(); }

  /* ---------- share with students ---------- */
  let lastPing = 0, inkRaf = 0;
  function broadcast() {
    if (!CH || !FP.lesson()) return;
    const s = FP.state();
    CH.postMessage({ type: 'state', lesson: FP.lesson().n, sec: s.sec, act: s.act, step: s.step, extra: s.extra, theme: root.dataset.theme, scene, timer: { dur: TM.dur, left: tLeft(), endAt: TM.endAt, run: TM.run, done: TM.done }, pick: { name: PK.name, seq: PK.seq, t0: PK.t0 }, game, ink: FP.ink.export() });
  }
  function broadcastInk() { if (inkRaf) return; inkRaf = requestAnimationFrame(() => { inkRaf = 0; broadcast(); }); }
  function setLive(on) {
    if (live === on) return; live = on;
    if (!on && game && game.where === 'screen') game = null;
    renderShareBtn(); renderScenes(); renderGame(); renderScene(); renderPause(); renderDock();
    if ($('#sharePop').matches(':popover-open')) renderShare();
  }
  if (CH) CH.onmessage = ({ data: m }) => {
    if (!m) return;
    if (m.type === 'hello' || m.type === 'ping') { const was = live; lastPing = Date.now(); setLive(true); if (m.type === 'hello' || !was) broadcast(); }
    if (m.type === 'bye') { lastPing = 0; setLive(false); }
  };
  setInterval(() => { if (live && Date.now() - lastPing > 5000) setLive(false); }, 1000);
  function renderShareBtn() {
    const b = $('#shareBtn'); b.classList.toggle('is-live', live);
    b.innerHTML = `${live ? '<i class="b-live" aria-hidden="true"></i>' : ic('cast')}<span>${live ? 'Sharing' : 'Share'}</span>`;
    b.setAttribute('aria-label', live ? 'Sharing with students' : 'Share with students');
  }
  function openStudent() { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('view', 'student'); window.open(u.href, 'pond-student', 'popup,width=1280,height=800'); }
  function stopShare() { if (CH) CH.postMessage({ type: 'stop' }); lastPing = 0; setLive(false); }
  function renderShare() {
    $('#sharePop').innerHTML = `<div class="b-pophead"><h3>Share with students</h3><p>Students see the 16:10 board only (1280 × 800) — never your notes or controls.</p></div>
      <div class="b-scards">
        <article class="b-scard${live ? ' is-live' : ''}"><span class="b-sicon">${ic('monitor')}</span><div class="b-stx"><b>Classroom screen</b><p>For a second screen or projector. It follows every step, your drawing, the timer, the student pick and the pause screen.</p>
          <div class="b-sact">${live ? `<span class="b-sstat"><i class="b-live" aria-hidden="true"></i>Connected</span><button type="button" class="b-sbtn" data-b="shareopen">${ic('external-link')}Bring to front</button><button type="button" class="b-sbtn b-sbtn--stop" data-b="sharestop">${ic('x')}Stop sharing</button>` : `<button type="button" class="b-sbtn b-sbtn--go" data-b="shareopen">${ic('external-link')}Open student screen</button>`}</div></div></article>
        <article class="b-scard is-soon"><span class="b-sicon">${ic('tablet')}</span><div class="b-stx"><b>Student tablets <em>Soon</em></b><p>Students join with a QR code or a class code and see the same 1280 × 800 screen. Needs the class server.</p></div></article>
      </div>`;
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
      case 'rosterclear': picked.clear(); put('pond-picked', []); $('#rosterPop').hidePopover(); renderDock(); break;
      case 'gplay': { const it = curGame(); if (it) { game = { id: it.id, where: v === 'screen' ? 'screen' : 'here' }; renderGame(); renderDock(); broadcast(); } break; }
      case 'gstop': game = null; renderGame(); renderDock(); broadcast(); break;
      case 'shareopen': openStudent(); break;
      case 'sharestop': stopShare(); break;
    }
  });
  $('#fabBtn').addEventListener('click', () => setPal(!palOpen));
  $('#lessonBtn').addEventListener('click', () => openMap(true));
  $('#pause').addEventListener('click', () => { if (scene === 'pause') setScene('pause'); });
  $('#fsBtn').addEventListener('click', () => FP.fullscreen());
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').innerHTML = ic(document.fullscreenElement ? 'minimize' : 'maximize'); });
  const POPS = { extrasPop: ['extrasBtn', renderExtras], helpPop: ['helpBtn', null], sharePop: ['shareBtn', renderShare], displayPop: ['displayBtn', renderDisplay] };
  Object.entries(POPS).forEach(([p, [b, fill]]) => {
    $('#' + p).addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return; if (fill) fill();
      const r = $('#' + b).getBoundingClientRect(), pop = $('#' + p);
      pop.style.top = (r.bottom + 10) + 'px';
      if (p === 'extrasPop') { pop.style.left = r.left + 'px'; pop.style.right = 'auto'; }
      else { pop.style.right = Math.max(10, innerWidth - r.right) + 'px'; pop.style.left = 'auto'; }
    });
  });
  $('#extrasPop').addEventListener('toggle', e => {
    if (e.newState !== 'open') return; const pop = $('#extrasPop');
    pop.style.left = Math.max(10, Math.min(parseFloat(pop.style.left) || 10, innerWidth - pop.offsetWidth - 10)) + 'px';
  });
  $('#rosterPop').addEventListener('beforetoggle', e => { if (e.newState === 'open') renderRoster(); });
  $('#rosterPop').addEventListener('toggle', e => { if (e.newState === 'open') { const tx = $('#rosterTx'); if (tx) tx.focus(); } });

  FP.on(e => {
    if (e.type === 'lesson') { refreshGames(); renderTop(); }
    if (e.type === 'nav') { renderCrumb(); renderActs(); renderDock(); renderFlow(); renderNotes(); renderGame(); broadcast(); }
    if (e.type === 'ink') { renderFab(); broadcast(); }
    if (e.type === 'inkmove') broadcastInk();
    if (e.type === 'key') {
      const k = e.key.toLowerCase();
      if (scene === 'pause' && !live) { if (k === 'b' || k === 'escape' || k === '.') setScene('pause'); return; }
      if (!$('#map').hidden) { if (k === 'escape' || k === 'm') openMap(false); return; }
      if (k === 'escape') {
        if (palOpen) setPal(false);
        else if (notesOpen || flowOpen) { notesOpen = flowOpen = false; renderFlow(); renderNotes(); renderDock(); }
        else if (scene !== 'lesson') setScene(scene === 'pause' ? 'pause' : 'lesson');
        return;
      }
      if (k === 'n') toggleSheet('notes');
      if (k === 'l') toggleSheet('flow');
      if (k === 'm') openMap(true);
      if (k === 'b' || k === '.') setScene('pause');
      if (k === 't') setScene(scene === 'timer' ? 'lesson' : 'timer');
      if (k === 'p') setScene(scene === 'pick' ? 'lesson' : 'pick');
      if (k === 'a') $('#extrasPop').togglePopover();
      if (k === 's') $('#sharePop').togglePopover();
      if (k === 'c') cycleTheme();
    }
  });
  setInterval(tickRing, 1000);
  setInterval(tick, 250);

  FP.mount($('#stage'), { storageKey: 'fprk-b', keepAwake: true, fresh: qs.has('fresh'), lesson: +qs.get('lesson') || 1, act: qs.get('act') || 'ls1', design: DESIGN });
  addLayers(); refreshGames();
  renderScenes(); renderActs(); renderFab(); renderShareBtn(); renderDock(); renderGame();
  new ResizeObserver(() => placeFab()).observe($('#stagewrap'));
  new ResizeObserver(() => { clearTimeout(fitT); fitT = setTimeout(fitTop, 60); }).observe($('.b-top'));
  if (document.fonts) document.fonts.ready.then(() => fitTop(true));
  placeFab();
  if (qs.get('scene')) setScene(qs.get('scene'));   // QA / deep link: ?scene=timer|pick|pause
})();
