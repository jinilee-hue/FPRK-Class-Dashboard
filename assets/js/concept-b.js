/* Concept B · Stage — presenter shell for the classroom e-board.
   Full content area, controls at the bottom within reach, lesson map overlay, clicker-friendly. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const ic = (n, c) => FP.icon(n, c), esc = FP.esc;
  let notesOpen = false, flowOpen = false, notesTab = 'plan', mapPick = null;
  const root = document.documentElement;
  const THEMES = ['dark', 'mint', 'yellow'];
  function setTheme(t) {
    if (!THEMES.includes(t)) t = 'dark';
    root.dataset.theme = t; root.dataset.tone = t === 'dark' ? 'dark' : 'bright';
    try { localStorage.setItem('fprk-b-theme', t); } catch (e) { /* private mode */ }
    renderThemes();
  }
  function cycleTheme() { setTheme(THEMES[(THEMES.indexOf(root.dataset.theme) + 1) % THEMES.length]); }
  function renderThemes() { document.querySelectorAll('#themes [data-v]').forEach(b => b.setAttribute('aria-checked', b.dataset.v === root.dataset.theme)); }

  /* ---------- top ---------- */
  function renderTop() {
    const L = FP.lesson();
    $('#lessonBtn').innerHTML = `<span class="b-lt" lang="en">${esc(L.key)}</span><span class="b-ltx"><b>Lesson ${L.n} <i lang="en">${esc(L.snd)}</i></b><small>Unit ${L.unit} · ${esc(FP.unitTheme(L.unit))} · ${esc(L.day)}</small></span>${ic('chevron-down')}`;
    $('#pages').innerHTML = `<button type="button" data-b="page" data-v="sb" title="Student Book page">${ic('book-open')}<span>SB p${L.sb}</span></button><button type="button" data-b="page" data-v="tg" title="Teacher’s Guide page">${ic('file-text')}<span>TG p${L.sb}</span></button><button type="button" data-b="page" data-v="both" title="Side by side" aria-label="SB and TG side by side">${ic('columns')}</button>`;
  }
  function renderCrumb() {
    const c = FP.context(), sec = FP.section();
    if (c.mode === 'extra') { $('#crumb').innerHTML = `<span>Class activity</span>${ic('chevron-right')}<b>${esc(c.title)}</b>`; return; }
    const a = FP.cur(), g = FP.groups().find(x => x.id === a.group) || {};
    const gl = (g.label || '').replace(/^\d+\s*·\s*/, ''), showG = sec.built && gl && gl !== a.title;
    $('#crumb').innerHTML = `<button type="button" data-b="sections" title="Sections">${esc(sec.name)}${ic('chevron-down')}</button>${showG ? `${ic('chevron-right')}<span lang="en">${esc(g.label)}</span>` : ''}${ic('chevron-right')}<b lang="en">${esc(a.title)}</b>`;
  }

  /* ---------- board tools rail ---------- */
  function renderRail() {
    const k = FP.ink.state(), cur = k.on ? k.tool : 'select';
    const t = (id, n, l) => `<button type="button" class="b-tool${cur === id ? ' is-on' : ''}" data-b="tool" data-v="${id}" title="${l}" aria-label="${l}" aria-pressed="${cur === id}">${ic(n)}</button>`;
    $('#rail').innerHTML = `<div class="b-railgrp">${t('select', 'pointer', 'Select — use the content')}${t('pen', 'pen', 'Pen (D)')}${t('hl', 'highlighter', 'Highlighter')}${t('er', 'eraser', 'Eraser')}</div>
      <div class="b-railgrp b-railgrp--sw">${FP.inkColors.map(([c, n]) => `<button type="button" class="b-sw${k.color === c ? ' is-on' : ''}" data-b="color" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="${k.color === c}"></button>`).join('')}</div>
      <div class="b-railgrp">${[[3, 'Thin'], [6, 'Medium'], [12, 'Thick']].map(([w, n]) => `<button type="button" class="b-wd${k.width === w ? ' is-on' : ''}" data-b="width" data-v="${w}" title="${n} line" aria-label="${n} line"><i style="--w:${w}px"></i></button>`).join('')}</div>
      <div class="b-railgrp b-railgrp--end"><button type="button" class="b-tool" data-b="undo" title="Undo" aria-label="Undo" ${k.count ? '' : 'disabled'}>${ic('undo')}</button><button type="button" class="b-tool" data-b="clear" title="Clear drawing" aria-label="Clear drawing" ${k.count ? '' : 'disabled'}>${ic('trash')}</button></div>`;
  }

  /* ---------- dock ---------- */
  const R = 25, C = 2 * Math.PI * R;
  function renderDock() {
    const extra = FP.mode() === 'extra', flow = FP.flow(), cur = FP.cur(), st = FP.state();
    const segs = flow.map(a => { const fill = extra ? 0 : a.index < cur.index ? 1 : a.index === cur.index ? (st.step + 1) / a.steps.length : 0;
      return `<button type="button" class="b-segm${a.index === cur.index && !extra ? ' is-on' : ''}" style="flex:${a.steps.length}" data-b="go" data-v="${a.id}" title="${esc(a.title)}" aria-label="${esc(a.title)}"><i style="width:${(fill * 100).toFixed(1)}%"></i></button>`; }).join('');
    let left, mid, right;
    if (extra) {
      const it = FP.extraInfo();
      left = `<div class="b-now"><div class="b-ring b-ring--icon">${ic(it.icon)}</div><div class="b-nowtx"><small>Class activity · ${esc(it.group)}</small><b>${esc(it.label)}</b><span>${esc(it.sub)}</span></div></div>`;
      mid = `<div class="b-say b-say--quiet"><p>${it.soon ? 'This activity is in production — the content area is ready for it.' : 'Run the activity, then go back to where you left the lesson.'}</p></div>`;
      right = `<button type="button" class="b-next" data-b="close"><span><b>Back to lesson</b><small lang="en">${esc(cur.title)}</small></span>${ic('arrow-left')}</button>`;
    } else {
      const g = FP.guide(), c = g.cur || {}, nx = FP.peek(1), pv = FP.peek(-1), grp = FP.groups().find(x => x.id === cur.group) || {};
      left = `<div class="b-now"><div class="b-ring" id="ring" title="Time in this activity"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${R}" class="b-ring-bg"/><circle cx="30" cy="30" r="${R}" class="b-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><span id="ringTx">0:00</span></div>
        <div class="b-nowtx"><small lang="en">${esc(grp.label || '')}${grp.label ? ' · ' : ''}${esc(cur.kicker)}</small><b lang="en">${esc(cur.title)}</b><span lang="en">${cur.steps.length > 1 ? `Step ${st.step + 1} of ${cur.steps.length} · ${esc(cur.steps[st.step])}` : (cur.type === 'sb' ? 'SB ' + esc(cur.page || '') : cur.type === 'home' ? 'Home practice preview' : 'POLY prep · before the SB')}</span></div></div>`;
      mid = c.say ? `<div class="b-say"><span class="b-lab">Say</span><p lang="en">“${FP.hlSay(c.say)}”</p><span class="b-do"><b>Do</b> ${esc(c.do)}</span></div>` : `<div class="b-say"><span class="b-lab">Do</span><p class="b-p-do">${esc(c.do || '')}</p></div>`;
      const nl = nx ? ({ step: 'Next', activity: 'Next activity', section: 'Next section' }[nx.kind]) : 'Finished';
      right = `<button type="button" class="b-prev" data-b="prev" ${pv ? '' : 'disabled'} aria-label="Back" title="Back (←)">${ic('chevron-left')}</button><button type="button" class="b-next" data-b="next" ${nx ? '' : 'disabled'} title="Next (→ / Space)"><span><b>${nl}</b><small lang="en">${nx ? esc(nx.label) : 'End of lesson'}</small></span>${ic('arrow-right')}</button>`;
    }
    $('#dock').innerHTML = `<div class="b-segs" role="group" aria-label="Progress">${segs}</div>
      <div class="b-dockrow">${left}${mid}<div class="b-dright"><div class="b-toggles"><button type="button" class="b-tg${notesOpen ? ' is-on' : ''}" data-b="notes" aria-pressed="${notesOpen}" title="Teacher notes (N)">${ic('notebook-pen')}<span>Notes</span></button><button type="button" class="b-tg${flowOpen ? ' is-on' : ''}" data-b="flow" aria-pressed="${flowOpen}" title="Run of show (L)">${ic('list')}<span>Flow</span></button></div>${right}</div></div>`;
    tickRing();
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

  /* ---------- run of show ---------- */
  function renderFlow() {
    const el = $('#flowStrip'); el.hidden = !flowOpen; if (!flowOpen) return;
    const flow = FP.flow(), cur = FP.cur(), st = FP.state(), extra = FP.mode() === 'extra';
    el.innerHTML = `<div class="b-sheethead"><h3>Run of show <span lang="en">${esc(FP.section().name)}</span></h3><button type="button" class="b-x" data-b="flow" aria-label="Close run of show">${ic('x')}</button></div>
      <div class="b-cards">${FP.groups().map(g => { const items = flow.filter(a => a.group === g.id); return items.length ? `<div class="b-cgroup"><p lang="en">${esc(g.label)}</p><div>${items.map(a => { const on = !extra && a.id === cur.id, done = !extra && a.index < cur.index;
        return `<button type="button" class="b-card${on ? ' is-on' : ''}${done ? ' is-done' : ''}" data-b="go" data-v="${a.id}"><small>${esc(a.kicker)}</small><b lang="en">${esc(a.title)}</b><span class="b-cmeta"><em class="b-type b-type--${a.type}">${a.type === 'sb' ? 'SB' : a.type === 'home' ? 'Home' : 'Prep'}</em>${a.steps.length > 1 ? `<span class="b-dots">${a.steps.map((_, i) => `<i class="${on && i === st.step ? 'is-on' : (done || (on && i < st.step)) ? 'is-done' : ''}"></i>`).join('')}</span>` : ''}</span></button>`; }).join('')}</div></div>` : ''; }).join('')}</div>`;
    const on = el.querySelector('.b-card.is-on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ---------- teacher notes ---------- */
  function renderNotes() {
    const el = $('#notes'); el.hidden = !notesOpen; if (!notesOpen) return;
    const g = FP.guide(), st = FP.state();
    let left = '';
    if (g.mode === 'extra') left = `<p class="b-goal">${esc(g.goal)}</p>`;
    else {
      left = `<p class="b-goal"><b>Goal</b> ${esc(g.goal)}</p><ol class="b-steps">${g.steps.map((s, i) => { const on = i === st.step;
        return `<li class="${on ? 'is-on' : ''}${i < st.step ? ' is-done' : ''}"><button type="button" data-b="step" data-v="${i}"><span>${i < st.step ? ic('check') : i + 1}</span><b lang="en">${esc(s.title)}</b></button>${on ? `<div class="b-stepbody">${s.say ? `<p class="b-sayl" lang="en">“${FP.hlSay(s.say)}”</p>` : ''}<p><b>Do</b> ${esc(s.do)}</p>${s.kids ? `<p><b>Kids</b> ${esc(s.kids)}</p>` : ''}${s.tg ? `<p class="b-tgq"><b>TG</b> <span lang="en">${esc(s.tg)}</span></p>` : ''}</div>` : ''}</li>`; }).join('')}</ol>`;
      if (g.words && g.words.length) left += `<div class="b-words"><b>Words</b>${g.words.map(w => `<button type="button" data-b="say" data-v="${esc(w)}" lang="en">${esc(w)}</button>`).join('')}</div>`;
      if (g.answer) left += `<p class="b-answer"><b>Answer key</b> Yes: ${g.answer.yes.map(esc).join(' · ')} &nbsp;·&nbsp; No: ${g.answer.no.map(esc).join(' · ')}</p>`;
      if (g.pending) left += `<p class="b-muted">${ic('sparkle')} The step-by-step script arrives with this section’s content.</p>`;
    }
    const p = FP.plan(), t = g.tip;
    const right = notesTab === 'plan'
      ? `<p class="b-lab2">Today · ${esc(p.day)}</p><ol class="b-day">${p.flow.map(f => `<li${/Sound-Spelling/.test(f) ? ' class="is-on"' : ''}>${esc(f)}</li>`).join('')}</ol>
         <p class="b-lab2">Materials</p><p>${esc(p.materials)}</p>
         ${[p.a1, p.a2].map((x, i) => `<div class="b-pcard"><b lang="en">${i + 1} · ${esc(x.title)}</b><p>${esc(x.goal)}</p>${x.tg ? `<small>TG objective · <span lang="en">${esc(x.tg)}</span></small>` : ''}</div>`).join('')}`
      : `<p class="b-tip">${esc(t.text)}</p>${t.pairs.length ? `<div class="b-pairs">${t.pairs.map(q => `<span><button type="button" data-b="say" data-v="${esc(q[0])}" lang="en">${esc(q[0])}</button><i>vs</i><button type="button" data-b="say" data-v="${esc(q[1])}" lang="en">${esc(q[1])}</button></span>`).join('')}</div>` : ''}
         ${t.tg ? `<p class="b-tgq"><b>TG · English Learners</b> <span lang="en">${esc(t.tg)}</span></p>` : ''}
         <p class="b-lab2">Corrective feedback</p><p><b lang="en">My turn.</b> → <b lang="en">What’s the sound?</b> → <b lang="en">Let’s start over.</b></p>`;
    el.innerHTML = `<div class="b-sheethead"><h3>Teacher notes <span lang="en">${esc(g.title)}</span></h3><button type="button" class="b-x" data-b="notes" aria-label="Close notes">${ic('x')}</button></div>
      <div class="b-notesgrid"><div class="b-ncol">${left}</div><div class="b-ncol b-ncol--side"><div class="b-tabs" role="tablist"><button type="button" role="tab" aria-selected="${notesTab === 'plan'}" data-b="ntab" data-v="plan">Plan</button><button type="button" role="tab" aria-selected="${notesTab === 'support'}" data-b="ntab" data-v="support">Korean learners</button></div>${right}</div></div>`;
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

  /* ---------- pause screen ---------- */
  function pause(on) {
    const p = $('#pause');
    if (on) { const L = FP.lesson(); p.innerHTML = `<div class="b-pausein"><span class="b-pausel" lang="en">${esc(L.key)}</span><p lang="en">Eyes on me!</p><small>Tap anywhere or press B to go back</small></div>`; p.hidden = false; }
    else p.hidden = true;
  }

  /* ---------- extras popover ---------- */
  function renderExtras() {
    const cur = FP.extraInfo();
    $('#extrasPop').innerHTML = `<div class="b-pophead"><h3>Class activities</h3><p>Outside the lesson flow — the lesson waits where you left it.</p></div><div class="b-xgrid">${FP.extras().map(g => `<section><h4>${ic(g.icon)}${esc(g.group)}</h4>${g.items.map(it => `<button type="button" class="b-xi${it.soon ? ' is-soon' : ''}${cur && cur.id === it.id ? ' is-on' : ''}" data-b="extra" data-v="${it.id}"><b>${esc(it.label)}</b><small>${esc(it.sub)}</small>${it.soon ? '<em>Soon</em>' : ''}</button>`).join('')}</section>`).join('')}</div>`;
  }

  /* ---------- sections popover (from breadcrumb) ---------- */
  function sectionsMenu(btn) {
    let m = $('#secMenu'); if (!m) { m = document.createElement('div'); m.id = 'secMenu'; m.className = 'b-pop b-pop--secs'; m.popover = 'auto'; document.body.appendChild(m); }
    m.innerHTML = `<p class="b-lab2">Lesson ${FP.lesson().n} sections</p>${FP.sections().map(s => `<button type="button" class="b-secitem${s.on ? ' is-on' : ''}" data-b="sec" data-v="${s.i}"><span>${s.i + 1}</span><b lang="en">${esc(s.name)}</b><small>SB ${esc(s.pages)}</small>${s.built ? '<em class="is-ready">Ready</em>' : '<em>Soon</em>'}</button>`).join('')}`;
    const r = btn.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 8) + 'px';
    m.showPopover();
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
      case 'page': FP.viewer.page(v); break;
      case 'tool': FP.ink.set({ tool: v }); break;
      case 'color': FP.ink.set({ color: v }); break;
      case 'width': FP.ink.set({ width: +v }); break;
      case 'undo': FP.ink.undo(); break;
      case 'clear': FP.ink.clear(); break;
      case 'notes': notesOpen = !notesOpen; if (notesOpen) flowOpen = false; renderSheets(); break;
      case 'flow': flowOpen = !flowOpen; if (flowOpen) notesOpen = false; renderSheets(); break;
      case 'ntab': notesTab = v; renderNotes(); break;
      case 'say': FP.speak(v); break;
      case 'extra': FP.openExtra(v); if ($('#extrasPop').matches(':popover-open')) $('#extrasPop').hidePopover(); break;
      case 'sections': sectionsMenu(t); break;
      case 'sec': FP.setSection(+v); const sm = $('#secMenu'); if (sm && sm.matches(':popover-open')) sm.hidePopover(); break;
      case 'mappick': mapPick = +v; renderMap(); break;
      case 'mapsec': if (mapPick !== FP.lesson().n) FP.setLesson(mapPick); FP.setSection(+v); openMap(false); break;
      case 'mapopen': if (mapPick !== FP.lesson().n) FP.setLesson(mapPick); openMap(false); break;
      case 'mapclose': openMap(false); break;
      case 'theme': setTheme(v); break;
    }
  });
  function renderSheets() { renderFlow(); renderNotes(); renderDock(); }
  $('#lessonBtn').addEventListener('click', () => openMap(true));
  $('#pauseBtn').addEventListener('click', () => pause(true));
  $('#pause').addEventListener('click', () => pause(false));
  $('#fsBtn').addEventListener('click', () => FP.fullscreen());
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').innerHTML = ic(document.fullscreenElement ? 'minimize' : 'maximize'); });
  [['extrasPop', 'extrasBtn'], ['helpPop', 'helpBtn']].forEach(([p, b]) => {
    $('#' + p).addEventListener('beforetoggle', e => { if (e.newState !== 'open') return; if (p === 'extrasPop') renderExtras(); const r = $('#' + b).getBoundingClientRect(); const pop = $('#' + p); pop.style.top = (r.bottom + 10) + 'px'; pop.style.right = Math.max(10, innerWidth - r.right) + 'px'; pop.style.left = 'auto'; });
  });

  FP.on(e => {
    if (e.type === 'lesson') renderTop();
    if (e.type === 'nav') { renderCrumb(); renderDock(); renderFlow(); renderNotes(); }
    if (e.type === 'ink') renderRail();
    if (e.type === 'key') {
      const k = e.key.toLowerCase();
      if (!$('#pause').hidden) { if (k === 'b' || k === 'escape' || k === '.') pause(false); return; }
      if (!$('#map').hidden) { if (k === 'escape' || k === 'm') openMap(false); return; }
      if (k === 'escape') { if (notesOpen || flowOpen) { notesOpen = flowOpen = false; renderSheets(); } return; }
      if (k === 'n') { notesOpen = !notesOpen; if (notesOpen) flowOpen = false; renderSheets(); }
      if (k === 'l') { flowOpen = !flowOpen; if (flowOpen) notesOpen = false; renderSheets(); }
      if (k === 'm') openMap(true);
      if (k === 'b' || k === '.') pause(true);
      if (k === 'a') $('#extrasPop').togglePopover();
      if (k === 't') cycleTheme();
    }
  });
  setInterval(tickRing, 1000);

  const qs = new URLSearchParams(location.search);
  FP.mount($('#stage'), { storageKey: 'fprk-b', keepAwake: true, fresh: qs.has('fresh'), lesson: +qs.get('lesson') || 1, act: qs.get('act') || 'ls1' });
  renderRail();
  renderThemes();
})();
