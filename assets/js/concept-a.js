/* Concept A · Guide — three panes: lesson flow · content area · teacher guide */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const ic = (n, c) => FP.icon(n, c), esc = FP.esc;
  const app = $('#app');
  let guideTab = localStorage.getItem('fprk-a-tab') || 'script';
  let guideOpen = localStorage.getItem('fprk-a-guide') !== '0';

  /* ---------- top bar ---------- */
  function renderTop() {
    const L = FP.lesson();
    $('#lessonBtn').innerHTML = `<span class="a-unit">U${L.unit}<small>${esc(FP.unitTheme(L.unit))}</small></span><span class="a-lt" lang="en">${esc(L.key)}</span><span class="a-ltx"><b>Lesson ${L.n}</b><small>${esc(L.snd)} · ${esc((L.lab || '').split(' · ')[1] || L.ltr)}</small></span>${ic('chevron-down', 'a-chev')}`;
    $('#meta').innerHTML = `<span class="a-chip">${esc(L.day)}</span><span class="a-metatx">Introduce Sound-Spelling · <b>10 min</b></span>`;
    renderTimer();
  }
  function renderTimer() {
    const b = $('#timerBtn'), on = FP.timer.running();
    b.setAttribute('aria-pressed', on);
    b.title = on ? 'Pause class timer (double-click to reset)' : 'Start class timer';
    b.innerHTML = `${ic(on ? 'pause' : 'timer')}<span class="a-tnum">${FP.fmt(FP.timer.elapsed())}</span>`;
  }
  function renderLessonPop() {
    const L = FP.lesson(), D = FP.data;
    $('#lessonPop').innerHTML = `<div class="a-pophead"><h3>Choose a lesson</h3><span class="a-muted">From Phonics to Reading · Level K · 6 units · 30 lessons</span></div>
      <div class="a-units">${D.units.map(u => `<section class="a-ucol${u.n === L.unit ? ' is-on' : ''}"><h4><b>Unit ${u.n}</b>${esc(u.theme)}</h4>${u.lessons.map(n => { const d = D.lessons[n]; const lab = (d.lab || '').split(' · ');
        const lt = lab[0] || d.ltr;
        return `<button type="button" class="a-ltile${n === L.n ? ' is-on' : ''}" data-a="lesson" data-v="${n}"><span class="a-ltl${lt.length > 3 ? ' is-long' : ''}" lang="en">${esc(lt)}</span><span><b>Lesson ${n}</b><small lang="en">${esc(d.snd)}${lab[1] ? ' · ' + esc(lab[1]) : ''}</small></span></button>`; }).join('')}</section>`).join('')}</div>`;
  }
  function renderExtrasPop() {
    const cur = FP.extraInfo();
    $('#extrasPop').innerHTML = `<div class="a-pophead"><h3>Class activities</h3><span class="a-muted">Songs, movement, games and support — outside the lesson flow</span></div>
      <div class="a-xgrid">${FP.extras().map(g => `<section><h4>${ic(g.icon)}${esc(g.group)}</h4>${g.items.map(it => `<button type="button" class="a-xitem${it.soon ? ' is-soon' : ''}${cur && cur.id === it.id ? ' is-on' : ''}" data-a="extra" data-v="${it.id}"><span><b>${esc(it.label)}</b><small>${esc(it.sub)}</small></span>${it.soon ? '<em>Soon</em>' : ic('chevron-right')}</button>`).join('')}</section>`).join('')}</div>`;
  }

  /* ---------- sections ---------- */
  function renderSections() {
    $('#sections').innerHTML = `<ol id="secList">${FP.sections().map(s => `<li><button type="button" class="a-sec${s.on ? ' is-on' : ''}${s.built ? '' : ' is-soon'}" data-a="sec" data-v="${s.i}" aria-current="${s.on}"${s.built ? '' : ' title="Class content in production"'}><span class="a-secn">${s.i + 1}</span><span class="a-sectx"><b lang="en">${esc(s.name)}</b><small>SB ${esc(s.pages)}</small></span>${s.built ? '' : '<em>Soon</em>'}</button></li>`).join('')}</ol>
      <button type="button" class="a-secnav a-secnav--l" data-a="secscroll" data-v="-1" aria-label="Earlier sections" hidden>${ic('chevron-left')}</button><button type="button" class="a-secnav a-secnav--r" data-a="secscroll" data-v="1" aria-label="Later sections" hidden>${ic('chevron-right')}</button>`;
    const list = $('#secList'), on = list.querySelector('.a-sec.is-on');
    if (on) { const li = on.parentElement; list.scrollLeft = li.offsetLeft - (list.clientWidth - li.offsetWidth) / 2; }
    list.addEventListener('scroll', secFades, { passive: true }); secFades();
  }
  function secFades() {
    const n = $('#secList'); if (!n) return;
    const l = n.scrollLeft > 4, r = n.scrollLeft + n.clientWidth < n.scrollWidth - 4;
    n.classList.toggle('fade-l', l); n.classList.toggle('fade-r', r);
    $('.a-secnav--l').hidden = !l; $('.a-secnav--r').hidden = !r;
  }

  /* ---------- lesson flow ---------- */
  function renderFlow() {
    const st = FP.state(), flow = FP.flow(), cur = FP.cur(), extra = FP.mode() === 'extra', pr = FP.progress(), sec = FP.section();
    let h = `<div class="a-flowhead"><div><h2>Lesson flow</h2><p lang="en">${esc(sec.name)} · ${sec.built ? esc(FP.lesson().day) : 'SB ' + esc(sec.pages)}</p></div><span class="a-pct">${Math.round(pr.ratio * 100)}%</span></div>
      <div class="a-bar"><i style="width:${(pr.ratio * 100).toFixed(1)}%"></i></div><div class="a-flowlist">`;
    FP.groups().forEach(g => {
      const items = flow.filter(a => a.group === g.id); if (!items.length) return;
      h += `<div class="a-fgroup"><h3><b lang="en">${esc(g.label)}</b>${g.id === 'a1' ? `<span>SB p${FP.lesson().sb}</span>` : g.id === 'sec' ? `<span>SB ${esc(sec.pages)}</span>` : ''}</h3>`;
      items.forEach(a => {
        const on = !extra && a.id === st.act, done = !extra && a.index < cur.index;
        h += `<div class="a-fitem${on ? ' is-on' : ''}${done ? ' is-done' : ''}"><button type="button" class="a-frow" data-a="go" data-v="${a.id}" aria-current="${on}"><span class="a-node">${done ? ic('check') : ''}</span><span class="a-ftx"><small>${esc(a.kicker)}</small><b lang="en">${esc(a.title)}</b></span><span class="a-type a-type--${a.type}">${a.type === 'sb' ? 'SB' : a.type === 'home' ? 'Home' : 'Prep'}</span></button>`;
        if (on && a.steps.length > 1) h += `<ol class="a-steps">${a.steps.map((s, i) => `<li><button type="button" class="a-step${i === st.step ? ' is-on' : ''}${i < st.step ? ' is-done' : ''}" data-a="step" data-v="${i}"><span>${i + 1}</span><b lang="en">${esc(s)}</b></button></li>`).join('')}</ol>`;
        h += '</div>';
      });
      h += '</div>';
    });
    if (!sec.built) h += `<p class="a-flownote">${ic('sparkle')}<span>Class screens for this section are in production. The frame already supports them.</span></p>`;
    h += '</div>';
    $('#flow').innerHTML = h;
    const on = $('#flow .a-step.is-on') || $('#flow .a-fitem.is-on');
    if (on) { const list = $('#flow .a-flowlist'); const r = on.getBoundingClientRect(), lr = list.getBoundingClientRect(); if (r.top < lr.top || r.bottom > lr.bottom) list.scrollTop += r.top - lr.top - lr.height / 3; }
  }

  /* ---------- stage head ---------- */
  function renderHead() {
    const L = FP.lesson(), c = FP.context();
    if (c.mode === 'extra') {
      $('#stagehead').innerHTML = `<div class="a-sh"><small>${esc(c.kicker)}</small><h1>${esc(c.title)}</h1></div><div class="a-shr">${c.soon ? '<span class="a-tag a-tag--soon">In production</span>' : ''}<button type="button" class="a-btn" data-a="close">${ic('arrow-left')}<span>Back to the lesson</span></button></div>`; return;
    }
    const a = FP.cur(), sec = FP.section();
    const tag = a.type === 'sb' ? `<span class="a-tag a-tag--sb">${ic('book-open')}SB ${esc(a.page || 'p' + L.sb)}${sec.built ? ' · ' + esc(L.tgr || 'TG p' + L.sb) : ''}</span>${sec.built ? `<span class="a-tag">${ic('clock')}~5 min</span>` : ''}` : a.type === 'home' ? `<span class="a-tag">${ic('house')}Home practice preview</span>` : `<span class="a-tag">${ic('sparkle')}POLY prep · before the SB</span>`;
    const g = FP.groups().find(x => x.id === a.group) || {};
    const kick = sec.built ? `${esc(g.label)} <i>›</i> ${esc(a.kicker)}` : `${esc(sec.name)} <i>›</i> SB ${esc(sec.pages)}`;
    $('#stagehead').innerHTML = `<div class="a-sh"><small lang="en">${kick}</small><h1 lang="en">${esc(a.title)}</h1></div><div class="a-shr">${tag}</div>`;
  }

  /* ---------- control bar: board tools + step pager ---------- */
  function renderTools() {
    const k = FP.ink.state(), cur = k.on ? k.tool : 'select';
    const tool = (t, n, label) => `<button type="button" class="a-tool${cur === t ? ' is-on' : ''}" data-a="tool" data-v="${t}" title="${label}" aria-label="${label}" aria-pressed="${cur === t}">${ic(n)}</button>`;
    $('#tools').innerHTML = `${tool('select', 'pointer', 'Select — use the content')}${tool('pen', 'pen', 'Pen (D)')}${tool('hl', 'highlighter', 'Highlighter')}${tool('er', 'eraser', 'Eraser')}<span class="a-sep"></span>
      ${FP.inkColors.map(([c, n]) => `<button type="button" class="a-swatch${k.color === c ? ' is-on' : ''}" data-a="color" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="${k.color === c}"></button>`).join('')}<span class="a-sep"></span>
      ${[[3, 'Thin'], [6, 'Medium'], [12, 'Thick']].map(([w, n]) => `<button type="button" class="a-width${k.width === w ? ' is-on' : ''}" data-a="width" data-v="${w}" title="${n}" aria-label="${n} line"><i style="--w:${w}px"></i></button>`).join('')}<span class="a-sep"></span>
      <button type="button" class="a-tool" data-a="undo" title="Undo" aria-label="Undo" ${k.count ? '' : 'disabled'}>${ic('undo')}</button><button type="button" class="a-tool" data-a="clear" title="Clear drawing" aria-label="Clear drawing" ${k.count ? '' : 'disabled'}>${ic('trash')}</button>`;
  }
  function renderControl() {
    if (!$('#tools')) $('#control').innerHTML = '<div class="a-tools" id="tools" role="toolbar" aria-label="Board tools"></div><div class="a-pager" id="pager"></div>';
    renderTools();
    if (FP.mode() === 'extra') { $('#pager').innerHTML = `<button type="button" class="a-next" data-a="close">${ic('arrow-left')}<span><b>Back to the lesson</b><small lang="en">${esc(FP.cur().title)}</small></span></button>`; return; }
    const a = FP.cur(), st = FP.state(), nx = FP.peek(1), pv = FP.peek(-1);
    const nLabel = nx ? ({ step: 'Next step', activity: 'Next activity', section: 'Next section' }[nx.kind]) : 'End of lesson';
    $('#pager').innerHTML = `<div class="a-stepinfo">${a.steps.length > 1 ? `<b>Step ${st.step + 1}</b><span>of ${a.steps.length}</span>` : `<b>${a.index + 1} / ${FP.flow().length}</b><span>activities</span>`}</div>
      <button type="button" class="a-prev" data-a="prev" ${pv ? '' : 'disabled'} aria-label="Previous" title="Previous (←)">${ic('chevron-left')}</button>
      <button type="button" class="a-next" data-a="next" ${nx ? '' : 'disabled'} title="Next (→)"><span><b>${nLabel}</b><small lang="en">${nx ? esc(nx.label) : 'Lesson complete'}</small></span>${ic('arrow-right')}</button>`;
  }

  /* ---------- teacher guide ---------- */
  function renderGuide() {
    app.classList.toggle('guide-closed', !guideOpen);
    if (!guideOpen) return;
    const tabs = [['script', 'Script'], ['plan', 'Plan'], ['support', 'Korean learners']];
    const body = guideTab === 'plan' ? planTab() : guideTab === 'support' ? supportTab() : scriptTab();
    $('#guide').innerHTML = `<div class="a-ghead"><h2>Teacher guide</h2><button type="button" class="a-btn a-btn--icon" data-a="guide" aria-label="Hide teacher guide (G)" title="Hide (G)">${ic('panel-right')}</button></div>
      <div class="a-gtabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" aria-selected="${guideTab === k}" data-a="gtab" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="a-gbody">${body}</div>`;
  }
  function scriptTab() {
    const g = FP.guide(), st = FP.state();
    if (g.mode === 'extra') return `<div class="a-gempty">${ic('presentation')}<p><b>${esc(g.title)}</b><br>${esc(g.goal)}</p><button type="button" class="a-btn" data-a="close">${ic('arrow-left')}<span>Back to the lesson</span></button></div>`;
    const c = g.cur; if (!c) return '';
    let h = `<p class="a-goal"><b>Goal</b>${esc(g.goal)}</p>
      <article class="a-now"><div class="a-nowhead"><span class="a-pill">${g.steps.length > 1 ? `Step ${st.step + 1} of ${g.steps.length}` : esc(g.kicker)}</span><h3 lang="en">${esc(c.title)}</h3></div>
        ${c.say ? `<div class="a-say"><span class="a-lab">${ic('message-circle')}Say</span><p lang="en">“${FP.hlSay(c.say)}”</p></div>` : ''}
        <div class="a-do"><span class="a-lab">${ic('hand')}Do</span><p>${esc(c.do)}</p></div>
        ${c.kids ? `<div class="a-do"><span class="a-lab">${ic('users')}Kids</span><p>${esc(c.kids)}</p></div>` : ''}
        ${c.tg ? `<blockquote class="a-tgq"><span>From the TG · ${esc(FP.lesson().tgr || 'TG')}</span><p lang="en">${esc(c.tg)}</p></blockquote>` : ''}</article>`;
    if (g.pending) h += `<p class="a-note">${ic('sparkle')}<span>Step-by-step script arrives with this section’s content. Until then, follow the printed TG.</span></p>`;
    if (g.words && g.words.length) h += `<div class="a-words"><span class="a-lab2">Words in this activity</span><div>${g.words.map(w => `<button type="button" data-a="say" data-v="${esc(w)}" lang="en">${esc(w)}</button>`).join('')}</div></div>`;
    if (g.answer) h += `<div class="a-answer"><span class="a-lab">${ic('circle-check')}Answer key</span><p><b>Yes:</b> ${g.answer.yes.map(esc).join(' · ')}</p><p><b>No:</b> ${g.answer.no.map(esc).join(' · ')}</p></div>`;
    if (g.steps.length > 1) h += `<h4 class="a-gh">All steps</h4><ol class="a-glist">${g.steps.map((s, i) => `<li><button type="button" class="${i === st.step ? 'is-on' : ''}${i < st.step ? ' is-done' : ''}" data-a="step" data-v="${i}"><span>${i < st.step ? ic('check') : i + 1}</span><span><b lang="en">${esc(s.title)}</b>${i === st.step || !s.say ? '' : `<small lang="en">“${esc(s.say)}”</small>`}</span></button></li>`).join('')}</ol>`;
    if (g.extra) h += `<div class="a-support"><span class="a-lab">${ic('lightbulb')}${esc(g.extra.title)}</span><p lang="en">“${FP.hlSay(g.extra.say)}”</p><small>${esc(g.extra.tg)}</small></div>`;
    if (g.note) h += `<p class="a-note">${ic('lightbulb')}<span>${esc(g.note)}</span></p>`;
    return h;
  }
  function planTab() {
    const p = FP.plan();
    const card = (x, i) => `<article class="a-pcard"><h4><span>${i}</span><b lang="en">${esc(x.title)}</b></h4><p class="a-pgoal">${esc(x.goal)}</p>${x.can && x.can.length ? `<p class="a-lab2">Kids can…</p><ul>${x.can.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}${x.tg ? `<p class="a-ptg"><b>TG objective</b> <span lang="en">${esc(x.tg)}</span></p>` : ''}</article>`;
    return `<div class="a-pblock"><p class="a-lab2">Today · ${esc(p.day)}</p><ol class="a-dayflow">${p.flow.map(f => `<li${/Sound-Spelling/.test(f) ? ' class="is-on"' : ''}>${esc(f)}</li>`).join('')}</ol></div>
      <div class="a-pblock"><p class="a-lab2">Materials</p><p>${esc(p.materials)}</p></div>
      ${card(p.a1, 1)}${card(p.a2, 2)}
      <p class="a-note">${ic('clock')}<span>The TG gives 10 minutes for both activities together; about 5 minutes each is a suggestion.</span></p>`;
  }
  function supportTab() {
    const t = FP.guide().tip;
    return `<article class="a-tip"><span class="a-lab">${ic('message-circle')}Pronunciation tip</span><p class="a-tiptx">${esc(t.text)}</p></article>
      ${t.pairs.length ? `<div class="a-pblock"><p class="a-lab2">Which sound? · tap to hear</p><div class="a-pairs">${t.pairs.map(p => `<div><button type="button" data-a="say" data-v="${esc(p[0])}" lang="en">${esc(p[0])}</button><i>vs</i><button type="button" data-a="say" data-v="${esc(p[1])}" lang="en">${esc(p[1])}</button></div>`).join('')}</div></div>` : ''}
      ${t.tg ? `<blockquote class="a-tgq"><span>TG · English Learners</span><p lang="en">${esc(t.tg)}</p></blockquote>` : ''}
      ${t.voc ? `<blockquote class="a-tgq"><span>TG · Vocabulary</span><p lang="en">${esc(t.voc)}</p></blockquote>` : ''}
      <div class="a-pblock"><p class="a-lab2">Corrective feedback</p><ol class="a-fbk"><li><b lang="en">My turn.</b> Say the correct sound.</li><li><b lang="en">What’s the sound?</b> Tap under the letter; kids answer together.</li><li><b lang="en">Let’s start over.</b> Blend the word again from the start.</li></ol></div>
      <button type="button" class="a-btn a-btn--wide" data-a="extra" data-v="x-efl">${ic('presentation')}<span>Show support activities on the board</span></button>`;
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
    const a = t.dataset.a, v = t.dataset.v;
    switch (a) {
      case 'go': FP.go(v, 0); break;
      case 'step': FP.setStep(+v); break;
      case 'next': FP.next(); break;
      case 'prev': FP.prev(); break;
      case 'sec': FP.setSection(+v); break;
      case 'secscroll': { const n = $('#secList'); n.scrollBy({ left: +v * n.clientWidth * 0.6, behavior: 'smooth' }); break; }
      case 'lesson': FP.setLesson(+v); $('#lessonPop').hidePopover(); break;
      case 'extra': FP.openExtra(v); if ($('#extrasPop').matches(':popover-open')) $('#extrasPop').hidePopover(); break;
      case 'close': FP.closeExtra(); break;
      case 'tool': FP.ink.set({ tool: v }); break;
      case 'color': FP.ink.set({ color: v }); break;
      case 'width': FP.ink.set({ width: +v }); break;
      case 'undo': FP.ink.undo(); break;
      case 'clear': FP.ink.clear(); break;
      case 'guide': setGuide(!guideOpen); break;
      case 'gtab': guideTab = v; localStorage.setItem('fprk-a-tab', v); renderGuide(); break;
      case 'say': FP.speak(v); break;
    }
  });
  function setGuide(open) { guideOpen = open; localStorage.setItem('fprk-a-guide', open ? '1' : '0'); renderGuide(); }
  $('#guideTab').addEventListener('click', () => setGuide(true));
  $('#timerBtn').addEventListener('click', () => FP.timer.toggle());
  $('#timerBtn').addEventListener('dblclick', () => FP.timer.reset());
  $('#fsBtn').addEventListener('click', () => FP.fullscreen());
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').innerHTML = ic(document.fullscreenElement ? 'minimize' : 'maximize'); });
  [['lessonPop', 'lessonBtn', 'left'], ['extrasPop', 'extrasBtn', 'right'], ['helpPop', 'helpBtn', 'right']].forEach(([p, b, side]) => {
    const pop = $('#' + p);
    pop.addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return;
      if (p === 'extrasPop') renderExtrasPop();
      const r = $('#' + b).getBoundingClientRect();
      pop.style.top = (r.bottom + 8) + 'px';
      if (side === 'left') { pop.style.left = Math.max(8, r.left) + 'px'; pop.style.right = 'auto'; } else { pop.style.right = Math.max(8, innerWidth - r.right) + 'px'; pop.style.left = 'auto'; }
    });
  });

  addEventListener('resize', secFades);
  FP.on(e => {
    if (e.type === 'lesson') { renderTop(); renderLessonPop(); }
    if (e.type === 'nav') { renderSections(); renderFlow(); renderHead(); renderControl(); renderGuide(); }
    if (e.type === 'ink') renderTools();
    if (e.type === 'timer') renderTimer();
    if (e.type === 'key' && (e.key === 'g' || e.key === 'G')) setGuide(!guideOpen);
  });
  setInterval(() => { if (FP.timer.running()) renderTimer(); }, 1000);

  const qs = new URLSearchParams(location.search);
  FP.mount($('#stage'), { storageKey: 'fprk-a', keepAwake: true, fresh: qs.has('fresh'), lesson: +qs.get('lesson') || 1, act: qs.get('act') || 'ls1' });
})();
