/* Concept C · Script — the lesson script is the navigation. Board on the left, teleprompter on the right. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const ic = (n, c) => FP.icon(n, c), esc = FP.esc;
  const app = $('#app');
  let scriptOpen = localStorage.getItem('fprk-c-script') !== '0';
  const TYPE = { prep: 'POLY prep', sb: 'Student Book', home: 'Home practice' };

  /* ---------- top ---------- */
  function renderTop() {
    const L = FP.lesson();
    $('#lessonBtn').innerHTML = `<span class="c-lt" lang="en">${esc(L.key)}</span><span class="c-ltx"><b>Lesson ${L.n} <i lang="en">${esc(L.snd)}</i></b><small>Unit ${L.unit} · ${esc(FP.unitTheme(L.unit))} · ${esc(L.day)}</small></span>${ic('chevron-down')}`;
    $('#pages').innerHTML = `<button type="button" data-c="page" data-v="sb">${ic('book-open')}<span>SB p${L.sb}</span></button><button type="button" data-c="page" data-v="tg">${ic('file-text')}<span>TG p${L.sb}</span></button><button type="button" data-c="page" data-v="both" title="SB + TG side by side" aria-label="SB and TG side by side">${ic('columns')}</button>`;
    renderTimer();
  }
  function renderTimer() {
    const b = $('#timerBtn'), on = FP.timer.running();
    b.setAttribute('aria-pressed', on); b.title = on ? 'Pause class timer (double-click to reset)' : 'Start class timer';
    b.innerHTML = `${ic(on ? 'pause' : 'timer')}<span>${FP.fmt(FP.timer.elapsed())}</span>`;
  }
  function renderToc() {
    const D = FP.data, L = FP.lesson();
    $('#lessonPop').innerHTML = `<div class="c-pophead"><h3>Contents</h3><p>From Phonics to Reading · Level K</p></div><div class="c-toc">${D.units.map(u => `<section${u.n === L.unit ? ' class="is-on"' : ''}><h4><span>Unit ${u.n}</span>${esc(u.theme)}</h4><ol>${u.lessons.map(n => { const d = D.lessons[n], lb = (d.lab || '').split(' · ');
      const lt = lb[0] || d.ltr;
      return `<li><button type="button" class="${n === L.n ? 'is-on' : ''}" data-c="lesson" data-v="${n}"><span class="c-tn">${n}</span><b lang="en"${lt.length > 3 ? ' class="is-long"' : ''}>${esc(lt)}</b><small lang="en">${esc(d.snd)}${lb[1] ? ' · ' + esc(lb[1]) : ''}</small></button></li>`; }).join('')}</ol></section>`).join('')}</div>`;
  }
  function renderExtras() {
    const cur = FP.extraInfo();
    $('#extrasPop').innerHTML = `<div class="c-pophead"><h3>Class activities</h3><p>Step outside the script — it keeps your place.</p></div><div class="c-xlist">${FP.extras().map(g => `<section><h4>${ic(g.icon)}${esc(g.group)}</h4>${g.items.map(it => `<button type="button" class="${it.soon ? 'is-soon' : ''}${cur && cur.id === it.id ? ' is-on' : ''}" data-c="extra" data-v="${it.id}"><b>${esc(it.label)}</b><small>${esc(it.sub)}</small>${it.soon ? '<em>Soon</em>' : ''}</button>`).join('')}</section>`).join('')}</div>`;
  }

  /* ---------- board ---------- */
  function renderBoardHead() {
    const c = FP.context();
    let h;
    if (c.mode === 'extra') h = `<div class="c-bh"><span class="c-bk">Class activity</span><b>${esc(c.title)}</b></div><button type="button" class="c-btn" data-c="close">${ic('arrow-left')}<span>Back to the script</span></button>`;
    else {
      const a = FP.cur(), st = FP.state(), g = FP.guide();
      const say = !scriptOpen && g.cur && g.cur.say ? `<p class="c-bsay" lang="en">“${FP.hlSay(g.cur.say)}”</p>` : '';
      h = `<div class="c-bh"><span class="c-bk">${esc(TYPE[a.type] || '')}</span><b lang="en">${esc(a.title)}</b>${a.steps.length > 1 ? `<span class="c-bstep">Step ${st.step + 1} / ${a.steps.length}</span>` : ''}</div>${say}`;
    }
    $('#boardhead').innerHTML = h;
  }
  function renderTools() {
    const k = FP.ink.state(), cur = k.on ? k.tool : 'select';
    const t = (id, n, l) => `<button type="button" class="c-tool${cur === id ? ' is-on' : ''}" data-c="tool" data-v="${id}" title="${l}" aria-label="${l}" aria-pressed="${cur === id}">${ic(n)}</button>`;
    $('#tools').innerHTML = `<div class="c-tgrp">${t('select', 'pointer', 'Select — use the content')}${t('pen', 'pen', 'Pen (D)')}${t('hl', 'highlighter', 'Highlighter')}${t('er', 'eraser', 'Eraser')}</div>
      <div class="c-tgrp">${FP.inkColors.map(([c, n]) => `<button type="button" class="c-sw${k.color === c ? ' is-on' : ''}" data-c="color" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="${k.color === c}"></button>`).join('')}</div>
      <div class="c-tgrp">${[[3, 'Thin'], [6, 'Medium'], [12, 'Thick']].map(([w, n]) => `<button type="button" class="c-wd${k.width === w ? ' is-on' : ''}" data-c="width" data-v="${w}" title="${n} line" aria-label="${n} line"><i style="--w:${w}px"></i></button>`).join('')}</div>
      <div class="c-tgrp"><button type="button" class="c-tool" data-c="undo" title="Undo" aria-label="Undo" ${k.count ? '' : 'disabled'}>${ic('undo')}</button><button type="button" class="c-tool" data-c="clear" title="Clear drawing" aria-label="Clear drawing" ${k.count ? '' : 'disabled'}>${ic('trash')}</button></div>`;
  }

  /* ---------- script ---------- */
  function renderHead() {
    const secs = FP.sections();
    $('#shead').innerHTML = `<div class="c-shtop"><h2>Lesson script</h2><span>${esc(FP.lesson().meta.split(' · ').slice(0, 3).join(' · '))}</span></div>
      <div class="c-chapwrap"><nav class="c-chapters" id="chapters" aria-label="Sections">${secs.map(s => `<button type="button" class="${s.on ? 'is-on' : ''}${s.built ? '' : ' is-soon'}" data-c="sec" data-v="${s.i}" aria-current="${s.on}" title="SB ${esc(s.pages)}"><span>${s.i + 1}</span><b lang="en">${esc(s.name)}</b></button>`).join('')}</nav>
      <button type="button" class="c-chapnav c-chapnav--l" data-c="chap" data-v="-1" aria-label="Earlier sections" hidden>${ic('chevron-left')}</button><button type="button" class="c-chapnav c-chapnav--r" data-c="chap" data-v="1" aria-label="Later sections" hidden>${ic('chevron-right')}</button></div>`;
    const nav = $('#chapters'), on = nav.querySelector('.is-on');
    if (on) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
    nav.addEventListener('scroll', chapFades, { passive: true }); chapFades();
  }
  function chapFades() {
    const n = $('#chapters'); if (!n) return;
    const l = n.scrollLeft > 4, r = n.scrollLeft + n.clientWidth < n.scrollWidth - 4;
    n.classList.toggle('fade-l', l); n.classList.toggle('fade-r', r);
    $('.c-chapnav--l').hidden = !l; $('.c-chapnav--r').hidden = !r;
  }
  function planBlock() {
    const p = FP.plan();
    return `<details class="c-plan"><summary><span>${ic('notebook-pen')}Before you start</span><small>${esc(p.day)} · ${esc(p.materials.split(' · ')[0])} · objectives</small>${ic('chevron-down')}</summary>
      <div class="c-planin"><div><p class="c-lab">Today</p><ol>${p.flow.map(f => `<li${/Sound-Spelling/.test(f) ? ' class="is-on"' : ''}>${esc(f)}</li>`).join('')}</ol><p class="c-lab">Materials</p><p>${esc(p.materials)}</p></div>
      <div>${[p.a1, p.a2].map((x, i) => `<p class="c-lab">${i + 1} · <span lang="en">${esc(x.title)}</span></p><p>${esc(x.goal)}</p>${x.tg ? `<p class="c-tgo">TG · <span lang="en">${esc(x.tg)}</span></p>` : ''}`).join('')}</div></div></details>`;
  }
  function renderDoc() {
    const flow = FP.flow(), cur = FP.cur(), st = FP.state(), extra = FP.mode() === 'extra', sec = FP.section();
    let h = '';
    if (extra) { const it = FP.extraInfo(); h += `<div class="c-away">${ic(it.icon)}<div><b>Now on the board: ${esc(it.label)}</b><span>${esc(it.sub)}</span></div><button type="button" class="c-btn" data-c="close">Back</button></div>`; }
    if (sec.built) h += planBlock();
    else h += `<p class="c-pending">${ic('sparkle')}<span>The full script for <b lang="en">${esc(sec.name)}</b> arrives with its class content. Until then, follow the TG on SB ${esc(sec.pages)}.</span></p>`;
    FP.groups().forEach(gp => {
      const items = flow.filter(a => a.group === gp.id); if (!items.length) return;
      h += `<h3 class="c-part" lang="en">${esc(gp.label)}</h3>`;
      items.forEach(a => {
        const on = !extra && a.id === cur.id, done = !extra && a.index < cur.index, G = FP.guide(a.id), single = G.steps.length === 1;
        const meta = [a.kicker, TYPE[a.type]].concat(a.type === 'sb' && sec.built ? ['~5 min'] : []).join(' · ');
        h += `<article class="c-act${on ? ' is-on' : ''}${done ? ' is-done' : ''}" id="act-${a.id}"><div class="c-gut"><span class="c-num">${String(a.index + 1).padStart(2, '0')}</span></div><div class="c-body">
          <p class="c-kick">${esc(meta)}</p><h4 class="c-title"><button type="button" data-c="go" data-v="${a.id}" lang="en">${esc(a.title)}</button></h4>
          ${on || !done ? `<p class="c-goal">${esc(G.goal || '')}</p>` : ''}
          <ol class="c-steps${single ? ' is-single' : ''}">${G.steps.map((s, i) => { const now = on && i === st.step, past = done || (on && i < st.step);
            return `<li class="${now ? 'is-now' : ''}${past ? ' is-past' : ''}" id="${now ? 'now' : ''}"><button type="button" data-c="step" data-v="${a.id}:${i}">${single ? '' : `<span class="c-sn">${past ? ic('check') : i + 1}</span>`}<span class="c-st">${single ? '' : `<b lang="en">${esc(s.title)}</b>`}${s.say ? `<q lang="en">${FP.hlSay(s.say)}</q>` : ''}${on && (now || single) ? `<span class="c-do"><em>Do</em>${esc(s.do)}</span>${s.kids ? `<span class="c-do"><em>Kids</em>${esc(s.kids)}</span>` : ''}${s.tg ? `<span class="c-tg"><em>TG</em><span lang="en">${esc(s.tg)}</span></span>` : ''}` : ''}</span></button></li>`; }).join('')}</ol>
          ${on && G.answer ? `<p class="c-answer"><em>Answer key</em> Yes — ${G.answer.yes.map(esc).join(', ')} · No — ${G.answer.no.map(esc).join(', ')}</p>` : ''}
          ${on && G.words && G.words.length ? `<p class="c-wordsline"><em>Words</em>${G.words.map(w => `<button type="button" data-c="say" data-v="${esc(w)}" lang="en">${esc(w)}</button>`).join('')}</p>` : ''}
          ${on && G.tip.text ? `<aside class="c-side"><p class="c-lab">${ic('languages')}Korean learners</p><p>${esc(G.tip.text)}</p>${G.tip.pairs.length ? `<p class="c-pairs">${G.tip.pairs.map(q => `<button type="button" data-c="say" data-v="${esc(q[0])}" lang="en">${esc(q[0])}</button><i>vs</i><button type="button" data-c="say" data-v="${esc(q[1])}" lang="en">${esc(q[1])}</button>`).join('<span class="c-dot">·</span>')}</p>` : ''}</aside>` : ''}
          ${on && G.note ? `<p class="c-note">${esc(G.note)}</p>` : ''}
        </div></article>`;
      });
    });
    h += `<div class="c-end">${ic('flag')}<span>End of ${esc(sec.name)}</span></div>`;
    const doc = $('#doc'); doc.innerHTML = h;
    const now = $('#now') || doc.querySelector('.c-act.is-on');
    if (now) {
      const rel = now.getBoundingClientRect().top - doc.getBoundingClientRect().top, h = doc.clientHeight;
      if (rel < h * 0.08 || rel > h * 0.55) {
        const abs = rel + doc.scrollTop, top = abs < h * 0.5 ? 0 : abs - h * 0.26;
        doc.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }
  }
  function renderFoot() {
    if (FP.mode() === 'extra') { $('#sfoot').innerHTML = `<button type="button" class="c-next" data-c="close">${ic('arrow-left')}<span><b>Back to the script</b><small lang="en">${esc(FP.cur().title)}</small></span></button>`; return; }
    const a = FP.cur(), st = FP.state(), nx = FP.peek(1), pv = FP.peek(-1), pr = FP.progress();
    const nl = nx ? ({ step: 'Next line', activity: 'Next activity', section: 'Next section' }[nx.kind]) : 'End of lesson';
    $('#sfoot').innerHTML = `<div class="c-prog"><span style="width:${(pr.ratio * 100).toFixed(1)}%"></span></div><div class="c-frow"><p class="c-where"><b>${a.steps.length > 1 ? `Step ${st.step + 1} of ${a.steps.length}` : `Activity ${a.index + 1} of ${FP.flow().length}`}</b><span lang="en">${esc(a.title)}</span></p>
      <button type="button" class="c-prev" data-c="prev" ${pv ? '' : 'disabled'} aria-label="Previous" title="Previous (←)">${ic('chevron-left')}</button>
      <button type="button" class="c-next" data-c="next" ${nx ? '' : 'disabled'} title="Next (→)"><span><b>${nl}</b><small lang="en">${nx ? esc(nx.label) : 'Well done!'}</small></span>${ic('arrow-right')}</button></div>`;
  }
  function renderScript() {
    app.classList.toggle('script-closed', !scriptOpen);
    $('#scriptBtn').setAttribute('aria-pressed', scriptOpen);
    renderHead(); renderDoc(); renderFoot(); renderBoardHead();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-c]'); if (!t || t.disabled) return;
    const a = t.dataset.c, v = t.dataset.v;
    switch (a) {
      case 'go': FP.go(v, 0); break;
      case 'step': { const [id, i] = v.split(':'); FP.go(id, +i); break; }
      case 'next': FP.next(); break;
      case 'prev': FP.prev(); break;
      case 'sec': FP.setSection(+v); break;
      case 'lesson': FP.setLesson(+v); $('#lessonPop').hidePopover(); break;
      case 'extra': FP.openExtra(v); if ($('#extrasPop').matches(':popover-open')) $('#extrasPop').hidePopover(); break;
      case 'close': FP.closeExtra(); break;
      case 'page': FP.viewer.page(v); break;
      case 'tool': FP.ink.set({ tool: v }); break;
      case 'color': FP.ink.set({ color: v }); break;
      case 'width': FP.ink.set({ width: +v }); break;
      case 'undo': FP.ink.undo(); break;
      case 'clear': FP.ink.clear(); break;
      case 'say': FP.speak(v); break;
      case 'chap': { const n = $('#chapters'); n.scrollBy({ left: +v * n.clientWidth * 0.7, behavior: 'smooth' }); break; }
    }
  });
  function setScript(open) { scriptOpen = open; localStorage.setItem('fprk-c-script', open ? '1' : '0'); renderScript(); }
  $('#scriptBtn').addEventListener('click', () => setScript(!scriptOpen));
  $('#timerBtn').addEventListener('click', () => FP.timer.toggle());
  $('#timerBtn').addEventListener('dblclick', () => FP.timer.reset());
  $('#fsBtn').addEventListener('click', () => FP.fullscreen());
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').innerHTML = ic(document.fullscreenElement ? 'minimize' : 'maximize'); });
  [['lessonPop', 'lessonBtn', 'left'], ['extrasPop', 'extrasBtn', 'right'], ['helpPop', 'helpBtn', 'right']].forEach(([p, b, side]) => {
    const pop = $('#' + p);
    pop.addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return;
      if (p === 'extrasPop') renderExtras();
      if (p === 'lessonPop') renderToc();
      const r = $('#' + b).getBoundingClientRect(); pop.style.top = (r.bottom + 10) + 'px';
      if (side === 'left') { pop.style.left = Math.max(10, r.left) + 'px'; pop.style.right = 'auto'; } else { pop.style.right = Math.max(10, innerWidth - r.right) + 'px'; pop.style.left = 'auto'; }
    });
  });

  addEventListener('resize', chapFades);
  FP.on(e => {
    if (e.type === 'lesson') renderTop();
    if (e.type === 'nav') renderScript();
    if (e.type === 'ink') renderTools();
    if (e.type === 'timer') renderTimer();
    if (e.type === 'key' && (e.key === 's' || e.key === 'S')) setScript(!scriptOpen);
  });
  setInterval(() => { if (FP.timer.running()) renderTimer(); }, 1000);

  const qs = new URLSearchParams(location.search);
  FP.mount($('#stage'), { storageKey: 'fprk-c', keepAwake: true, fresh: qs.has('fresh'), lesson: +qs.get('lesson') || 1, act: qs.get('act') || 'ls1' });
  renderTools();
})();
