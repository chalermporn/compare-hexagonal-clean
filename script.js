/* ============================================================
   ArchCompare — interactivity & SVG diagrams
   vanilla JS, no deps
   ============================================================ */
(() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ---------- scroll progress + nav ---------- */
  const prog = $('#scrollProgress');
  const nav  = $('#nav');
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    nav.classList.toggle('scrolled', h.scrollTop > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const sibs = $$('.reveal', e.target.parentElement).indexOf(e.target);
        e.target.style.transitionDelay = Math.min(sibs, 4) * 70 + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((n) => io.observe(n));

  /* ============================================================
     HEXAGONAL DIAGRAM
     ============================================================ */
  function buildHex(container, opts = {}) {
    const W = 400, H = 400, cx = W / 2, cy = H / 2;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, container);

    // defs: gradient + glow
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'hexGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
    el('stop', { offset: '0%',  'stop-color': '#38BDF8' }, grad);
    el('stop', { offset: '100%','stop-color': '#1BA5E1' }, grad);
    const f = el('filter', { id: 'hexBlur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: '4' }, f);

    // hexagon path (pointy-top)
    const R = 96;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    const hexPath = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z';

    el('path', { d: hexPath, fill: 'rgba(56,189,248,.07)', stroke: 'url(#hexGrad)', 'stroke-width': '2', filter: 'url(#hexBlur)', opacity: '.6' }, svg);
    const hexCore = el('path', { d: hexPath, fill: 'rgba(56,189,248,.06)', stroke: 'url(#hexGrad)', 'stroke-width': '2.4' }, svg);
    hexCore.style.transition = 'fill .25s';

    // core labels
    const t1 = el('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', class: 'svg-label' }, svg);
    t1.textContent = 'Application';
    const t2 = el('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
    t2.textContent = '+ Domain';

    // adapters: driving (left/top), driven (right/bottom)
    const adapters = [
      { label: 'REST',     x: 56,  y: 70,  side: 'in',  desc: 'Driving · HTTP controller เรียกเข้า core' },
      { label: 'CLI',      x: 56,  y: 330, side: 'in',  desc: 'Driving · command line เรียก use case เดียวกัน' },
      { label: 'Postgres', x: 344, y: 70,  side: 'out', desc: 'Driven · core สั่งบันทึกผ่าน Port' },
      { label: 'Email',    x: 344, y: 330, side: 'out', desc: 'Driven · ส่งเมลผ่าน adapter ไม่ผูกกับ core' },
    ];

    // port anchor points on hexagon edges (approx nearest vertices)
    const portPos = [
      [pts[5][0], pts[5][1]],  // top-left  -> REST
      [pts[4][0], pts[4][1]],  // bottom-left -> CLI
      [pts[1][0], pts[1][1]],  // top-right -> Postgres
      [pts[2][0], pts[2][1]],  // bottom-right -> Email
    ];

    const flowDots = [];

    adapters.forEach((ad, i) => {
      const [px, py] = portPos[i];
      const inbound = ad.side === 'in';

      // connector line
      const line = el('path', {
        d: `M${ad.x},${ad.y} L${px.toFixed(1)},${py.toFixed(1)}`,
        stroke: 'rgba(56,189,248,.4)', 'stroke-width': '1.6', fill: 'none',
        'stroke-dasharray': '4 4'
      }, svg);

      // port node on hexagon edge
      const port = el('circle', { cx: px, cy: py, r: 6, fill: '#0a0c10', stroke: 'url(#hexGrad)', 'stroke-width': '2', class: 'port' }, svg);

      // adapter box
      const g = el('g', { class: 'svg-node' }, svg);
      const bw = 76, bh = 34;
      el('rect', { x: ad.x - bw / 2, y: ad.y - bh / 2, width: bw, height: bh, rx: 9,
        class: 'hex-adapter-box',
        fill: 'rgba(22,27,36,.95)', stroke: 'rgba(56,189,248,.5)', 'stroke-width': '1.4' }, g);
      const lab = el('text', { x: ad.x, y: ad.y + 4, 'text-anchor': 'middle', class: 'svg-label sm' }, g);
      lab.textContent = ad.label;
      const tag = el('text', { x: ad.x, y: ad.y - bh / 2 - 7, 'text-anchor': 'middle', class: 'svg-label sm' }, g);
      tag.textContent = inbound ? '▸ driving' : 'driven ▸';
      tag.setAttribute('class', inbound ? 'svg-label tag-in' : 'svg-label tag-out');
      tag.style.fontSize = '9px';

      // a flow dot per connector
      const dot = el('circle', { r: 3.5, fill: '#38BDF8', opacity: '0' }, svg);
      flowDots.push({ dot, from: inbound ? [ad.x, ad.y] : [px, py], to: inbound ? [px, py] : [ad.x, ad.y] });

      // interactions
      g.addEventListener('mouseenter', () => {
        port.setAttribute('r', 9); port.setAttribute('fill', '#38BDF8');
        line.setAttribute('stroke', '#38BDF8'); line.setAttribute('stroke-width', '2.4');
        hexCore.setAttribute('fill', 'rgba(56,189,248,.14)');
        if (opts.onHover) opts.onHover(ad.desc);
      });
      g.addEventListener('mouseleave', () => {
        port.setAttribute('r', 6); port.setAttribute('fill', '#0a0c10');
        line.setAttribute('stroke', 'rgba(56,189,248,.4)'); line.setAttribute('stroke-width', '1.6');
        hexCore.setAttribute('fill', 'rgba(56,189,248,.06)');
        if (opts.onHover) opts.onHover('');
      });
    });

    // flow animation
    let raf = null, t0 = null;
    function animateFlow(duration = 1500) {
      if (reduceMotion) return;
      cancelAnimationFrame(raf); t0 = null;
      const step = (ts) => {
        if (t0 === null) t0 = ts;
        const p = Math.min((ts - t0) / duration, 1);
        flowDots.forEach((fd, idx) => {
          const local = (p + idx * 0.0) % 1;
          const x = fd.from[0] + (fd.to[0] - fd.from[0]) * local;
          const y = fd.from[1] + (fd.to[1] - fd.from[1]) * local;
          fd.dot.setAttribute('cx', x);
          fd.dot.setAttribute('cy', y);
          fd.dot.setAttribute('opacity', local < 0.05 || local > 0.95 ? 0 : 0.95);
        });
        if (p < 1) raf = requestAnimationFrame(step);
        else flowDots.forEach((fd) => fd.dot.setAttribute('opacity', 0));
      };
      raf = requestAnimationFrame(step);
    }
    return { animateFlow };
  }

  /* ============================================================
     CLEAN DIAGRAM (concentric rings)
     ============================================================ */
  function buildClean(container, infoBox) {
    const W = 400, H = 400, cx = W / 2, cy = H / 2;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, container);
    const defs = el('defs', {}, svg);
    const grad = el('radialGradient', { id: 'cleanGrad' }, defs);
    el('stop', { offset: '0%',  'stop-color': '#5AA9E6' }, grad);
    el('stop', { offset: '100%','stop-color': '#1B6FB8' }, grad);

    const rings = [
      { r: 185, label: 'Frameworks & Drivers', sub: 'DB · Web · UI · Devices', op: .05,
        desc: 'ชั้นนอกสุด — รายละเอียดที่เปลี่ยนบ่อย: framework, database, UI ทั้งหมดอยู่ตรงนี้ และพึ่งพาเข้าด้านในเท่านั้น' },
      { r: 142, label: 'Interface Adapters', sub: 'Controller · Presenter · Gateway', op: .09,
        desc: 'แปลงข้อมูลระหว่างโลกภายนอกกับ use case — Controller รับ request, Presenter จัดรูป output, Gateway ห่อ DB' },
      { r: 98,  label: 'Use Cases', sub: 'Application Business Rules', op: .14,
        desc: 'orchestrate flow ของแอป — เรียก entities ทำงานตาม scenario เฉพาะของแอปพลิเคชัน (เช่น RegisterUser)' },
      { r: 52,  label: 'Entities', sub: 'Enterprise Rules', op: .22,
        desc: 'แก่นในสุด — business rules ที่เป็นจริงไม่ว่าจะมีแอปนี้หรือไม่ ไม่รู้จักอะไรข้างนอกเลย' },
    ];

    rings.forEach((ring, i) => {
      const c = el('circle', { cx, cy, r: ring.r,
        fill: `rgba(91,169,230,${ring.op})`,
        stroke: 'rgba(91,169,230,.45)', 'stroke-width': i === 3 ? 2 : 1.4,
        class: 'svg-node' }, svg);
      c.style.transition = 'fill .25s, stroke .25s';

      // labels positioned at top of each ring band
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
        rings.forEach((_, j) => {}); // reset handled by stroke below
        $$('circle.svg-node', svg).forEach((cc) => cc.setAttribute('stroke', 'rgba(91,169,230,.45)'));
        c.setAttribute('stroke', '#2E86C9');
        c.setAttribute('fill', `rgba(91,169,230,${ring.op + 0.12})`);
        setTimeout(() => c.setAttribute('fill', `rgba(91,169,230,${ring.op})`), 600);
        if (infoBox) {
          infoBox.querySelector('.ring-info-title').textContent = ring.label;
          infoBox.querySelector('.ring-info-body').textContent = ring.desc;
          infoBox.style.borderColor = '#2E86C9';
          setTimeout(() => (infoBox.style.borderColor = ''), 500);
        }
      };
      c.addEventListener('click', activate);
      c.addEventListener('mouseenter', activate);
    });

    // inward dependency arrows
    const arrowDefs = el('marker', { id: 'arrowIn', viewBox: '0 0 10 10', refX: '8', refY: '5',
      markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#2E86C9' }, arrowDefs);

    const dirs = [ [0, -1], [1, 0], [0, 1], [-1, 0], [0.7, -0.7], [-0.7, 0.7] ];
    dirs.forEach(([dx, dy]) => {
      const x1 = cx + dx * 178, y1 = cy + dy * 178;
      const x2 = cx + dx * 62,  y2 = cy + dy * 62;
      el('line', { x1, y1, x2, y2, stroke: 'rgba(91,169,230,.55)', 'stroke-width': '1.6',
        'marker-end': 'url(#arrowIn)' }, svg);
    });

    // rotating dashed hint ring
    if (!reduceMotion) {
      const spin = el('circle', { cx, cy, r: 165, fill: 'none',
        stroke: 'rgba(91,169,230,.25)', 'stroke-width': '1', 'stroke-dasharray': '2 10' }, svg);
      spin.style.transformOrigin = `${cx}px ${cy}px`;
      const anim = el('animateTransform', {
        attributeName: 'transform', type: 'rotate',
        from: `0 ${cx} ${cy}`, to: `360 ${cx} ${cy}`, dur: '40s', repeatCount: 'indefinite'
      }, spin);
    }

    // center caption
    const cap = el('text', { x: cx, y: cy + 36, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
    cap.textContent = '→ dependencies ชี้เข้า';
    cap.style.fontSize = '9px'; cap.style.pointerEvents = 'none';
  }

  /* ============================================================
     HERO mini diagram (morph hint between the two)
     ============================================================ */
  function buildHeroStage(container) {
    const W = 420, H = 150;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, container);
    const defs = el('defs', {}, svg);
    const g1 = el('linearGradient', { id: 'hg', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#38BDF8' }, g1);
    el('stop', { offset: '100%', 'stop-color': '#2E86C9' }, g1);

    // left hexagon
    const hx = 95, hy = 75, R = 46;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push([hx + R * Math.cos(a), hy + R * Math.sin(a)]);
    }
    el('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + ' Z',
      fill: 'rgba(56,189,248,.08)', stroke: '#38BDF8', 'stroke-width': '2' }, svg);
    const lab1 = el('text', { x: hx, y: hy + 4, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
    lab1.textContent = 'Hexagonal'; lab1.setAttribute('class', 'svg-label sm hero-lab-hex');

    // right concentric rings
    const rx = 325, ry = 75;
    [40, 28, 16].forEach((r, i) =>
      el('circle', { cx: rx, cy: ry, r, fill: `rgba(91,169,230,${.06 + i * .05})`,
        stroke: '#2E86C9', 'stroke-width': '1.4' }, svg));
    const lab2 = el('text', { x: rx, y: ry + 58, 'text-anchor': 'middle', class: 'svg-label sm' }, svg);
    lab2.textContent = 'Clean'; lab2.setAttribute('class', 'svg-label sm hero-lab-clean');

    // connecting flow line w/ moving dot
    el('line', { x1: hx + R + 6, y1: hy, x2: rx - 44, y2: ry, stroke: 'url(#hg)', 'stroke-width': '1.6',
      'stroke-dasharray': '5 6', opacity: '.6' }, svg);
    if (!reduceMotion) {
      const dot = el('circle', { r: 4, fill: '#fff' }, svg);
      const am = el('animateMotion', { dur: '2.6s', repeatCount: 'indefinite',
        path: `M${hx + R + 6},${hy} L${rx - 44},${ry}` }, dot);
    }
  }

  /* ---------- init diagrams ---------- */
  const hexInfoCb = (msg) => { /* could show tooltip; reuse hint */ };
  const hex = buildHex($('#hexDiagram'), { onHover: hexInfoCb });
  buildClean($('#cleanDiagram'), $('#ringInfo'));
  buildHeroStage($('#heroStage'));

  // hex flow button + auto-play when in view
  const hexBtn = $('#hexFlowBtn');
  if (hexBtn) hexBtn.addEventListener('click', () => hex.animateFlow(1600));
  const hexVisIo = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { hex.animateFlow(1800); hexVisIo.disconnect(); } });
  }, { threshold: 0.5 });
  hexVisIo.observe($('#hexDiagram'));

  /* ============================================================
     SHIKI code rendering (CDN, progressive enhancement)
     Stores raw source; Shiki colourises once loaded, plain text before.
     ============================================================ */
  const _escCode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const _codeHosts = [];
  function renderCode(el, code, lang) {
    if (!el) return;
    const rec = _codeHosts.find((r) => r.el === el);
    if (rec) { rec.code = code; rec.lang = lang; } else { _codeHosts.push({ el, code, lang }); }
    el.innerHTML = window.codeHL
      ? window.codeHL(code, lang)
      : '<pre class="cb-plain">' + _escCode(code) + '</pre>';
  }
  document.addEventListener('shiki-ready', () => {
    if (!window.codeHL) return;
    _codeHosts.forEach((r) => { r.el.innerHTML = window.codeHL(r.code, r.lang); });
  });

  // static core/usecase.ts block
  renderCode($('#coreCode'),
`// Port (สัญญา) ที่ core ประกาศไว้
interface UserRepo {
  save(u: User): Promise<void>
}

// Use Case — พึ่งแค่ interface
class RegisterUser {
  constructor(private repo: UserRepo) {}

  async exec(u: User) {
    await this.repo.save(u)   // ← ไม่รู้ว่าเบื้องหลังคือ DB อะไร
  }
}`, 'ts');

  /* ============================================================
     DEPENDENCY RULE — adapter swap demo
     ============================================================ */
  const adapterSnippets = {
    postgres: {
      file: 'infra/postgres.ts', lang: 'ts',
      code:
`// Adapter — implement Port ด้วย Postgres
class PgUserRepo implements UserRepo {
  async save(u: User) {
    await sql\`INSERT INTO users \${u}\`
  }
}

// ประกอบร่างตอน start (composition root)
new RegisterUser(new PgUserRepo())`
    },
    mongo: {
      file: 'infra/mongo.ts', lang: 'ts',
      code:
`// Adapter — implement Port เดียวกัน ด้วย Mongo
class MongoUserRepo implements UserRepo {
  async save(u: User) {
    await db.collection('users').insertOne(u)
  }
}

// เปลี่ยนแค่บรรทัดนี้บรรทัดเดียว
new RegisterUser(new MongoUserRepo())`
    },
    memory: {
      file: 'infra/memory.ts', lang: 'ts',
      code:
`// Adapter — in-memory (เหมาะกับ unit test!)
class InMemoryUserRepo implements UserRepo {
  users: User[] = []
  async save(u: User) { this.users.push(u) }
}

// test ไม่ต้องต่อ DB จริง
new RegisterUser(new InMemoryUserRepo())`
    },
  };
  const adapterCode = $('#adapterCode');
  const adapterFile = $('#adapterFile');
  const adapterCard = $('.adapter-card');
  function setAdapter(key) {
    const s = adapterSnippets[key];
    if (!s) return;
    renderCode(adapterCode, s.code, s.lang);
    adapterFile.textContent = s.file;
    adapterCard.classList.remove('flash');
    void adapterCard.offsetWidth; // reflow to restart anim
    adapterCard.classList.add('flash');
  }
  $$('#adapterSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      $$('#adapterSeg .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      setAdapter(b.dataset.adapter);
    });
  });
  setAdapter('postgres');

  /* ============================================================
     QUIZ
     ============================================================ */
  const quiz = $('#quiz');
  const scores = {};
  const total = $$('.quiz-q', quiz).length;
  $$('.quiz-q', quiz).forEach((q) => {
    const step = q.dataset.step;
    $$('button', q).forEach((b) => {
      b.addEventListener('click', () => {
        $$('button', q).forEach((x) => x.classList.remove('picked'));
        b.classList.add('picked');
        scores[step] = b.dataset.score;
        if (Object.keys(scores).length === total) showResult();
      });
    });
  });
  function showResult() {
    let hex = 0, clean = 0;
    Object.values(scores).forEach((v) => (v === 'hex' ? hex++ : clean++));
    const badge = $('#resultBadge'), text = $('#resultText'), box = $('#quizResult');
    badge.className = 'result-badge';
    if (hex === clean) {
      badge.classList.add('mix'); badge.textContent = '⬡ + ◎  ผสมกัน';
      text.textContent = 'โปรไฟล์คุณก้ำกึ่ง — เริ่มด้วย Ports & Adapters ของ Hexagonal เพื่อความยืดหยุ่น แล้วค่อยจัดชั้น Use Case / Entity แบบ Clean เมื่อ domain โตขึ้น เป็นทางที่หลายทีมเลือก';
    } else if (hex > clean) {
      badge.classList.add('hex'); badge.textContent = '⬡ Hexagonal';
      text.textContent = 'เหมาะกับ Hexagonal — เริ่มเบา ยืดหยุ่น โฟกัสที่ขอบเขต in/out ผ่าน Port & Adapter ปรับโครงสร้างภายในได้อิสระตามที่ทีมถนัด';
    } else {
      badge.classList.add('clean'); badge.textContent = '◎ Clean';
      text.textContent = 'เหมาะกับ Clean Architecture — มีแบบแผนชัดทุก component (Entity / Use Case / Adapter / Framework) ช่วยทีมใหญ่และโปรเจกต์อายุยืนรักษาวินัย Dependency Rule ได้ดี';
    }
    box.hidden = false;
    box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }
  $('#quizReset').addEventListener('click', () => {
    Object.keys(scores).forEach((k) => delete scores[k]);
    $$('.quiz-opts button', quiz).forEach((b) => b.classList.remove('picked'));
    $('#quizResult').hidden = true;
  });

  /* ============================================================
     THEME TOGGLE  (dark <-> light, persisted)
     ============================================================ */
  const themeBtn = $('#themeBtn');
  const root = document.documentElement;
  const syncPressed = () =>
    themeBtn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'light' ? 'true' : 'false');
  syncPressed();
  themeBtn.addEventListener('click', () => {
    const toLight = root.getAttribute('data-theme') !== 'light';
    if (toLight) root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('arch-theme', toLight ? 'light' : 'dark'); } catch (e) {}
    syncPressed();
  });

  /* ============================================================
     EXPORT PDF  (browser print -> Save as PDF)
     ============================================================ */
  $('#pdfBtn').addEventListener('click', () => window.print());

  /* ============================================================
     MULTI-LANGUAGE CODE TABS  (rendered through Shiki via renderCode)
     ============================================================ */
  const LANGS = [
    {
      id: 'ts', name: 'TypeScript', file: 'user.ts',
      note: '<b>Constructor injection</b> + <code>implements</code> — core รับ <code>UserRepo</code> ผ่าน constructor ไม่รู้จัก class จริง',
      code:
`// Port — สัญญาที่ core ประกาศ
interface UserRepo {
  save(u: User): Promise<void>
}

// Use Case — พึ่งแค่ interface
class RegisterUser {
  constructor(private repo: UserRepo) {}

  async exec(u: User) {
    await this.repo.save(u)
  }
}

// Adapter — ฝั่ง infrastructure
class PgUserRepo implements UserRepo {
  async save(u: User) {
    await sql\`INSERT INTO users ...\`
  }
}`
    },
    {
      id: 'kotlin', name: 'Kotlin', file: 'User.kt',
      note: '<b>Primary constructor</b> รับ port ตรงๆ — <code>suspend</code> ทำให้ async อยู่ใน signature ของ Port ได้สะอาด',
      code:
`// Port
interface UserRepo {
    suspend fun save(u: User)
}

// Use Case — รับ port ทาง constructor
class RegisterUser(private val repo: UserRepo) {
    suspend fun exec(u: User) = repo.save(u)
}

// Adapter
class PgUserRepo : UserRepo {
    override suspend fun save(u: User) {
        // INSERT INTO users ...
    }
}`
    },
    {
      id: 'go', name: 'Go', file: 'user.go',
      note: '<b>Implicit interface</b> — <code>PgUserRepo</code> ไม่ต้องประกาศว่า implements อะไร แค่มี method ครบก็ใช้เป็น <code>UserRepo</code> ได้',
      code:
`// Port
type UserRepo interface {
    Save(u User) error
}

// Use Case — ถือ interface ไว้
type RegisterUser struct {
    repo UserRepo
}

func (r RegisterUser) Exec(u User) error {
    return r.repo.Save(u)
}

// Adapter — เข้าเงื่อนไข UserRepo โดยอัตโนมัติ
type PgUserRepo struct{ db *sql.DB }

func (p PgUserRepo) Save(u User) error {
    _, err := p.db.Exec("INSERT INTO users ...")
    return err
}`
    },
    {
      id: 'java', name: 'Java', file: 'User.java',
      note: '<b>Constructor injection</b> แบบคลาสสิก — มักจับคู่กับ Spring DI แต่ที่ core เป็นแค่ POJO ไม่ผูก framework',
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
}`
    },
    {
      id: 'rust', name: 'Rust', file: 'user.rs',
      note: '<b>Trait + generic</b> — core เป็น generic เหนือ <code>R: UserRepo</code> ได้ zero-cost abstraction (หรือใช้ <code>Box&lt;dyn UserRepo&gt;</code> ถ้าต้องการ runtime dispatch)',
      code:
`// Port
trait UserRepo {
    fn save(&self, u: &User);
}

// Use Case — generic เหนือ port
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
}`
    },
  ];

  const langIcon = (id) => {
    const map = {
      ts: '#3178c6', kotlin: '#a97bff', go: '#00add8', java: '#f89820', rust: '#dea584',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="${map[id]}"/></svg>`;
  };

  const tabsWrap = $('#langTabs');
  const langCode = $('#langCode');
  const langFile = $('#langFile');
  const langTag  = $('#langTag');
  const langNote = $('#langNote');

  function selectLang(idx) {
    const L = LANGS[idx];
    $$('.lang-tab', tabsWrap).forEach((t, i) => {
      const on = i === idx;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    renderCode(langCode, L.code, L.id);
    langFile.textContent = L.file;
    langTag.textContent = L.name;
    langNote.innerHTML = L.note;
  }

  LANGS.forEach((L, i) => {
    const b = document.createElement('button');
    b.className = 'lang-tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
    b.innerHTML = langIcon(L.id) + '<span>' + L.name + '</span>';
    b.addEventListener('click', () => selectLang(i));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = (i + dir + LANGS.length) % LANGS.length;
        selectLang(next);
        $$('.lang-tab', tabsWrap)[next].focus();
      }
    });
    tabsWrap.appendChild(b);
  });
  selectLang(0);
})();
