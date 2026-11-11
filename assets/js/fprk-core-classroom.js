/* FPR K Teacher Dashboard — shell engine (frame only)
   State, lesson/section flow, content slot, teacher guide data, board ink, SB/TG page viewer, timer, keys.
   The content area is an empty slot: produced class content will be embedded there later. */
(function () {
  'use strict';
  const DATA = window.FPRK_DATA;
  const FP = (window.FP = window.FP || {});
  const IMGS = new Set(DATA.imgs);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const imgSrc = k => (IMGS.has(k) ? 'assets/img/' + k + '.jpg' : null);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  FP.esc = esc;

  /* ---------- icons (Lucide, ISC) ---------- */
  const ICONS = {
    'chevron-left': '<path d="m15 18-6-6 6-6"/>', 'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>', 'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>', pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    'volume-2': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    columns: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    pen: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    pointer: '<path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    timer: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    flow: '<circle cx="5" cy="12" r="3" fill="currentColor"/><path d="M8 12h1.5"/><circle cx="12.5" cy="12" r="3"/><path d="M15.5 12H22"/><path d="m19 9 3 3-3 3"/>',   // run of show: done step → next step → onward
    'panel-right': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
    'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
    'panel-bottom': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15h18"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    keyboard: '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>',
    'zoom-in': '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
    'zoom-out': '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    footprints: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
    puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    sparkle: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    presentation: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
    'notebook-pen': '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
    'monitor-pause': '<path d="M10 13V7"/><path d="M14 13V7"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/>',
    'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    cast: '<path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><line x1="2" x2="2.01" y1="20" y2="20"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    tablet: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
    'qr-code': '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    dices: '<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
    gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
  };
  FP.icon = (n, c) => `<svg class="i${c ? ' ' + c : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const icon = FP.icon;
  function sprite() {
    if (document.getElementById('fp-sprite')) return;
    const d = document.createElement('div');
    d.innerHTML = `<svg id="fp-sprite" xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('')}</svg>`;
    document.body.prepend(d.firstChild);
  }

  /* ---------- state ---------- */
  let KEY = 'fprk';
  const S = { lesson: 1, sec: 0, act: 'ls1', step: 0, extra: null };
  let L = null, FLOW = [];
  const listeners = new Set();
  FP.on = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  function emit(type, extra) { listeners.forEach(fn => { try { fn(Object.assign({ type }, extra)); } catch (e) { console.error(e); } }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ lesson: S.lesson, sec: S.sec, act: S.act, step: S.step })); } catch (e) { /* private mode */ } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  const introIndex = () => Math.max(0, (L.secs || []).findIndex(x => x[0] === 'Introduction'));
  const isIntro = () => ((L.secs || [])[S.sec] || [])[0] === 'Introduction';

  function setLessonData(n) {
    n = +n; if (!DATA.lessons[n]) n = 1;
    L = Object.assign({ n }, DATA.lessons[n]);
    L.unit = L.unit || 1; L.begin = L.kind !== 'blend';
    L.items = (L.begin ? L.pics : L.words) || [];
    L.first = L.first || {}; L.str = L.str || {};
    S.lesson = n;
  }
  function buildFlow() {
    if (isIntro()) return buildIntro();
    const sec = L.secs[S.sec], subs = sec[2] && sec[2].length ? sec[2] : [sec[0]];
    return subs.map((s, i) => ({ id: `s${S.sec}-${i}`, group: 'sec', title: s, kicker: 'SB Activity', type: 'sb', steps: [s], index: i, page: sec[1], pending: true }));
  }
  function buildIntro() {
    const mf = ['Picture → Listen', 'Picture → Say', 'Listen → Find'];
    const F = [];
    F.push({ id: 'lmf', group: 'warm', title: 'Lesson Words', kicker: 'Meaning First', type: 'prep', steps: ['Lesson words'] });
    F.push({ id: 'ls1', group: 'a1', title: 'Sound Chant', kicker: 'Activity 1', type: 'prep', steps: (L.chn || []).slice() });
    F.push({ id: 'lssb', group: 'a1', title: L.a1, kicker: 'SB Activity', type: 'sb', steps: (L.ts || []).map(t => t[0]) });
    if (L.begin) {
      F.push({ id: 'si1', group: 'a2', title: 'Meaning First', kicker: 'Activity 1', type: 'prep', steps: mf });
      F.push({ id: 'si2', group: 'a2', title: 'Sound Awareness', kicker: 'Activity 2', type: 'prep', steps: ['Sound Awareness'] });
      F.push({ id: 'si3', group: 'a2', title: 'Sound–Letter Match', kicker: 'Activity 3', type: 'prep', steps: ['Sound–Letter Match'] });
    } else {
      F.push({ id: 'bl1', group: 'a2', title: 'Sound Review', kicker: 'Activity 1', type: 'prep', steps: ['Letter → Say', 'Listen → Find'] });
      F.push({ id: 'si1', group: 'a2', title: 'Meaning First', kicker: 'Activity 2', type: 'prep', steps: mf });
      F.push({ id: 'bl3', group: 'a2', title: 'Sound Blending', kicker: 'Activity 3', type: 'prep', steps: ['Blend words', 'Read sentences'] });
    }
    F.push({ id: 'sisb', group: 'a2', title: L.a2, kicker: 'SB Activity', type: 'sb', steps: (L.sist || []).map(t => t[0]) });
    F.push({ id: 'sigl', group: 'a2', title: 'G-Learning', kicker: 'Home practice', type: 'home', steps: ['G-Learning preview'] });
    F.forEach((a, i) => { a.index = i; a.page = a.type === 'sb' ? 'p' + L.sb : null; if (!a.steps.length) a.steps = [a.title]; });
    return F;
  }

  /* ---------- read API ---------- */
  FP.data = DATA;
  FP.lesson = () => L;
  FP.flow = () => FLOW;
  FP.cur = () => FLOW.find(a => a.id === S.act) || FLOW[0];
  FP.state = () => Object.assign({}, S);
  FP.isIntro = isIntro;
  FP.section = () => { const s = (L.secs || [])[S.sec] || ['', '', []]; return { i: S.sec, name: s[0], pages: s[1], subs: s[2] || [], built: s[0] === 'Introduction' }; };
  FP.groups = () => isIntro() ? [{ id: 'warm', label: 'Warm-up' }, { id: 'a1', label: '1 · ' + L.a1 }, { id: 'a2', label: '2 · ' + L.a2 }] : [{ id: 'sec', label: FP.section().name }];
  FP.unitTheme = u => (DATA.units.find(x => x.n === u) || {}).theme || '';
  FP.mode = () => (S.extra ? 'extra' : 'flow');
  FP.sections = () => (L.secs || []).map((s, i) => ({ i, name: s[0], pages: s[1], subs: s[2] || [], built: s[0] === 'Introduction', on: i === S.sec }));
  FP.progress = () => {
    const total = FLOW.reduce((s, a) => s + a.steps.length, 0); let done = 0;
    for (const a of FLOW) { if (a.id === S.act) { done += S.step; break; } done += a.steps.length; }
    return { done, total, ratio: total > 1 ? done / (total - 1) : 1 };
  };
  // next / previous position, crossing activities and sections
  FP.peek = (dir = 1) => {
    const a = FP.cur(); if (!a) return null;
    if (dir > 0) {
      if (S.step < a.steps.length - 1) return { kind: 'step', sec: S.sec, act: a.id, step: S.step + 1, label: a.steps[S.step + 1] };
      const n = FLOW[a.index + 1]; if (n) return { kind: 'activity', sec: S.sec, act: n.id, step: 0, label: n.title };
      const ns = (L.secs || [])[S.sec + 1]; return ns ? { kind: 'section', sec: S.sec + 1, act: null, step: 0, label: ns[0] } : null;
    }
    if (S.step > 0) return { kind: 'step', sec: S.sec, act: a.id, step: S.step - 1, label: a.steps[S.step - 1] };
    const p = FLOW[a.index - 1]; if (p) return { kind: 'activity', sec: S.sec, act: p.id, step: p.steps.length - 1, label: p.title };
    const ps = (L.secs || [])[S.sec - 1]; return ps ? { kind: 'section', sec: S.sec - 1, act: null, step: -1, label: ps[0] } : null;
  };
  FP.context = () => {
    if (S.extra) { const it = findExtra(S.extra); return { mode: 'extra', kicker: 'Class activity · ' + it.group, title: it.label, sub: it.sub, type: 'extra', step: '', stepIndex: 0, stepCount: 1, soon: !!it.soon }; }
    const a = FP.cur(), sec = FP.section(), g = FP.groups().find(x => x.id === a.group) || {};
    return { mode: 'flow', kicker: isIntro() ? `${g.label} · ${a.kicker}` : `${sec.name} · SB ${sec.pages}`, title: a.title, type: a.type, step: a.steps.length > 1 ? a.steps[S.step] : '', stepIndex: S.step, stepCount: a.steps.length, pending: !!a.pending };
  };

  /* ---------- navigation ---------- */
  let actStart = Date.now();
  function paint(vt) { render(vt); emit('nav'); }
  FP.go = (act, step = 0) => {
    const a = FLOW.find(x => x.id === act); if (!a) return;
    if (a.id !== S.act) actStart = Date.now();
    S.extra = null; S.act = a.id; S.step = Math.max(0, Math.min(step, a.steps.length - 1));
    save(); paint(true);
  };
  FP.setStep = i => FP.go(S.act, i);
  FP.setSection = (i, atEnd) => {
    if (!(L.secs || [])[i]) return;
    S.sec = i; S.extra = null; FLOW = buildFlow();
    const a = atEnd ? FLOW[FLOW.length - 1] : FLOW[0];
    S.act = a.id; S.step = atEnd ? a.steps.length - 1 : 0; actStart = Date.now();
    save(); paint(true);
  };
  const jump = p => { if (!p) return; if (p.kind === 'section') FP.setSection(p.sec, p.step < 0); else FP.go(p.act, p.step); };
  FP.next = () => { if (S.extra) return FP.closeExtra(); jump(FP.peek(1)); };
  FP.prev = () => { if (S.extra) return FP.closeExtra(); jump(FP.peek(-1)); };
  FP.setLesson = n => {
    setLessonData(n); S.sec = introIndex(); FLOW = buildFlow();
    S.act = FLOW.find(a => a.id === 'ls1') ? 'ls1' : FLOW[0].id; S.step = 0; S.extra = null; actStart = Date.now();
    save(); render(true); emit('lesson'); emit('nav');
  };

  /* ---------- class activities outside the flow (student activity strip) ---------- */
  const EXTRAS = [
    { group: 'Meaning First', icon: 'layers', items: [
      { id: 'x-lmf', label: 'Lesson Words', sub: 'Every word in this lesson' },
      { id: 'x-mfd', label: 'Dictation Words', sub: 'Dictation page', soon: true },
      { id: 'x-mfh', label: 'Handwriting Words', sub: 'Handwriting page', soon: true },
      { id: 'x-mfi', label: 'Independent Practice Words', sub: 'Independent Practice page', soon: true }] },
    { group: 'Songs', icon: 'music', items: [
      { id: 'x-abc', label: 'Alphabet Song', sub: 'Letter names A–Z' },
      { id: 'x-lss', label: 'Letter Sound Song', sub: 'M says /m/' }] },
    { group: 'Movement', icon: 'footprints', items: [
      { id: 'x-body', label: 'ABC Body Shapes', sub: 'Make the letter with your body' },
      { id: 'x-dance', label: 'ABC Dance & Freeze', sub: 'Dance, freeze, say the sound' }] },
    { group: 'Chant', icon: 'music', items: [
      { id: 'x-chant', label: 'Sound & Rhythm Chant', sub: 'Beat boxes for this lesson' }] },
    { group: 'Picture Games', icon: 'puzzle', items: [
      { id: 'x-pmatch', label: 'Picture Match', sub: 'Hear a sound, find the pair', soon: true },
      { id: 'x-phidden', label: 'Hidden Picture', sub: 'Name the picture behind the card', soon: true },
      { id: 'x-phunt', label: 'Picture Hunt', sub: 'Find the word in a big scene', soon: true },
      { id: 'x-preveal', label: 'Picture Reveal', sub: 'Name it as it appears', soon: true }] },
    { group: 'Home', icon: 'house', items: [
      { id: 'x-gl', label: 'G-Learning', sub: 'Home practice with Coco' }] },
    { group: 'Support', icon: 'languages', items: [
      { id: 'x-efl', label: 'Korean Learner Support', sub: 'Pronunciation · pairs · feedback' }] },
  ];
  EXTRAS.forEach(g => g.items.forEach(it => { it.group = g.group; it.icon = g.icon; }));
  FP.extras = () => EXTRAS;
  const findExtra = id => { for (const g of EXTRAS) for (const it of g.items) if (it.id === id) return it; return null; };
  FP.extraInfo = () => (S.extra ? findExtra(S.extra) : null);
  FP.openExtra = id => { if (!findExtra(id)) return; S.extra = id; paint(true); };
  FP.closeExtra = () => { if (!S.extra) return; S.extra = null; paint(true); };

  /* ---------- content slot ---------- */
  let root = null, slotEl = null, canvas = null, ctx2d = null;
  const ratioName = r => { const std = [[16 / 9, '16:9'], [16 / 10, '16:10'], [3 / 2, '3:2'], [4 / 3, '4:3'], [21 / 9, '21:9']]; let best = std[0]; std.forEach(s => { if (Math.abs(s[0] - r) < Math.abs(best[0] - r)) best = s; }); return Math.abs(best[0] - r) < .04 ? best[1] : r.toFixed(2) + ':1'; };
  function slotHTML() {
    const c = FP.context();
    const typeLabel = { prep: 'POLY prep activity', sb: 'Student Book activity', home: 'Home practice preview', extra: 'Class activity' }[c.type] || '';
    return `<div class="k-slot" data-type="${c.type}">
      <div class="k-slot-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="k-slot-in">
        <span class="k-slot-badge">${icon('layers')}Content area</span>
        <p class="k-slot-kicker">${esc(typeLabel)}</p>
        <h2 class="k-slot-title" lang="en">${esc(c.title)}</h2>
        ${c.step ? `<p class="k-slot-step">Step ${c.stepIndex + 1} of ${c.stepCount} · <span lang="en">${esc(c.step)}</span></p>` : ''}
        <p class="k-slot-note">Produced class content plays here.</p>
        <p class="k-slot-size" data-slot-size></p>
      </div></div>`;
  }
  function render(vt) {
    if (!slotEl) return;
    const html = slotHTML();
    const swap = () => { slotEl.innerHTML = html; measure(); redrawInk(); requestAnimationFrame(measure); };   // re-measure once the rest of the page (dock) has rendered: the frame size may have changed
    if (vt && document.startViewTransition && !reduced() && FP.opts.viewTransitions !== false && !document.hidden) {
      try { const t = document.startViewTransition(swap); [t.ready, t.finished, t.updateCallbackDone].forEach(p => p && p.catch(() => {})); } catch (e) { swap(); }
    } else swap();
  }
  FP.render = () => render(false);
  function measure() {
    if (!root) return;
    const r = root.getBoundingClientRect(), D = FP.opts.design;   // design = [w, h]: content is made at this size and scaled to the frame
    const k = D && r.width && r.height ? Math.min(r.width / D[0], r.height / D[1]) : 0;   // a frame of another shape (full screen): the design box grows to the frame's shape at the scale that fits
    if (k) { root.style.setProperty('--k-scale', k.toFixed(5)); root.style.setProperty('--k-dw', (r.width / k).toFixed(2) + 'px'); root.style.setProperty('--k-dh', (r.height / k).toFixed(2) + 'px'); }
    const el = slotEl && slotEl.querySelector('[data-slot-size]'); if (!el) return;
    el.textContent = D ? `${D[0]} × ${D[1]} · ${ratioName(D[0] / D[1])} · shown at ${Math.round((k || r.width / D[0]) * 100)}%` : `${Math.round(r.width)} × ${Math.round(r.height)} px · ${ratioName(r.width / r.height)}`;
  }

  /* ---------- board ink (draws over the content area) ---------- */
  const INK = {};
  const ink = { on: false, tool: 'pen', color: '#1B2623', width: 6 };
  FP.inkColors = [['#1B2623', 'Black'], ['#D63A2F', 'Red'], ['#1F5FD1', 'Blue'], ['#1E9457', 'Green'], ['#F2B705', 'Yellow']];
  const inkKey = () => (S.extra ? 'x' + S.extra : `${L.n}|${S.sec}|${S.act}|${S.step}`);
  const strokes = () => (INK[inkKey()] = INK[inkKey()] || []);
  let curStroke = null;
  function sizeInk() {
    if (!canvas) return;
    const r = root.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    ctx2d.setTransform(d, 0, 0, d, 0, 0); redrawInk(); measure();
  }
  function paintStroke(s, W, H) {
    if (!s.p.length) return;
    const c = ctx2d; c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.t === 'er') { c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; c.lineWidth = s.w * 4; }
    else { c.globalCompositeOperation = 'source-over'; c.strokeStyle = s.c; c.lineWidth = s.t === 'hl' ? s.w * 3.2 : s.w; c.globalAlpha = s.t === 'hl' ? .32 : 1; }
    const P = s.p.map(q => [q[0] * W, q[1] * H]);
    c.beginPath(); c.moveTo(P[0][0], P[0][1]);
    if (P.length < 3) c.lineTo(P[P.length - 1][0] + .1, P[P.length - 1][1]);
    else { for (let i = 1; i < P.length - 1; i++) c.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2); c.lineTo(P[P.length - 1][0], P[P.length - 1][1]); }
    c.stroke(); c.restore();
  }
  function redrawInk() {
    if (!ctx2d) return; const d = window.devicePixelRatio || 1, W = canvas.width / d, H = canvas.height / d;
    ctx2d.clearRect(0, 0, W, H); strokes().forEach(s => paintStroke(s, W, H));
  }
  function initInk() {
    ctx2d = canvas.getContext('2d');
    const pt = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    canvas.addEventListener('pointerdown', e => { if (!ink.on) return; canvas.setPointerCapture(e.pointerId); curStroke = { t: ink.tool, c: ink.color, w: ink.width, p: [pt(e)] }; strokes().push(curStroke); redrawInk(); });
    canvas.addEventListener('pointermove', e => { if (!curStroke) return; (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(ev => curStroke.p.push(pt(ev))); redrawInk(); emit('inkmove'); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, () => { if (curStroke) { curStroke = null; emit('ink'); } }));
    new ResizeObserver(() => { sizeInk(); measure(); }).observe(root);   // the frame can change size after a step renders (dock height): keep --k-scale in step, not only on render
  }
  FP.ink = {
    state: () => Object.assign({ count: strokes().length }, ink),
    set: o => {
      Object.assign(ink, o);
      if (o.tool === 'select') ink.on = false; else if (o.tool) ink.on = true;
      if (o.color && ink.tool === 'er') ink.tool = 'pen';
      if (o.color && !o.tool && !ink.on) ink.on = true;
      root.classList.toggle('is-drawing', ink.on); root.dataset.tool = ink.on ? ink.tool : 'select'; emit('ink');
    },
    toggle: () => FP.ink.set(ink.on ? { tool: 'select' } : { tool: ink.tool && ink.tool !== 'select' ? ink.tool : 'pen' }),
    undo: () => { strokes().pop(); redrawInk(); emit('ink'); },
    export: () => strokes().map(s => ({ t: s.t, c: s.c, w: s.w, p: s.p.slice() })),
    import: list => { INK[inkKey()] = (list || []).map(s => ({ t: s.t, c: s.c, w: s.w, p: (s.p || []).slice() })); redrawInk(); },
    clear: () => { INK[inkKey()] = []; redrawInk(); emit('ink'); },
  };

  /* ---------- SB / TG page viewer ---------- */
  let vEl = null, vZoom = 1;
  function initViewer() {
    vEl = document.createElement('div'); vEl.className = 'fp-viewer'; vEl.hidden = true;
    vEl.setAttribute('role', 'dialog'); vEl.setAttribute('aria-modal', 'true'); vEl.setAttribute('aria-label', 'Book page viewer');
    vEl.innerHTML = `<div class="fp-vbar"><b class="fp-vtitle"></b><div class="fp-vseg" role="group" aria-label="Pages"><button type="button" data-vp="sb">${icon('book-open')}SB</button><button type="button" data-vp="tg">${icon('file-text')}TG</button><button type="button" data-vp="both">${icon('columns')}Both</button></div><div class="fp-vzoom"><button type="button" data-z="out" aria-label="Zoom out">${icon('zoom-out')}</button><span class="fp-vpct">100%</span><button type="button" data-z="in" aria-label="Zoom in">${icon('zoom-in')}</button><button type="button" data-z="fit">${icon('scan')}Fit</button></div><button type="button" class="fp-vclose">${icon('x')}Close</button></div><div class="fp-vbody"></div>`;
    document.body.appendChild(vEl);
    vEl.addEventListener('click', e => {
      if (e.target === vEl || e.target.closest('.fp-vclose')) return FP.viewer.close();
      const z = e.target.closest('[data-z]'); if (z) { const k = z.dataset.z; vZoom = k === 'fit' ? 1 : Math.max(.5, Math.min(4, vZoom * (k === 'in' ? 1.25 : .8))); applyZoom(); return; }
      const p = e.target.closest('[data-vp]'); if (p) FP.viewer.page(p.dataset.vp);
    });
    let drag = null; const body = vEl.querySelector('.fp-vbody');
    body.addEventListener('pointerdown', e => { if (vZoom <= 1 || e.button) return; drag = { x: e.clientX, y: e.clientY, l: body.scrollLeft, t: body.scrollTop }; body.setPointerCapture(e.pointerId); body.classList.add('is-drag'); });
    body.addEventListener('pointermove', e => { if (!drag) return; body.scrollLeft = drag.l - (e.clientX - drag.x); body.scrollTop = drag.t - (e.clientY - drag.y); });
    body.addEventListener('pointerup', () => { drag = null; body.classList.remove('is-drag'); });
  }
  function applyZoom() { vEl.querySelector('.fp-vpct').textContent = Math.round(vZoom * 100) + '%'; vEl.style.setProperty('--vz', vZoom); vEl.classList.toggle('is-zoomed', vZoom > 1); }
  FP.viewer = {
    page: which => {
      const sb = imgSrc('sbp' + L.n), tg = imgSrc('tgp' + L.n);
      const t = `Lesson ${L.n} · ` + (which === 'tg' ? `TG p${L.sb} (PDF ${L.pdf})` : which === 'both' ? `SB p${L.sb} + TG p${L.sb}` : `SB p${L.sb}`);
      vZoom = 1; vEl.dataset.kind = which;
      vEl.querySelector('.fp-vtitle').textContent = t;
      vEl.querySelectorAll('[data-vp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === which));
      vEl.querySelector('.fp-vbody').innerHTML = which === 'both' ? `<div class="fp-vtwo"><img src="${sb}" alt="SB p${L.sb}"><img src="${tg}" alt="TG p${L.sb}"></div>` : `<img src="${which === 'tg' ? tg : sb}" alt="${t}">`;
      vEl.querySelectorAll('.fp-vbody img').forEach(im => im.addEventListener('error', () => {
        const d = document.createElement('div'); d.className = 'fp-vmiss';
        d.innerHTML = `${icon('book-open')}<b>${esc(im.alt)}</b><span>Book page images aren’t included in this shared preview.</span>`;
        im.replaceWith(d);
      }, { once: true }));
      applyZoom(); const was = vEl.hidden; vEl.hidden = false; if (was) { vEl.querySelector('.fp-vclose').focus(); emit('viewer', { open: true }); }
    },
    close: () => { if (!vEl.hidden) { vEl.hidden = true; emit('viewer', { open: false }); } },
    isOpen: () => !vEl.hidden,
  };

  /* ---------- teacher guide data ---------- */
  const art = w => (/^[A-Z]/.test(w) ? w : (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w);
  const STR = w => L.str[w] || w;
  const SR = x => (L.srs && L.srs[x]) || '/' + x + '/';
  const question = () => (L.kind === 'begin' ? `Does it begin with ${L.snd}?` : `Does it have the ${L.snd} sound?`);
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  const chantText = i => ((L.ch || {})[String(i + 1)] || []).map(row => chunk(row, 4).map(b => b.filter(w => w !== '_').join(' ')).join(' · ')).join('  /  ');
  const tgt = () => { const t = (L.ltr || '').toLowerCase(); return t && !/[\s_]/.test(t) && t.length <= 2 ? t : null; };
  FP.hlSay = text => {
    let h = esc(text);
    (L.snd || '').split(/\s+/).filter(Boolean).forEach(s => { h = h.split(esc(s)).join(`<b class="t-snd">${esc(s)}</b>`); });
    const t = tgt();
    if (t && t.length === 1) h = h.replace(new RegExp(`\\b(${t}{3,}|${t}…|${t}-${t}-)`, 'gi'), '<b class="t-snd">$1</b>');
    return h;
  };
  FP.guide = id => {
    const P = L.plan || {}, E = L.efl || {};
    const tip = { text: E.tip || '', pairs: E.pairs || [], tg: E.tg || '', voc: E.voc || '' };
    if (S.extra && !id) { const it = findExtra(S.extra); return { mode: 'extra', title: it.label, kicker: it.group, goal: it.sub, steps: [], cur: null, tip }; }
    const a = (id && FLOW.find(x => x.id === id)) || FP.cur(), st = a.id === S.act ? S.step : 0, items = L.items.map(p => p[0]), w0 = items[0] || '';
    const g = { mode: 'flow', act: a, step: st, title: a.title, kicker: a.kicker, type: a.type, steps: [], tip,
      time: a.type === 'sb' && isIntro() ? `~5 min · TG: ${L.a1} + ${L.a2} = 10 min` : (a.type === 'home' ? 'Preview · 1–2 min' : a.type === 'prep' ? 'Before the SB' : ''),
      ref: a.type === 'sb' ? `SB ${a.page || 'p' + L.sb}` : '' };
    if (!isIntro()) {
      const s = FP.section();
      g.goal = `Teach “${a.title}” from SB ${s.pages}.`;
      g.steps = [{ title: a.title, do: `Open SB ${s.pages} and follow the TG procedure for “${a.title}.”`, say: '', kids: '' }];
      g.pending = true; g.cur = g.steps[0]; return g;
    }
    switch (a.id) {
      case 'lmf': {
        const W = (L.lmf || []).map(x => x[0]), w = W[0] || '';
        g.goal = 'Pre-teach this lesson’s words — meaning first, before any sounds or letters.';
        g.steps = [{ title: 'Lesson words', do: 'Show each word with its picture or a gesture. Say it twice, then let kids name it and find it.', say: `Look. This is ${art(w)}. ${w}, ${w}.`, kids: 'Look, listen, then name and point.' }];
        g.words = W; g.note = 'No picture for a word? Use a gesture or a real object.';
        break; }
      case 'ls1':
        g.goal = `Warm up ${L.snd} with a steady beat. Build up step by step, then open the Student Book for ${L.a1}.`;
        g.steps = (L.chn || []).map((t, i, arr) => ({ title: t, do: i < arr.length - 1 ? 'Play the beat. Point to each box on the beat while kids chant. Dashed boxes are rests.' : 'Chant every row together, then move on to the Student Book.', say: chantText(i), kids: 'Chant along and clap on each beat.' }));
        break;
      case 'lssb':
        g.goal = P.lsGoal || `Children listen and join in with the rhyme, hear ${L.snd}, and connect it to the letter ${L.ltr}.`;
        g.steps = (L.ts || []).map(t => ({ title: t[0], do: t[1], say: t[2], kids: t[3] || '', tg: t[4] || '' }));
        if (P.el) g.extra = { title: 'Extra support (any time)', say: P.el[0], tg: P.el[1] };
        break;
      case 'si1':
        g.goal = 'Make sure every child knows what each picture is before judging sounds.';
        g.steps = [
          { title: 'Picture → Listen', do: 'Show each picture and say the word 2–3 times.', say: `This is ${art(w0)}. ${w0}, ${w0}.`, kids: 'Look and listen.' },
          { title: 'Picture → Say', do: 'Hide the word. Kids name the picture, then check together.', say: 'What’s this?', kids: `It’s ${art(w0)}!` },
          { title: 'Listen → Find', do: 'Say a word; kids point to the right picture. Add more pictures as they get it.', say: `Find the ${w0}.`, kids: 'Point to the picture.' }];
        g.words = items;
        break;
      case 'si2':
        g.goal = L.kind === 'begin' ? `Kids listen for ${L.snd} at the beginning of each word — listening only, no letters yet.` : `Kids listen for the ${L.snd} sound in each word.`;
        g.steps = [{ title: 'Sound Awareness', do: 'Show each picture. Stretch the first sound, then ask. Kids answer with a thumbs up (yes) or a flat hand (no).', say: `${STR(w0)}. ${question()}`, kids: 'Thumbs up or flat hand.' }];
        g.answer = { yes: L.items.filter(p => p[1]).map(p => p[0]), no: L.items.filter(p => !p[1]).map(p => p[0] + (L.first[p[0]] ? ' ' + L.first[p[0]] : '')) };
        break;
      case 'si3':
        g.goal = `Link the sound ${L.snd} to the letter ${L.ltr}, using the same pictures kids will circle in ${L.a2}.`;
        g.steps = [{ title: 'Sound–Letter Match', do: `Go through the pictures: ${L.snd} pictures get an ${L.ltr} card. Then show the circles — exactly what kids do in ${L.a2}.`, say: `${STR(w0)} → ${L.snd} → ${L.ltr}.`, kids: 'Say the word, then the sound.' }];
        g.words = items;
        break;
      case 'sisb':
        g.goal = P.siGoal || (L.begin ? `Children say each picture name and circle the pictures with ${L.snd}.` : `Children say the sounds, blend each word, and read the sentences in ${L.a2}.`);
        g.steps = (L.sist || []).map(t => ({ title: t[0], do: t[1], say: t[2], kids: t[3] || '', tg: t[4] || '' }));
        if (L.begin) g.answer = { yes: L.items.filter(p => p[1]).map(p => p[0]), no: L.items.filter(p => !p[1]).map(p => p[0] + (L.first[p[0]] ? ' ' + L.first[p[0]] : '')) };
        break;
      case 'sigl':
        g.goal = 'Show the class what home practice looks like, so they know what to do with Coco at home.';
        g.steps = [{ title: 'G-Learning preview', do: 'Try one round together: say the picture name, listen and choose, then the board game.', say: 'Let’s try it together. You can play with Coco at home!', kids: 'Watch, then try one together.' }];
        g.note = 'No scores, no timers, no red X — Coco helps kids listen again.';
        break;
      case 'bl1': {
        const Ls = (L.lines || [[]])[0], x = Ls[0] || L.ltr;
        g.goal = 'Warm up the letter sounds from row 1 before blending.';
        g.steps = [
          { title: 'Letter → Say', do: 'Point to a letter; kids say its sound.', say: 'What’s the sound?', kids: `${SR(x)}!` },
          { title: 'Listen → Find', do: 'Say a sound; kids find the letter.', say: `Find ${SR(L.ltr)}.`, kids: 'Point to the letter.' }];
        g.words = Ls;
        break; }
      case 'bl3': {
        const ws = (L.lines || [])[1] || [], w = ws[0] || '', s = (((L.lines || [])[2] || [''])[0]);
        const seg = (L.segs && L.segs[w]) || w.split('');
        g.goal = 'Blend sounds into words, then read the words in sentences.';
        g.steps = [
          { title: 'Blend words', do: 'Say each sound, then blend. Model the first word; kids blend the rest together.', say: `Listen: ${seg.map(c => c.replace('*', '')).join('-')}, ${w}. Now you blend.`, kids: `${w}!` },
          { title: 'Read sentences', do: 'Point to each word. Read the tricky words (I, the, is, see…) for them; kids blend the decodable words.', say: `Read with me: ${s}`, kids: 'Read along, word by word.' }];
        g.words = ws;
        break; }
    }
    g.cur = g.steps[Math.min(st, g.steps.length - 1)] || null;
    return g;
  };
  FP.plan = () => {
    const P = L.plan || {};
    return {
      day: L.day, sb: L.sb, tg: L.tgr || ('TG p' + L.sb), pdf: L.pdf,
      flow: (P.flow || [`Introduce Sound-Spelling · 10 min (${L.a1} + ${L.a2})`]).map(f => f.replace(/^\d+\.\s*/, '')),
      materials: P.materials || `SB p${L.sb} · pencil · ${L.key} letter card`,
      a1: { title: L.a1, goal: P.lsGoal || `Children join in with the rhyme, hear ${L.snd}, and connect it to the letter ${L.ltr}.`, can: P.lsCan || [], tg: P.lsTG || `Know ${L.snd} spelled ${L.ltr}`, rhyme: (L.rhyme || []).join(' ') },
      a2: { title: L.a2, goal: P.siGoal || (L.begin ? `Children circle the pictures with ${L.snd}.` : 'Children blend the words and read the sentences.'), can: P.siCan || [], tg: P.siTG || '', dir: L.dir2 || '' },
    };
  };

  /* ---------- speech (support pairs) ---------- */
  let VOICE = null;
  function voices() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => { const vs = speechSynthesis.getVoices(); VOICE = vs.find(v => /en-US/i.test(v.lang) && /(Google|Samantha|Aria|Jenny|Natural)/i.test(v.name)) || vs.find(v => /en-US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; };
    pick(); speechSynthesis.onvoiceschanged = pick;
  }
  FP.speak = (t, rate = 0.82) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t)); u.lang = 'en-US'; if (VOICE) u.voice = VOICE; u.rate = rate; speechSynthesis.speak(u); } catch (e) { /* no tts */ } };

  /* ---------- timer ---------- */
  const T = { start: null, acc: 0 };
  FP.timer = {
    running: () => T.start != null,
    toggle: () => { if (T.start != null) { T.acc += Date.now() - T.start; T.start = null; } else T.start = Date.now(); emit('timer'); },
    reset: () => { T.start = null; T.acc = 0; emit('timer'); },
    elapsed: () => T.acc + (T.start != null ? Date.now() - T.start : 0),
    actElapsed: () => Date.now() - actStart,
  };
  FP.fmt = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- screen helpers ---------- */
  FP.fullscreen = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* unsupported */ } };
  let wakeLock = null;
  FP.keepAwake = async on => { try { if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); else if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) { wakeLock = null; } };

  /* ---------- keyboard / presentation clicker ---------- */
  function initKeys() {
    addEventListener('keydown', e => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if (e.key === 'Escape') { if (FP.viewer.isOpen()) { FP.viewer.close(); e.preventDefault(); return; } emit('key', { key: 'Escape', event: e }); return; }
      if (FP.viewer.isOpen()) { if (e.key === '+' || e.key === '=') vEl.querySelector('[data-z="in"]').click(); if (e.key === '-') vEl.querySelector('[data-z="out"]').click(); return; }
      const onBtn = tag === 'button' || tag === 'a';
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !onBtn)) { e.preventDefault(); FP.next(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); FP.prev(); return; }
      if (e.key === 'd' || e.key === 'D') { FP.ink.toggle(); return; }
      if (e.key === 'f' || e.key === 'F') { FP.fullscreen(); return; }
      emit('key', { key: e.key, event: e });
    });
  }

  /* ---------- mount ---------- */
  FP.opts = {};
  FP.mount = (el, opts = {}) => {
    FP.opts = opts; KEY = opts.storageKey || KEY;
    sprite();
    el.classList.add('k-root');
    el.innerHTML = '<div class="k-viewport"></div><canvas class="k-ink" aria-hidden="true"></canvas>';
    root = el; slotEl = el.querySelector('.k-viewport'); canvas = el.querySelector('.k-ink');
    initInk(); initViewer(); if (opts.keys !== false) initKeys(); voices();
    const st = opts.fresh ? null : load();
    setLessonData(st && DATA.lessons[st.lesson] ? st.lesson : (opts.lesson || 1));
    S.sec = st && (L.secs || [])[st.sec] ? st.sec : introIndex();
    FLOW = buildFlow();
    const act = st && FLOW.find(a => a.id === st.act) ? st.act : (FLOW.find(a => a.id === (opts.act || 'ls1')) ? (opts.act || 'ls1') : FLOW[0].id);
    S.act = act; S.step = st && st.act === act ? Math.min(st.step || 0, FP.cur().steps.length - 1) : 0;
    actStart = Date.now();
    render(false); emit('lesson'); emit('nav');
    if (opts.keepAwake) FP.keepAwake(true);
  };
})();
