/* ============================================================
   ArchCompare — Hexagonal vs Clean · interactions
   Built on the Knowledge Page template (bilingual EN/TH).

   i18n: static text lives as twin spans in the HTML —
     <span lang="en">English</span><span lang="th">ไทย</span>
   toggled by CSS via html[data-lang]. Dynamic text (diagrams,
   code, quiz) uses {en, th} objects resolved through t(); a
   redraw is registered with onLang() so it follows the toggle.
   ============================================================ */
(function () {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ============================================================
     i18n engine
     ============================================================ */
  let LANG = root.getAttribute('data-lang') || 'en';
  const t = (v) => (v && typeof v === 'object' && !Array.isArray(v))
    ? (v[LANG] ?? v.en ?? Object.values(v)[0]) : v;
  const langHooks = [];
  const onLang = (fn) => { langHooks.push(fn); };
  function setLang(l) {
    LANG = l;
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l);
    try { localStorage.setItem('kp-lang', l); } catch (e) {}
    langHooks.forEach((fn) => fn());
  }
  const langBtn = $('#langBtn');
  if (langBtn) langBtn.addEventListener('click', () => setLang(LANG === 'th' ? 'en' : 'th'));

  /* ---------- theme: set before paint in <head> ---------- */
  const themeBtn = $('#themeBtn');
  function setTheme(tm) {
    if (tm === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('kp-theme', tm); } catch (e) {}
    if (themeBtn) themeBtn.setAttribute('aria-pressed', tm === 'light' ? 'true' : 'false');
  }
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'light' ? 'true' : 'false');
    themeBtn.addEventListener('click', () =>
      setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
  }

  /* ---------- nav scrolled state + scroll progress ---------- */
  const nav = $('#nav'), progress = $('#scrollProgress');
  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 8);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  const revIo = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        const sibs = $$('.reveal', e.target.parentElement).indexOf(e.target);
        e.target.style.transitionDelay = Math.min(Math.max(sibs, 0), 4) * 70 + 'ms';
        e.target.classList.add('in');
        revIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((n) => revIo.observe(n));

  /* ---------- PDF export ---------- */
  const pdfBtn = $('#pdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', () => window.print());

  // expand every <details> while printing (so FAQ answers show in the PDF), then restore
  window.addEventListener('beforeprint', () => $$('details').forEach((d) => {
    d.dataset.kpOpen = d.open ? '1' : '0'; d.open = true;
  }));
  window.addEventListener('afterprint', () => $$('details').forEach((d) => {
    d.open = d.dataset.kpOpen === '1';
  }));

  /* ============================================================
     SHIKI code rendering (CDN, progressive enhancement)
     ============================================================ */
  const _esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const _codeHosts = [];
  function renderCode(host, code, lang) {
    if (!host) return;
    const rec = _codeHosts.find((r) => r.el === host);
    if (rec) { rec.code = code; rec.lang = lang; } else { _codeHosts.push({ el: host, code, lang }); }
    host.innerHTML = window.codeHL ? window.codeHL(code, lang) : '<pre class="cb-plain">' + _esc(code) + '</pre>';
  }
  document.addEventListener('shiki-ready', () => {
    if (!window.codeHL) return;
    _codeHosts.forEach((r) => { r.el.innerHTML = window.codeHL(r.code, r.lang); });
  });

  // generic static code blocks: <div class="code-host" data-src="x" data-lang="kotlin">
  // paired with <script type="text/plain" data-src-for="x">...code...</script>
  // (no-ops on pages that have none)
  $$('[data-src]').forEach((host) => {
    const tag = document.querySelector('[data-src-for="' + host.getAttribute('data-src') + '"]');
    if (tag) renderCode(host, tag.textContent.replace(/^\n+/, '').replace(/\s+$/, ''), host.getAttribute('data-lang') || 'kotlin');
  });

  /* ============================================================
     HEXAGONAL DIAGRAM (#diagramA) — core + ports + adapters
     ============================================================ */
  function buildHex(container) {
    const W = 400, H = 400, cx = W / 2, cy = H / 2;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, container);

    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'hexGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
    el('stop', { offset: '0%',  'stop-color': '#00A3E4' }, grad);
    el('stop', { offset: '100%','stop-color': '#0077AB' }, grad);
    const f = el('filter', { id: 'hexBlur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: '4' }, f);

    const R = 96, pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    const hexPath = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';

    el('path', { d: hexPath, fill: 'rgba(0,163,228,.07)', stroke: 'url(#hexGrad)', 'stroke-width': '2', filter: 'url(#hexBlur)', opacity: '.6' }, svg);
    const hexCore = el('path', { d: hexPath, fill: 'rgba(0,163,228,.06)', stroke: 'url(#hexGrad)', 'stroke-width': '2.4' }, svg);
    hexCore.style.transition = 'fill .25s';

    const t1 = el('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', class: 'svg-label' }, svg);
    t1.textContent = 'Application';
    const t2 = el('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
    t2.textContent = '+ Domain';

    const adapters = [
      { label: 'REST',     x: 56,  y: 70,  side: 'in'  },
      { label: 'CLI',      x: 56,  y: 330, side: 'in'  },
      { label: 'Postgres', x: 344, y: 70,  side: 'out' },
      { label: 'Email',    x: 344, y: 330, side: 'out' },
    ];
    const portPos = [
      [pts[5][0], pts[5][1]],  // REST
      [pts[4][0], pts[4][1]],  // CLI
      [pts[1][0], pts[1][1]],  // Postgres
      [pts[2][0], pts[2][1]],  // Email
    ];

    const flowDots = [];
    adapters.forEach((ad, i) => {
      const [px, py] = portPos[i];
      const inbound = ad.side === 'in';

      const line = el('path', {
        d: `M${ad.x},${ad.y} L${px.toFixed(1)},${py.toFixed(1)}`,
        stroke: 'rgba(0,163,228,.4)', 'stroke-width': '1.6', fill: 'none', 'stroke-dasharray': '4 4'
      }, svg);
      const port = el('circle', { cx: px, cy: py, r: 6, fill: '#0a0c10', stroke: 'url(#hexGrad)', 'stroke-width': '2', class: 'port' }, svg);

      const g = el('g', { class: 'svg-node' }, svg);
      const bw = 76, bh = 34;
      el('rect', { x: ad.x - bw / 2, y: ad.y - bh / 2, width: bw, height: bh, rx: 9,
        class: 'hex-adapter-box', fill: 'rgba(22,27,36,.95)', stroke: 'rgba(0,163,228,.5)', 'stroke-width': '1.4' }, g);
      const lab = el('text', { x: ad.x, y: ad.y + 4, 'text-anchor': 'middle', class: 'svg-label sm' }, g);
      lab.textContent = ad.label;
      const tag = el('text', { x: ad.x, y: ad.y - bh / 2 - 7, 'text-anchor': 'middle',
        class: inbound ? 'svg-label tag-in' : 'svg-label tag-out' }, g);
      tag.textContent = inbound ? '▸ driving' : 'driven ▸';
      tag.style.fontSize = '9px';

      const dot = el('circle', { r: 3.5, fill: '#00A3E4', opacity: '0' }, svg);
      flowDots.push({ dot, from: inbound ? [ad.x, ad.y] : [px, py], to: inbound ? [px, py] : [ad.x, ad.y] });

      g.addEventListener('mouseenter', () => {
        port.setAttribute('r', 9); port.setAttribute('fill', '#00A3E4');
        line.setAttribute('stroke', '#00A3E4'); line.setAttribute('stroke-width', '2.4');
        hexCore.setAttribute('fill', 'rgba(0,163,228,.14)');
      });
      g.addEventListener('mouseleave', () => {
        port.setAttribute('r', 6); port.setAttribute('fill', '#0a0c10');
        line.setAttribute('stroke', 'rgba(0,163,228,.4)'); line.setAttribute('stroke-width', '1.6');
        hexCore.setAttribute('fill', 'rgba(0,163,228,.06)');
      });
    });

    let raf = null, t0 = null;
    function animateFlow(duration = 1500) {
      if (reduceMotion) return;
      cancelAnimationFrame(raf); t0 = null;
      const step = (ts) => {
        if (t0 === null) t0 = ts;
        const p = Math.min((ts - t0) / duration, 1);
        flowDots.forEach((fd) => {
          const x = fd.from[0] + (fd.to[0] - fd.from[0]) * p;
          const y = fd.from[1] + (fd.to[1] - fd.from[1]) * p;
          fd.dot.setAttribute('cx', x); fd.dot.setAttribute('cy', y);
          fd.dot.setAttribute('opacity', p < 0.05 || p > 0.95 ? 0 : 0.95);
        });
        if (p < 1) raf = requestAnimationFrame(step);
        else flowDots.forEach((fd) => fd.dot.setAttribute('opacity', 0));
      };
      raf = requestAnimationFrame(step);
    }
    return { animateFlow };
  }

  /* ============================================================
     CLEAN DIAGRAM (#diagramB) — concentric rings + inward arrows
     ============================================================ */
  const cleanRings = [
    { r: 185, label: 'Frameworks & Drivers', sub: 'DB · Web · UI · Devices', op: .05,
      desc: { en: 'Outermost — volatile details: framework, database, UI all live here and depend inward only.',
              th: 'ชั้นนอกสุด — รายละเอียดที่เปลี่ยนบ่อย: framework, database, UI ทั้งหมดอยู่ตรงนี้ และพึ่งพาเข้าด้านในเท่านั้น' } },
    { r: 142, label: 'Interface Adapters', sub: 'Controller · Presenter · Gateway', op: .09,
      desc: { en: 'Translates between the outside world and use cases — Controller takes the request, Presenter shapes output, Gateway wraps the DB.',
              th: 'แปลงข้อมูลระหว่างโลกภายนอกกับ use case — Controller รับ request, Presenter จัดรูป output, Gateway ห่อ DB' } },
    { r: 98,  label: 'Use Cases', sub: 'Application Business Rules', op: .14,
      desc: { en: 'Orchestrates the app flow — drives entities through app-specific scenarios (e.g. RegisterUser).',
              th: 'orchestrate flow ของแอป — เรียก entities ทำงานตาม scenario เฉพาะของแอปพลิเคชัน (เช่น RegisterUser)' } },
    { r: 52,  label: 'Entities', sub: 'Enterprise Rules', op: .22,
      desc: { en: 'The innermost core — business rules that hold true with or without this app, knowing nothing outside.',
              th: 'แก่นในสุด — business rules ที่เป็นจริงไม่ว่าจะมีแอปนี้หรือไม่ ไม่รู้จักอะไรข้างนอกเลย' } },
  ];
  const ringDefault = { title: 'Dependency Rule',
    body: { en: 'Inner layers must not know the outer ones — click a ring to explore.',
            th: 'ชั้นในห้ามรู้จักชั้นนอก — คลิกวงเพื่อสำรวจ' } };
  let cleanActive = null;   // remembers which ring is selected across lang/redraw

  function setRingInfo(infoBox, idx) {
    if (!infoBox) return;
    const title = idx == null ? ringDefault.title : cleanRings[idx].label;
    const body  = idx == null ? t(ringDefault.body) : t(cleanRings[idx].desc);
    infoBox.querySelector('.ring-info-title').textContent = title;
    infoBox.querySelector('.ring-info-body').textContent = body;
  }

  function buildClean(container, infoBox) {
    const W = 400, H = 400, cx = W / 2, cy = H / 2;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, container);
    const defs = el('defs', {}, svg);
    const grad = el('radialGradient', { id: 'cleanGrad' }, defs);
    el('stop', { offset: '0%',  'stop-color': '#77C3E3' }, grad);
    el('stop', { offset: '100%','stop-color': '#0E5C99' }, grad);

    cleanRings.forEach((ring, i) => {
      const c = el('circle', { cx, cy, r: ring.r,
        fill: `rgba(119,195,227,${ring.op})`,
        stroke: 'rgba(119,195,227,.5)', 'stroke-width': i === 3 ? 2 : 1.4, class: 'svg-node' }, svg);
      c.style.transition = 'fill .25s, stroke .25s';

      const ly = cy - ring.r + (i === 3 ? 4 : 18);
      const tl = el('text', { x: cx, y: ly, 'text-anchor': 'middle', class: 'svg-label' }, svg);
      tl.textContent = ring.label;
      tl.style.fontSize = i === 3 ? '11px' : '12px';
      tl.style.pointerEvents = 'none';
      if (i !== 3) {
        const ts = el('text', { x: cx, y: ly + 14, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
        ts.textContent = ring.sub; ts.style.fontSize = '9px'; ts.style.pointerEvents = 'none';
      }

      const activate = () => {
        cleanActive = i;
        $$('circle.svg-node', svg).forEach((cc) => cc.setAttribute('stroke', 'rgba(119,195,227,.5)'));
        c.setAttribute('stroke', '#00A3E4');
        c.setAttribute('fill', `rgba(119,195,227,${ring.op + 0.12})`);
        setTimeout(() => c.setAttribute('fill', `rgba(119,195,227,${ring.op})`), 600);
        setRingInfo(infoBox, i);
        if (infoBox) { infoBox.style.borderColor = '#00A3E4'; setTimeout(() => (infoBox.style.borderColor = ''), 500); }
      };
      c.addEventListener('click', activate);
      c.addEventListener('mouseenter', activate);
    });

    // inward dependency arrows
    const arrowDefs = el('marker', { id: 'arrowIn', viewBox: '0 0 10 10', refX: '8', refY: '5',
      markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#00A3E4' }, arrowDefs);
    [[0, -1], [1, 0], [0, 1], [-1, 0], [0.7, -0.7], [-0.7, 0.7]].forEach(([dx, dy]) => {
      el('line', { x1: cx + dx * 178, y1: cy + dy * 178, x2: cx + dx * 62, y2: cy + dy * 62,
        stroke: 'rgba(119,195,227,.55)', 'stroke-width': '1.6', 'marker-end': 'url(#arrowIn)' }, svg);
    });

    if (!reduceMotion) {
      const spin = el('circle', { cx, cy, r: 165, fill: 'none',
        stroke: 'rgba(119,195,227,.25)', 'stroke-width': '1', 'stroke-dasharray': '2 10' }, svg);
      el('animateTransform', { attributeName: 'transform', type: 'rotate',
        from: `0 ${cx} ${cy}`, to: `360 ${cx} ${cy}`, dur: '40s', repeatCount: 'indefinite' }, spin);
    }

    const cap = el('text', { x: cx, y: cy + 36, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
    cap.textContent = t({ en: '→ dependencies point in', th: '→ dependencies ชี้เข้า' });
    cap.style.fontSize = '9px'; cap.style.pointerEvents = 'none';

    setRingInfo(infoBox, cleanActive);
  }

  /* ============================================================
     HERO mini diagram (#heroStage) — hexagon → rings
     ============================================================ */
  function buildHeroStage(container) {
    const W = 420, H = 150;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, container);
    const defs = el('defs', {}, svg);
    const g1 = el('linearGradient', { id: 'hg', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#00A3E4' }, g1);
    el('stop', { offset: '100%', 'stop-color': '#0E5C99' }, g1);

    const hx = 95, hy = 75, R = 46, pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push([hx + R * Math.cos(a), hy + R * Math.sin(a)]);
    }
    el('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z',
      fill: 'rgba(0,163,228,.08)', stroke: '#00A3E4', 'stroke-width': '2' }, svg);
    const lab1 = el('text', { x: hx, y: hy + 4, 'text-anchor': 'middle', class: 'svg-label sm hero-lab-hex' }, svg);
    lab1.textContent = 'Hexagonal';

    const rx = 325, ry = 75;
    [40, 28, 16].forEach((r, i) =>
      el('circle', { cx: rx, cy: ry, r, fill: `rgba(119,195,227,${.06 + i * .05})`,
        stroke: '#0E5C99', 'stroke-width': '1.4' }, svg));
    const lab2 = el('text', { x: rx, y: ry + 58, 'text-anchor': 'middle', class: 'svg-label sm hero-lab-clean' }, svg);
    lab2.textContent = 'Clean';

    el('line', { x1: hx + R + 6, y1: hy, x2: rx - 44, y2: ry, stroke: 'url(#hg)', 'stroke-width': '1.6',
      'stroke-dasharray': '5 6', opacity: '.6' }, svg);
    if (!reduceMotion) {
      const dot = el('circle', { r: 4, fill: '#fff' }, svg);
      el('animateMotion', { dur: '2.6s', repeatCount: 'indefinite',
        path: `M${hx + R + 6},${hy} L${rx - 44},${ry}` }, dot);
    }
  }

  /* ---------- mount diagrams (repaint clears + redraws on lang switch) ---------- */
  let hexHandle = null;
  function paintHex()   { const m = $('#diagramA'); if (!m) return; m.innerHTML = ''; hexHandle = buildHex(m); }
  function paintClean() { const m = $('#diagramB'); if (!m) return; m.innerHTML = ''; buildClean(m, $('#ringInfo')); }
  function paintHero()  { const m = $('#heroStage'); if (!m) return; m.innerHTML = ''; buildHeroStage(m); }
  paintHex(); paintClean(); paintHero();
  onLang(() => { paintHex(); paintClean(); paintHero(); });

  // hex flow button + auto-play in view
  const hexBtn = $('#diagramAFlowBtn');
  if (hexBtn) hexBtn.addEventListener('click', () => hexHandle && hexHandle.animateFlow(1600));
  const hexMount = $('#diagramA');
  if (hexMount) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { hexHandle && hexHandle.animateFlow(1800); io.disconnect(); } });
    }, { threshold: 0.5 });
    io.observe(hexMount);
  }

  /* ============================================================
     INTERACTIVE STRUCTURE EXPLORER  (#structure)
     Hover/click a folder ↔ its concept lights up + caption updates;
     "walk through" steps each concept in order; tree lines build up
     on scroll; the left axis pulses dependencies inward.
     ============================================================ */
  function setupStruct(arch) {
    const card = $(`.struct-card.${arch}`);
    const col  = $(`.concept-col.${arch}`);
    if (!card) return;
    const caption = card.querySelector('.struct-caption');
    const defCap  = caption ? caption.innerHTML : '';
    const grps = $$('.tree-grp', card);
    const cis  = col ? $$('.ci', col) : [];

    // concept -> caption HTML (cloned from the concept list; lang spans kept)
    const capMap = {};
    cis.forEach((ci) => {
      const c = ci.dataset.concept, dt = ci.querySelector('dt'), dd = ci.querySelector('dd');
      if (c && dt && dd) capMap[c] = '<span class="cap-title">' + dt.innerHTML + '</span>' + dd.innerHTML;
    });

    let walking = false, timer = null, idx = -1;
    const clearOn = () => $$('.on', card).concat(col ? $$('.ci.on', col) : [])
      .forEach((e) => e.classList.remove('on'));
    function activate(concept) {
      clearOn();
      grps.filter((g) => g.dataset.concept === concept).forEach((g) => g.classList.add('on'));
      cis.filter((ci) => ci.dataset.concept === concept).forEach((ci) => ci.classList.add('on'));
      if (caption && capMap[concept]) caption.innerHTML = capMap[concept];
    }
    function reset() { clearOn(); if (caption) caption.innerHTML = defCap; }

    grps.forEach((g) => {
      g.addEventListener('mouseenter', () => { if (!walking) activate(g.dataset.concept); });
      g.addEventListener('mouseleave', () => { if (!walking) reset(); });
      g.addEventListener('click', () => { stop(); activate(g.dataset.concept); });
    });
    cis.forEach((ci) => {
      ci.addEventListener('mouseenter', () => { if (!walking) activate(ci.dataset.concept); });
      ci.addEventListener('mouseleave', () => { if (!walking) reset(); });
    });

    const order = grps.map((g) => g.dataset.concept);
    const btn = card.querySelector('.mini-btn');
    function stop() { walking = false; clearTimeout(timer); if (btn) btn.classList.remove('on'); }
    function step() {
      idx++;
      if (idx >= order.length) { idx = -1; stop(); reset(); return; }
      activate(order[idx]);
      timer = setTimeout(step, 2000);
    }
    if (btn) btn.addEventListener('click', () => {
      if (walking) { stop(); reset(); return; }
      walking = true; idx = -1; btn.classList.add('on'); step();
    });

    // build-up: reveal tree lines staggered when scrolled into view
    const tree = $('.tree', card);
    if (tree) {
      const lines = $$('.tree-line', tree);
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            lines.forEach((ln, i) => { ln.style.transitionDelay = (i * 45) + 'ms'; ln.classList.add('in'); });
            io.disconnect();
          }
        });
      }, { threshold: 0.2 });
      io.observe(tree);
    }
  }
  setupStruct('hex');
  setupStruct('clean');

  /* ============================================================
     ADAPTER SWAP DEMO  (core fixed + Postgres / Mongo / In-Memory)
     ============================================================ */
  const coreCodeSrc = {
    en:
`// Port — the contract the core declares
interface UserRepo {
  save(u: User): Promise<void>
}

// Use Case — depends only on the interface
class RegisterUser {
  constructor(private repo: UserRepo) {}

  async exec(u: User) {
    await this.repo.save(u)   // ← unaware of the DB behind it
  }
}`,
    th:
`// Port — สัญญาที่ core ประกาศไว้
interface UserRepo {
  save(u: User): Promise<void>
}

// Use Case — พึ่งแค่ interface
class RegisterUser {
  constructor(private repo: UserRepo) {}

  async exec(u: User) {
    await this.repo.save(u)   // ← ไม่รู้ว่าเบื้องหลังคือ DB อะไร
  }
}`,
  };
  const swapSnippets = {
    postgres: { file: 'infra/postgres.ts', lang: 'ts', code: {
      en:
`// Adapter — implement the Port with Postgres
class PgUserRepo implements UserRepo {
  async save(u: User) {
    await sql\`INSERT INTO users \${u}\`
  }
}

// wire it up at startup (composition root)
new RegisterUser(new PgUserRepo())`,
      th:
`// Adapter — implement Port ด้วย Postgres
class PgUserRepo implements UserRepo {
  async save(u: User) {
    await sql\`INSERT INTO users \${u}\`
  }
}

// ประกอบร่างตอน start (composition root)
new RegisterUser(new PgUserRepo())` } },
    mongo: { file: 'infra/mongo.ts', lang: 'ts', code: {
      en:
`// Adapter — same Port, now with Mongo
class MongoUserRepo implements UserRepo {
  async save(u: User) {
    await db.collection('users').insertOne(u)
  }
}

// only this one line changes
new RegisterUser(new MongoUserRepo())`,
      th:
`// Adapter — implement Port เดียวกัน ด้วย Mongo
class MongoUserRepo implements UserRepo {
  async save(u: User) {
    await db.collection('users').insertOne(u)
  }
}

// เปลี่ยนแค่บรรทัดนี้บรรทัดเดียว
new RegisterUser(new MongoUserRepo())` } },
    memory: { file: 'infra/memory.ts', lang: 'ts', code: {
      en:
`// Adapter — in-memory (great for unit tests!)
class InMemoryUserRepo implements UserRepo {
  users: User[] = []
  async save(u: User) { this.users.push(u) }
}

// tests need no real DB
new RegisterUser(new InMemoryUserRepo())`,
      th:
`// Adapter — in-memory (เหมาะกับ unit test!)
class InMemoryUserRepo implements UserRepo {
  users: User[] = []
  async save(u: User) { this.users.push(u) }
}

// test ไม่ต้องต่อ DB จริง
new RegisterUser(new InMemoryUserRepo())` } },
  };
  const coreCode = $('#coreCode'), swapCode = $('#swapCode'), swapFile = $('#swapFile'), swapCard = $('.adapter-card');
  let currentSwap = 'postgres';
  function setSwap(key, flash = true) {
    const s = swapSnippets[key]; if (!s || !swapCode) return;
    currentSwap = key;
    renderCode(swapCode, t(s.code), s.lang);
    if (swapFile) swapFile.textContent = s.file;
    if (flash && swapCard) { swapCard.classList.remove('flash'); void swapCard.offsetWidth; swapCard.classList.add('flash'); }
  }
  if (coreCode) renderCode(coreCode, t(coreCodeSrc), 'ts');
  $$('#swapSeg .seg-btn').forEach((b) => b.addEventListener('click', () => {
    $$('#swapSeg .seg-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); setSwap(b.dataset.variant);
  }));
  if (swapCode) setSwap('postgres', false);
  onLang(() => {
    if (coreCode) renderCode(coreCode, t(coreCodeSrc), 'ts');
    setSwap(currentSwap, false);
  });

  /* ============================================================
     TESTING EXAMPLE  (Shiki, bilingual comments)
     ============================================================ */
  const testSrc = {
    en:
`// Core test — no DB, no framework, milliseconds fast
const repo = new InMemoryUserRepo()      // swap the port for a fake
const useCase = new RegisterUser(repo)

await useCase.exec({ id: 1, name: 'Bird' })

expect(repo.users).toHaveLength(1)       // assert against the fake`,
    th:
`// เทส core — ไม่ต่อ DB ไม่ใช้ framework เร็วระดับมิลลิวินาที
const repo = new InMemoryUserRepo()      // สลับ port เป็นของปลอม
const useCase = new RegisterUser(repo)

await useCase.exec({ id: 1, name: 'Bird' })

expect(repo.users).toHaveLength(1)       // assert กับของปลอม`,
  };
  const testCode = $('#testCode');
  if (testCode) {
    renderCode(testCode, t(testSrc), 'ts');
    onLang(() => renderCode(testCode, t(testSrc), 'ts'));
  }

  /* ============================================================
     MULTI-LANGUAGE CODE TABS  (Port · Use Case · Adapter, 5 langs)
     ============================================================ */
  const LANGS = [
    { id: 'typescript', icon: 'ts', name: 'TypeScript', file: 'user.ts',
      note: { en: '<b>Constructor injection</b> + <code>implements</code> — the core receives <code>UserRepo</code> via the constructor, never the concrete class.',
              th: '<b>Constructor injection</b> + <code>implements</code> — core รับ <code>UserRepo</code> ผ่าน constructor ไม่รู้จัก class จริง' },
      code:
`// Port — the contract the core declares
interface UserRepo {
  save(u: User): Promise<void>
}

// Use Case — depends only on the interface
class RegisterUser {
  constructor(private repo: UserRepo) {}

  async exec(u: User) {
    await this.repo.save(u)
  }
}

// Adapter — the infrastructure side
class PgUserRepo implements UserRepo {
  async save(u: User) {
    await sql\`INSERT INTO users ...\`
  }
}` },
    { id: 'kotlin', icon: 'kotlin', name: 'Kotlin', file: 'User.kt',
      note: { en: '<b>Primary constructor</b> takes the port directly — <code>suspend</code> keeps async clean inside the Port signature.',
              th: '<b>Primary constructor</b> รับ port ตรงๆ — <code>suspend</code> ทำให้ async อยู่ใน signature ของ Port ได้สะอาด' },
      code:
`// Port
interface UserRepo {
    suspend fun save(u: User)
}

// Use Case — receives the port via constructor
class RegisterUser(private val repo: UserRepo) {
    suspend fun exec(u: User) = repo.save(u)
}

// Adapter
class PgUserRepo : UserRepo {
    override suspend fun save(u: User) {
        // INSERT INTO users ...
    }
}` },
    { id: 'go', icon: 'go', name: 'Go', file: 'user.go',
      note: { en: '<b>Implicit interface</b> — <code>PgUserRepo</code> never declares it implements anything; having the method is enough to be a <code>UserRepo</code>.',
              th: '<b>Implicit interface</b> — <code>PgUserRepo</code> ไม่ต้องประกาศว่า implements อะไร แค่มี method ครบก็ใช้เป็น <code>UserRepo</code> ได้' },
      code:
`// Port
type UserRepo interface {
    Save(u User) error
}

// Use Case — holds the interface
type RegisterUser struct {
    repo UserRepo
}

func (r RegisterUser) Exec(u User) error {
    return r.repo.Save(u)
}

// Adapter — satisfies UserRepo automatically
type PgUserRepo struct{ db *sql.DB }

func (p PgUserRepo) Save(u User) error {
    _, err := p.db.Exec("INSERT INTO users ...")
    return err
}` },
    { id: 'java', icon: 'java', name: 'Java', file: 'User.java',
      note: { en: '<b>Classic constructor injection</b> — usually paired with Spring DI, yet the core stays a plain POJO with no framework ties.',
              th: '<b>Constructor injection</b> แบบคลาสสิก — มักจับคู่กับ Spring DI แต่ที่ core เป็นแค่ POJO ไม่ผูก framework' },
      code:
`// Port
interface UserRepo {
    void save(User u);
}

// Use Case
class RegisterUser {
    private final UserRepo repo;

    RegisterUser(UserRepo repo) {
        this.repo = repo;
    }

    void exec(User u) {
        repo.save(u);
    }
}

// Adapter
class PgUserRepo implements UserRepo {
    public void save(User u) {
        // INSERT INTO users ...
    }
}` },
    { id: 'rust', icon: 'rust', name: 'Rust', file: 'user.rs',
      note: { en: '<b>Trait + generic</b> — the core is generic over <code>R: UserRepo</code> for zero-cost abstraction (or use <code>Box&lt;dyn UserRepo&gt;</code> for runtime dispatch).',
              th: '<b>Trait + generic</b> — core เป็น generic เหนือ <code>R: UserRepo</code> ได้ zero-cost abstraction (หรือใช้ <code>Box&lt;dyn UserRepo&gt;</code> ถ้าต้องการ runtime dispatch)' },
      code:
`// Port
trait UserRepo {
    fn save(&self, u: &User);
}

// Use Case — generic over the port
struct RegisterUser<R: UserRepo> {
    repo: R,
}

impl<R: UserRepo> RegisterUser<R> {
    fn exec(&self, u: &User) {
        self.repo.save(u);
    }
}

// Adapter
struct PgUserRepo;

impl UserRepo for PgUserRepo {
    fn save(&self, u: &User) {
        // INSERT INTO users ...
    }
}` },
  ];
  const langIcon = (id) => {
    const map = { ts: '#3178c6', kotlin: '#a97bff', go: '#00add8', java: '#f89820', rust: '#dea584' };
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="${map[id] || '#888'}"/></svg>`;
  };
  const tabsWrap = $('#langTabs'), langCode = $('#langCode'), langFile = $('#langFile'), langTag = $('#langTag'), langNote = $('#langNote');
  let currentLangIdx = 0;
  function selectLang(idx) {
    const L = LANGS[idx]; if (!L) return;
    currentLangIdx = idx;
    $$('.lang-tab', tabsWrap).forEach((tab, i) => {
      const on = i === idx;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false'); tab.tabIndex = on ? 0 : -1;
    });
    renderCode(langCode, L.code, L.id);
    if (langFile) langFile.textContent = L.file;
    if (langTag) langTag.textContent = L.name;
    if (langNote) langNote.innerHTML = t(L.note);
  }
  if (tabsWrap) {
    LANGS.forEach((L, i) => {
      const b = document.createElement('button');
      b.className = 'lang-tab'; b.setAttribute('role', 'tab'); b.tabIndex = -1;
      b.innerHTML = langIcon(L.icon) + '<span>' + L.name + '</span>';
      b.addEventListener('click', () => selectLang(i));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const n = (i + dir + LANGS.length) % LANGS.length;
          selectLang(n); $$('.lang-tab', tabsWrap)[n].focus();
        }
      });
      tabsWrap.appendChild(b);
    });
    selectLang(0);
  }
  onLang(() => selectLang(currentLangIdx));   // re-render note (and keep code) in new language

  /* ============================================================
     DECISION QUIZ  (a = Hexagonal, b = Clean, tie = blend)
     ============================================================ */
  const quiz = $('#quiz');
  if (quiz) {
    const scores = {};
    let lastKey = null;
    const RESULTS = {
      a:   { badge: '⬡ Hexagonal', cls: 'a',
             text: { en: 'A fit for Hexagonal — start light and flexible, focus on in/out boundaries via Ports & Adapters, and shape the inner structure however your team prefers.',
                     th: 'เหมาะกับ Hexagonal — เริ่มเบา ยืดหยุ่น โฟกัสที่ขอบเขต in/out ผ่าน Port & Adapter ปรับโครงสร้างภายในได้อิสระตามที่ทีมถนัด' } },
      b:   { badge: '◎ Clean', cls: 'b',
             text: { en: 'A fit for Clean Architecture — a clear blueprint for every component (Entity / Use Case / Adapter / Framework) helps large, long-lived teams keep Dependency-Rule discipline.',
                     th: 'เหมาะกับ Clean Architecture — มีแบบแผนชัดทุก component (Entity / Use Case / Adapter / Framework) ช่วยทีมใหญ่และโปรเจกต์อายุยืนรักษาวินัย Dependency Rule ได้ดี' } },
      mix: { badge: '⬡ + ◎ a blend', cls: 'mix',
             text: { en: "Your profile is balanced — start with Hexagonal's Ports & Adapters for flexibility, then layer in Clean's Use Case / Entity split as the domain grows. Many teams take this path.",
                     th: 'โปรไฟล์คุณก้ำกึ่ง — เริ่มด้วย Ports & Adapters ของ Hexagonal เพื่อความยืดหยุ่น แล้วค่อยจัดชั้น Use Case / Entity แบบ Clean เมื่อ domain โตขึ้น เป็นทางที่หลายทีมเลือก' } },
    };
    function paintResult() {
      if (!lastKey) return;
      const r = RESULTS[lastKey], res = $('#quizResult'), badge = $('#resultBadge');
      if (badge) { badge.className = 'result-badge ' + r.cls; badge.textContent = r.badge; }
      if ($('#resultText')) $('#resultText').textContent = t(r.text);
      if (res) res.hidden = false;
    }
    function tally() {
      const all = $$('.quiz-q', quiz);
      const answered = all.filter((q) => q.querySelector('button.picked'));
      if (answered.length < all.length) return;
      let a = 0, b = 0;
      Object.values(scores).forEach((s) => (s === 'a' ? a++ : b++));
      lastKey = a > b ? 'a' : b > a ? 'b' : 'mix';
      paintResult();
      const res = $('#quizResult');
      if (res) res.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    $$('.quiz-q', quiz).forEach((q) => {
      const step = q.dataset.step;
      $$('button', q).forEach((b) => b.addEventListener('click', () => {
        $$('button', q).forEach((x) => x.classList.remove('picked'));
        b.classList.add('picked'); scores[step] = b.dataset.score; tally();
      }));
    });
    const reset = $('#quizReset');
    if (reset) reset.addEventListener('click', () => {
      $$('button.picked', quiz).forEach((b) => b.classList.remove('picked'));
      for (const k in scores) delete scores[k];
      lastKey = null;
      if ($('#quizResult')) $('#quizResult').hidden = true;
    });
    onLang(paintResult);   // re-render shown result in new language
  }
})();
