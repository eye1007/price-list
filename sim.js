/* 아이젠트리 V2 · 시뮬레이션 모듈
   모든 시뮬레이션은 개념 설명용 단순 모델입니다 (실제 렌즈 설계 데이터가 아님). */
(function (global) {
  'use strict';
  const Sim = {};
  let uid = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  // from → to 로 ms 동안 값을 바꾸며 onStep 호출. 진행 중인 애니메이션은 cancel()로 중단
  function tween(ms, onStep) {
    let raf = 0; const t0 = performance.now();
    (function step(now) { const t = clamp((now - t0) / ms, 0, 1); onStep(ease(t)); if (t < 1) raf = requestAnimationFrame(step); })(t0);
    return {cancel() { cancelAnimationFrame(raf); }};
  }

  /* ───── 공통 수학 ───── */
  // 가장 두꺼워지는 주경선의 굴절력 (S, S+C 중 절댓값이 큰 쪽 기준)
  Sim.eff = (s, c) => {
    const a = s, b = s + c;
    if (a <= 0 && b <= 0) return Math.min(a, b);
    if (a >= 0 && b >= 0) return Math.max(a, b);
    return Math.abs(a) >= Math.abs(b) ? a : b;
  };
  Sim.CT = 1.8; Sim.ET = 1.0;                 // 근시 렌즈 중심 두께 보통 1.8mm
  // 중심에서 x(mm) 떨어진 지점의 두께 — sag = P·x² / (2000·(n−1))
  Sim.thickAt = (P, n, x, r) => {
    const k = Math.abs(P) / (2000 * (n - 1));
    if (P < 0) return Sim.CT + k * x * x;
    if (P > 0) return Sim.ET + k * (r * r - x * x);
    return Sim.CT;
  };

  /* ═════════ 1. 두께 단면: 세로로 세운 메니스커스 렌즈 ═════════
     rows: [{idx, n, price, st:'ok'|'out', spec}] · 앞면(왼쪽)은 볼록, 뒷면(눈 쪽)은 오목 */
  Sim.thicknessHTML = function ({P, rows, r, hi}) {
    rows = rows.map(x => ({...x, tc: Sim.thickAt(P, x.n, 0, r), te: Sim.thickAt(P, x.n, r, r)}));
    rows.forEach(x => x.edge = P < 0 ? x.te : x.tc);
    if (Math.abs(P) < 0.5) return `<div class="sim-note"><b>도수가 낮아 굴절률에 따른 두께 차이가 거의 없습니다.</b></div>`;
    // 앞면 커브(베이스커브): 근시는 평평하게, 원시는 더 볼록하게 (보겔 규칙을 단순화)
    const bc = P < 0 ? clamp(6 + P / 2, 1, 6) : clamp(6 + P * .8, 4, 12), R1 = 530 / bc;
    const sag = y => R1 - Math.sqrt(Math.max(0, R1 * R1 - y * y));
    // 윗부분만(위아래 대칭이라 절반이면 충분) 그리고, 굴절률 차이가 눈에 띄도록 두께 방향만 EX배 키움 (개념 그림)
    // 앞면 곡률은 그대로(휘어 보이지 않게) 두고, 두께만 EX배로 키워 굴절률별로 얇아지는 차이를 보여줌
    const sc = 3.1, EX = 4.2, H = Math.round(r * sc + 22), maxT = Math.max(...rows.map(x => Math.max(x.tc, x.te)));
    const W = Math.round(sag(r) * sc + maxT * sc * EX + 28), x0 = 12, cy = H - 8;
    // 그림은 굴절률 차이가 더 크게 보이도록 도수 때문에 두꺼워지는 부분의 비율을 GAM제곱으로 과장 (숫자와 %는 계산값 그대로)
    const GAM = 3.4, flat = P < 0 ? Sim.CT : Sim.ET, extra = x => Math.max(0.01, (P < 0 ? x.edge - Sim.CT : x.tc - Sim.ET));
    const amp = x => Math.pow(extra(x) / extra(rows[0]), GAM - 1);
    const outline = x => {
      const N = 32, fr = [], bk = [], a = amp(x);
      for (let i = 0; i <= N; i++) {
        const y = -r + r * i / N, t = Sim.thickAt(P, x.n, Math.abs(y), r), tv = flat * Math.pow(a, .4) + (t - flat) * a;   // 중심 두께도 살짝 줄여 그려 차이를 더 키움
        const xf = x0 + sag(Math.abs(y)) * sc, xb = xf + tv * sc * EX, py = (cy + y * sc).toFixed(1);
        fr.push(xf.toFixed(1) + ',' + py); bk.push(xb.toFixed(1) + ',' + py);
      }
      return 'M' + fr.join('L') + 'L' + bk.reverse().join('L') + 'Z';
    };
    const base = rows[0], ghost = outline(base);
    const cells = rows.map((x, i) => {
      const diff = i > 0 ? Math.round((1 - extra(x) / extra(base)) * 100) : 0, on = hi && String(hi) === String(x.idx);
      return `<div class="tk-cell ${on ? 'is-hi' : ''} ${x.st === 'out' ? 'is-out' : ''}">
        <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
          ${i > 0 ? `<path d="${ghost}" class="tk-ghost"/>` : ''}<path d="${outline(x)}" class="tk-lens"/>
          <line x1="2" y1="${cy}" x2="${W - 2}" y2="${cy}" class="tk-axis"/></svg>
        <b class="tk-i num">${esc(x.idx)}</b>
        <span class="tk-mm num">${x.edge.toFixed(1)}<small>mm</small></span>
        <span class="tk-sub">${P < 0 ? '가장자리' : '중심'} 두께</span>
        ${diff > 0 ? `<i class="tk-d">${esc(base.idx)} 대비 −${diff}%</i>` : `<i class="tk-d tk-d--base">기준</i>`}
        ${x.price ? `<span class="tk-p num">${x.st === 'out' ? '범위 초과' : x.price.toLocaleString() + '원'}</span>` : ''}</div>`;
    }).join('');
    return `<div class="tk-strip" style="--cols:${rows.length}">${cells}</div>
      <div class="tk-legend"><span>윗부분만 · 차이를 보기 쉽게 과장해 그린 개념도 · %는 도수 때문에 두꺼워지는 부분 기준</span><span><i class="tk-lg"></i>${esc(base.idx)} 렌즈 윤곽(비교용)</span></div>`;
  };

  /* ═════════ 2. 시야 비교 (교정 전/후) ═════════ */
  // 선명도 비교 장면: 무료 실사 사진(Unsplash, img/CREDITS.txt) — 간판 글자와 먼 곳 디테일이 많아 흐림 차이가 잘 보임
  function scene() { return '<image href="img/street.jpg" x="0" y="0" width="800" height="450" preserveAspectRatio="xMidYMid slice"/>'; }
  function sceneDrawn() {   // (예전 그림 장면 — 사진을 못 불러올 때를 대비해 남겨 둠)
    const rows = [['E',74,92],['F P',54,150],['T O Z',40,200],['L P E D',30,242],['P E C F D',22,278],['E D F C Z P',15,308]];
    const letters = rows.map(([t, fs, y]) => `<text x="220" y="${y + 70}" font-size="${fs}" text-anchor="middle" font-weight="800" letter-spacing="${fs * .35}" fill="#15171c">${t}</text>`).join('');
    const win = (x, y) => `<rect x="${x}" y="${y}" width="14" height="18" rx="2" fill="#fff" fill-opacity=".55"/>`;
    let wins = ''; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) wins += win(14 + i * 22, 70 + j * 34);
    return `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfdcf3"/><stop offset="1" stop-color="#f6efe3"/></linearGradient></defs>
      <rect width="800" height="450" fill="url(#sk)"/>
      <rect x="0" y="60" width="150" height="320" fill="#9fb0c2"/>${wins}
      <rect x="640" y="40" width="160" height="340" fill="#b8c2cf"/>
      <rect x="0" y="372" width="800" height="78" fill="#4b5563"/>
      <rect x="0" y="366" width="800" height="10" fill="#d7d2c6"/>
      ${Array.from({length: 8}, (_, i) => `<rect x="${20 + i * 100}" y="408" width="50" height="6" rx="3" fill="#e5e7eb"/>`).join('')}
      <rect x="40" y="96" width="360" height="262" rx="6" fill="#fffdf7" stroke="#cfc9b9" stroke-width="3"/>${letters}
      <rect x="450" y="96" width="320" height="262" rx="6" fill="#ffffff" stroke="#cfc9b9" stroke-width="3"/>
      <rect x="450" y="96" width="320" height="78" rx="6" fill="#0f1c2e"/>
      <text x="610" y="146" font-size="40" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="3">EYEGENTRY</text>
      <text x="610" y="206" font-size="22" font-weight="700" fill="#15171c" text-anchor="middle">아이젠트리 안경원</text>
      <text x="610" y="236" font-size="15" font-weight="600" fill="#475569" text-anchor="middle">시력검사 · 안경 · 렌즈 · 콘택트렌즈</text>
      <rect x="480" y="262" width="110" height="96" fill="#cfe6f7" stroke="#94a3b8" stroke-width="2"/>
      <rect x="630" y="262" width="110" height="96" fill="#cfe6f7" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="420" cy="320" r="26" fill="#fff" stroke="#d92d20" stroke-width="7"/><text x="420" y="330" font-size="26" font-weight="800" text-anchor="middle" fill="#15171c">50</text>
      <rect x="418" y="346" width="4" height="30" fill="#6b7280"/>`;
  }
  Sim.mountVision = function (el, o) {
    const id = 'vz' + (++uid);
    // s, c = 흐림을 만들 남은 굴절 이상 (안경 없이면 처방 도수 전체, 현재 안경이면 새 도수와의 차이)
    let st = {s: o.s, c: o.c, split: o.split ?? 50, onSplit: o.onSplit, left: o.left || '교정 전 · 안경 없이', right: o.right || '교정 후', note: o.note};
    el.innerHTML = `<div class="vz" id="${id}">
        <svg class="vz-svg vz-after" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scene()}</svg>
        <div class="vz-before"><svg class="vz-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs><filter id="${id}f" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur id="${id}b" stdDeviation="0 0"/></filter></defs>
          <g filter="url(#${id}f)">${scene()}</g></svg></div>
        <div class="vz-bar"><span class="vz-knob"><svg class="i" viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></span></div>
        <span class="vz-tag vz-tag--l"></span><span class="vz-tag vz-tag--r"></span>
        <input class="vz-range" type="range" min="4" max="96" value="${st.split}" aria-label="교정 전후 비교선">
      </div><p class="sim-cap" id="${id}c"></p>`;
    const box = el.querySelector('.vz'), before = box.querySelector('.vz-before'), bar = box.querySelector('.vz-bar'), rng = box.querySelector('.vz-range');
    const blur = el.querySelector('#' + id + 'b'), cap = el.querySelector('#' + id + 'c');
    function setSplit(v) { st.split = v; before.style.clipPath = `inset(0 ${100 - v}% 0 0)`; bar.style.left = v + '%'; if (st.onSplit) st.onSplit(v); }
    function apply() {
      // 두 주경선(S, S+C)의 굴절 이상 크기에 비례해 흐림. 원시는 조절력으로 일부 보상되므로 계수를 낮춤
      const k = p => Math.abs(p) * (p < 0 ? 2.6 : 1.3);
      const sx = clamp(k(st.s), 0, 26), sy = clamp(k(st.s + st.c), 0, 26);
      blur.setAttribute('stdDeviation', sx.toFixed(2) + ' ' + sy.toFixed(2));
      box.querySelector('.vz-tag--l').textContent = st.left; box.querySelector('.vz-tag--r').textContent = st.right;
      cap.innerHTML = st.note || `<b class="num">S ${fmt(st.s)} / C ${fmt(st.c)}</b> 기준 · 가운데 선을 좌우로 끌어 보세요. 실제 느낌은 개인차가 있는 개념 이미지입니다.`;
    }
    rng.addEventListener('input', () => setSplit(Number(rng.value)));
    setSplit(st.split); apply();
    return { update(n) { Object.assign(st, n); apply(); } };
  };

  /* ───── 눈 단면 그림 (굴절 원리 · 근시 억제 공용) ───── */
  function eyeDefs(p) {
    return `<linearGradient id="${p}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f9fc"/><stop offset="1" stop-color="#eef2f7"/></linearGradient>
      <radialGradient id="${p}scl" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".75" stop-color="#fbf6f1"/><stop offset="1" stop-color="#f1e6dc"/></radialGradient>
      <linearGradient id="${p}ret" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6b8a8"/><stop offset="1" stop-color="#d9715c"/></linearGradient>
      <radialGradient id="${p}lens" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#d7e8fb"/><stop offset="1" stop-color="#9dc0e8"/></radialGradient>
      <linearGradient id="${p}cor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe6fb" stop-opacity=".9"/><stop offset="1" stop-color="#e9f3fd" stop-opacity=".4"/></linearGradient>
      <linearGradient id="${p}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b6a8a"/><stop offset="1" stop-color="#2f4a66"/></linearGradient>
      <linearGradient id="${p}gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e3eefc"/><stop offset=".5" stop-color="#bcd5f5"/><stop offset="1" stop-color="#e3eefc"/></linearGradient>
      <radialGradient id="${p}glow"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#ffe9a8" stop-opacity=".95"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
      <radialGradient id="${p}bad"><stop offset="0" stop-color="#ff8a7a" stop-opacity=".95"/><stop offset="1" stop-color="#e5392e" stop-opacity="0"/></radialGradient>
      <filter id="${p}sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1e293b" flood-opacity=".12"/></filter>`;
  }
  // 눈: 중심(cx,cy), 가로 rx · 세로 ry. 앞쪽(왼쪽)에 각막·홍채·수정체, 뒤쪽(오른쪽)에 망막·시신경
  function eyeBody(p, cx, cy, rx, ry, lensX) {
    const back = (a) => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    const [r1x, r1y] = back(-1.05), [r2x, r2y] = back(1.05);
    return `<g filter="url(#${p}sh)"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${p}scl)" stroke="#dccabb" stroke-width="2.5"/></g>
      <path d="M${r1x},${r1y} A${rx},${ry} 0 0 1 ${r2x},${r2y}" fill="none" stroke="url(#${p}ret)" stroke-width="9" stroke-linecap="round"/>
      <path d="M${r1x - 6},${r1y + 4} A${rx - 7},${ry - 7} 0 0 1 ${r2x - 6},${r2y - 4}" fill="none" stroke="#f9d5cb" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      <path d="M${cx + rx - 2},${cy + 46} C${cx + rx + 20},${cy + 52} ${cx + rx + 44},${cy + 64} ${cx + rx + 62},${cy + 86}" fill="none" stroke="#e9c9a8" stroke-width="22" stroke-linecap="round"/>
      <path d="M${cx + rx - 2},${cy + 46} C${cx + rx + 20},${cy + 52} ${cx + rx + 44},${cy + 64} ${cx + rx + 62},${cy + 86}" fill="none" stroke="#f6e3cf" stroke-width="12" stroke-linecap="round"/>
      <path d="M${cx - rx + 18},${cy - 62} Q${cx - rx - 34},${cy} ${cx - rx + 18},${cy + 62}" fill="url(#${p}cor)" stroke="#9fc3e6" stroke-width="2.5"/>
      <rect x="${lensX - 6}" y="${cy - 64}" width="9" height="34" rx="4" fill="url(#${p}iris)"/><rect x="${lensX - 6}" y="${cy + 30}" width="9" height="34" rx="4" fill="url(#${p}iris)"/>
      <ellipse cx="${lensX + 14}" cy="${cy}" rx="15" ry="44" fill="url(#${p}lens)" stroke="#8fb2da" stroke-width="1.8"/>
      <ellipse cx="${lensX + 9}" cy="${cy - 18}" rx="4" ry="12" fill="#fff" opacity=".7"/>`;
  }
  const label = (x, y, tx, ty, t, anchor = 'start') => `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty + (ty > y ? -12 : 4)}" stroke="#94a3b8" stroke-width="1"/><text x="${tx}" y="${ty}" font-size="12" font-weight="700" fill="#64748b" text-anchor="${anchor}">${t}</text>`;

  /* ═════════ 3. 굴절 원리 (눈 단면 · 빛의 경로) ═════════ */
  Sim.mountRefraction = function (el) {
    const p = 'rf' + (++uid) + '_';
    const CX = 500, CY = 200, RX = 185, RY = 138, XL = 352, XR = CX + RX - 3, XS = 205, D = XL - XS, DR = XR - XL;
    const MODES = {
      normal: {label: '정시', f: [DR, DR], tone: '#0b8f63', msg: '빛이 망막 위 한 점에 정확히 모여 선명하게 보입니다.'},
      myopia: {label: '근시', f: [DR - 92, DR - 92], tone: '#d92d20', msg: '눈에 비해 굴절력이 강해 초점이 망막 <b>앞</b>에 맺힙니다. 먼 곳이 흐려 보여요. 오목렌즈가 빛을 살짝 퍼뜨려 초점을 망막으로 보냅니다.'},
      hyper:  {label: '원시', f: [DR + 120, DR + 120], tone: '#d97706', msg: '굴절력이 약해 초점이 망막 <b>뒤</b>에 맺힙니다. 가까운 곳이 특히 힘들어요. 볼록렌즈가 빛을 모아 초점을 앞으로 당깁니다.'},
      astig:  {label: '난시', f: [DR - 70, DR + 60], tone: '#7c3aed', msg: '방향에 따라 굴절력이 달라 <b>초점이 두 곳</b>(파랑·주황)으로 갈라집니다. 사물이 번지고 겹쳐 보여요. 방향별 도수가 다른 난시 렌즈로 한 점에 모읍니다.'}
    };
    let mode = 'normal', fA = DR, fB = DR, corr = 0, anim = null;
    el.innerHTML = `<div class="rf rf--pro"><svg viewBox="0 0 800 400" class="rf-svg" aria-hidden="true"><defs>${eyeDefs(p)}</defs><g class="rf-stage"></g></svg></div>
      <div class="rf-ctl"><div class="seg" data-k="modes">${Object.entries(MODES).map(([k, m]) => `<button data-m="${k}" class="${k === mode ? 'is-on' : ''}">${m.label}</button>`).join('')}</div>
      <button class="btn btn--accent" data-k="corr"><svg class="i" viewBox="0 0 24 24"><circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M11 12h2"/></svg><span>안경 렌즈로 교정</span></button></div>
      <p class="sim-cap" data-k="msg"></p>`;
    const stage = el.querySelector('.rf-stage'), msg = el.querySelector('[data-k=msg]'), cbtn = el.querySelector('[data-k=corr]');
    // 근축 광선 추적: 높이 h로 들어온 평행광이 (교정렌즈 →) 수정체를 지나 망막(XR)에 닿는 높이
    function trace(h, f, t) {
      const c = t * (1 / f - 1 / DR), h2 = h / (1 - c * D), s2 = h2 * c - h2 / f;
      return {h2, yr: h2 + s2 * DR};
    }
    function glasses(kind, a) {
      const x = XS, hh = 92, y0 = CY - (1 - a) * 40;
      const d = kind === 'minus'
        ? `M${x - 16},${y0 - hh} C${x - 6},${y0 - hh / 2} ${x - 6},${y0 + hh / 2} ${x - 16},${y0 + hh} L${x + 14},${y0 + hh} C${x + 2},${y0 + hh / 2} ${x + 2},${y0 - hh / 2} ${x + 14},${y0 - hh} Z`
        : `M${x - 4},${y0 - hh} C${x - 24},${y0 - hh / 2} ${x - 24},${y0 + hh / 2} ${x - 4},${y0 + hh} C${x + 12},${y0 + hh / 2} ${x + 12},${y0 - hh / 2} ${x - 4},${y0 - hh} Z`;
      return `<g opacity="${a.toFixed(2)}"><path d="${d}" fill="url(#${p}gl)" stroke="#5b8fd1" stroke-width="2"/>
        <text x="${x}" y="${y0 + hh + 22}" font-size="12.5" font-weight="800" fill="#2f5f9e" text-anchor="middle">${mode === 'astig' ? '난시 교정 렌즈' : kind === 'minus' ? '오목렌즈' : '볼록렌즈'}</text></g>`;
    }
    function draw() {
      const m = MODES[mode], two = Math.abs(fA - fB) > 1, cols = two ? ['#2f7bff', '#f08a24'] : ['#2f7bff'];
      const hs = [-58, -29, 0, 29, 58];
      let beams = '', lines = '', worst = 0, focus = '';
      [fA, fB].slice(0, cols.length).forEach((f, bi) => {
        const pts = hs.map(h => { const hh = two ? h * .92 + (bi ? 5 : -5) : h; const r = trace(hh, f, corr); worst = Math.max(worst, Math.abs(r.yr)); return [[70, hh], [XS, hh], [XL, r.h2], [XR, r.yr]]; });
        const top = pts[0], bot = pts[pts.length - 1], Y = y => (CY - y).toFixed(1);
        beams += `<path d="M${top.map(([x, y]) => x + ',' + Y(y)).join('L')}L${bot.slice().reverse().map(([x, y]) => x + ',' + Y(y)).join('L')}Z" fill="${cols[bi]}" opacity=".09"/>`;
        pts.forEach(q => {
          const d = q.map(([x, y]) => x + ',' + Y(y)).join(' ');
          lines += `<polyline points="${d}" fill="none" stroke="${cols[bi]}" stroke-width="2" stroke-opacity=".8" stroke-linejoin="round"/>
            <polyline points="${d}" fill="none" stroke="#fff" stroke-width="2" class="ray-flow" stroke-linejoin="round"/>`;
        });
        if (corr < .5 && Math.abs(f - DR) > 6) {      // 실제 초점 위치 (망막 앞이면 교차점, 뒤면 연장선)
          const fx = XL + f;
          if (fx > XR) lines += pts.map(q => { const [, , [x2, y2], [x3, y3]] = q, s = (y3 - y2) / (x3 - x2); return `<line x1="${x3}" y1="${Y(y3)}" x2="${fx}" y2="${Y(y3 + s * (fx - x3))}" stroke="${cols[bi]}" stroke-width="1.4" stroke-dasharray="4 4" opacity=".55"/>`; }).join('');
          focus += `<circle cx="${fx}" cy="${CY}" r="13" fill="url(#${p}glow)" class="pulse"/><circle cx="${fx}" cy="${CY}" r="3.5" fill="${cols[bi]}"/>`;
        }
      });
      const blurH = clamp(worst, 0, 58), ok = worst < 3;
      const spot = ok ? `<circle cx="${XR}" cy="${CY}" r="16" fill="url(#${p}glow)" class="pulse"/><circle cx="${XR}" cy="${CY}" r="4" fill="#fff" stroke="#0b8f63" stroke-width="2"/>`
        : `<ellipse cx="${XR}" cy="${CY}" rx="7" ry="${Math.max(8, blurH)}" fill="url(#${p}bad)"/>`;
      // 망막에 맺힌 모습 (오른쪽 위 작은 창)
      const bx = clamp(worst * .16, 0, 8), by = two && corr < .5 ? bx * .35 : bx;
      const inset = `<g transform="translate(724 78)"><circle r="54" fill="#fff" stroke="#e2e8f0" stroke-width="2"/>
        <defs><filter id="${p}ib" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${bx.toFixed(2)} ${by.toFixed(2)}"/></filter><clipPath id="${p}ic"><circle r="50"/></clipPath></defs>
        <g clip-path="url(#${p}ic)" filter="url(#${p}ib)"><text y="16" font-size="54" font-weight="900" text-anchor="middle" fill="#15171c">E</text><text y="38" font-size="11" font-weight="800" text-anchor="middle" fill="#334155" letter-spacing="2">F P T O</text></g>
        <text y="74" font-size="11.5" font-weight="800" text-anchor="middle" fill="${ok ? '#0b8f63' : '#d92d20'}">${ok ? '선명하게 보임' : '흐리게 보임'}</text></g>`;
      const status = corr > .5 ? (mode === 'normal' ? '정시 · 교정 불필요' : `${m.label} · 교정 후 초점이 망막에`) : (mode === 'normal' ? '정시 · 초점이 망막에' : mode === 'myopia' ? '근시 · 초점이 망막 앞' : mode === 'hyper' ? '원시 · 초점이 망막 뒤' : '난시 · 초점이 두 곳');
      stage.innerHTML = `<rect x="0" y="0" width="800" height="400" rx="14" fill="url(#${p}bg)"/>
        <g transform="translate(26 ${CY})"><rect x="0" y="-36" width="34" height="72" rx="5" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><text x="17" y="14" font-size="38" font-weight="900" text-anchor="middle" fill="#15171c">E</text></g>
        ${eyeBody(p, CX, CY, RX, RY, XL - 22)}${beams}${lines}${focus}${spot}${corr > .02 && mode !== 'normal' ? glasses(mode === 'myopia' ? 'minus' : 'plus', corr) : ''}
        ${label(XL - 40, CY + 56, XL - 84, CY + 150, '각막', 'end')}${label(XL + 14, CY - 46, XL + 40, CY - 158, '수정체')}${label(XR - 10, CY - 92, XR - 20, CY - 162, '망막')}${label(XR + 40, CY + 64, XR + 14, CY + 140, '시신경')}
        <g transform="translate(26 26)"><rect width="${16 + status.length * 13}" height="30" rx="15" fill="${corr > .5 || mode === 'normal' ? '#0b8f63' : m.tone}"/><text x="${8 + status.length * 6.5}" y="20" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${status}</text></g>${inset}`;
      msg.innerHTML = corr > .5 && mode !== 'normal' ? `<b>${m.label} · 교정 후</b> — 렌즈가 빛의 방향을 바꿔 초점이 망막 한 점에 모입니다.` : `<b>${m.label}</b> — ${m.msg}`;
    }
    function setMode(k) {
      const from = [fA, fB, corr], to = MODES[k].f; mode = k;
      if (anim) anim.cancel();
      anim = tween(650, t => { fA = lerp(from[0], to[0], t); fB = lerp(from[1], to[1], t); corr = lerp(from[2], 0, t); draw(); });
      el.querySelectorAll('[data-k=modes] button').forEach(x => x.classList.toggle('is-on', x.dataset.m === k));
      cbtn.classList.remove('is-on'); cbtn.querySelector('span').textContent = '안경 렌즈로 교정';
    }
    function setCorr(on) {
      const from = corr; if (anim) anim.cancel();
      anim = tween(800, t => { corr = lerp(from, on ? 1 : 0, t); draw(); });
      cbtn.classList.toggle('is-on', on); cbtn.querySelector('span').textContent = on ? '교정 해제' : '안경 렌즈로 교정';
    }
    el.querySelector('[data-k=modes]').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
    cbtn.addEventListener('click', () => setCorr(!cbtn.classList.contains('is-on')));
    draw();
    return { update() {}, destroy() { if (anim) anim.cancel(); } };
  };

  /* ═════════ 4. 설계별 왜곡 (개념도) ═════════
     낮은 도수에서도 설계 차이가 보이도록 도수 영향은 완만한 곡선(√ 형태)으로 배분 */
  Sim.DESIGNS = [
    {id: 'sph',   name: '구면',      g: 1.0, note: '가장자리로 갈수록 왜곡이 커집니다'},
    {id: 'asph',  name: '비구면',    g: .6,  note: '가장자리 왜곡을 줄인 설계'},
    {id: 'dasph', name: '양면비구면', g: .36, note: '왜곡을 가장 낮춘 설계'}
  ];
  const heat = v => {            // 0(안정) → 1(왜곡): 파랑-초록-노랑-빨강
    const st = [[0, 31, 91, 216], [.3, 25, 179, 107], [.6, 242, 192, 41], [1, 229, 57, 46]];
    for (let i = 1; i < st.length; i++) if (v <= st[i][0]) {
      const a = st[i - 1], b = st[i], t = (v - a[0]) / (b[0] - a[0]);
      return [0, 1, 2].map(k => Math.round(a[k + 1] + (b[k + 1] - a[k + 1]) * t));
    }
    return st[3].slice(1);
  };
  const powerMag = P => clamp(Math.pow(Math.abs(P) / 8, .6), 0, 1);     // ±1D 0.29 · ±3D 0.56 · ±6D 0.84 · ±8D 1
  function paintHeat(ctx, W, P, c, g) {
    const R = W / 2 - 3, mag = powerMag(P), as = clamp(Math.abs(c) / 5, 0, 1), img = ctx.createImageData(W, W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / R, dy = (y - W / 2) / R, rho = Math.hypot(dx, dy), i = (y * W + x) * 4;
      if (rho > 1) continue;
      const v = clamp(.04 + (mag * g + as * .25 * g * (1 + Math.cos(2 * Math.atan2(dy, dx)) * .35)) * Math.pow(rho, 1.7), 0, 1);
      const [r, gg, b] = heat(v); img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = rho > .985 ? 160 : 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const thumbCache = {};
  Sim.heatThumb = (P, c, g, W = 120) => {                          // 비교 화면용 작은 왜곡 지도 (이미지 주소)
    const key = [P, c, g, W].join('|'); if (thumbCache[key]) return thumbCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = W; paintHeat(cv.getContext('2d'), W, P, c, g);
    return (thumbCache[key] = cv.toDataURL());
  };
  Sim.mountDistortion = function (el, o) {
    let st = {s: o.s, c: o.c};
    el.innerHTML = `<div class="dz">${Sim.DESIGNS.map(d => `<figure class="dz-card"><figcaption><b>${d.name}</b><span>${d.note}</span></figcaption>
        <canvas width="300" height="300" data-d="${d.id}" data-k="heat"></canvas><canvas width="300" height="300" data-d="${d.id}" data-k="grid"></canvas></figure>`).join('')}</div>
      <div class="dz-legend"><span>안정</span><i></i><span>왜곡</span></div><p class="sim-cap" data-k="cap"></p>`;
    function draw() {
      const P = Sim.eff(st.s, st.c), mag = powerMag(P);
      el.querySelectorAll('canvas').forEach(cv => {
        const d = Sim.DESIGNS.find(x => x.id === cv.dataset.d), ctx = cv.getContext('2d'), W = cv.width, R = W / 2 - 6;
        ctx.clearRect(0, 0, W, W);
        if (cv.dataset.k === 'heat') { paintHeat(ctx, W, P, st.c, d.g); return; }
        ctx.save(); ctx.beginPath(); ctx.arc(W / 2, W / 2, R, 0, 7); ctx.clip();
        ctx.fillStyle = '#0f1c2e'; ctx.fillRect(0, 0, W, W);
        const k = (P < 0 ? -1 : 1) * .3 * mag * d.g, N = 10;   // 근시: 술통형, 원시: 실패형
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2;
        for (let a = -N; a <= N; a++) for (const horiz of [0, 1]) {
          ctx.beginPath();
          for (let j = -40; j <= 40; j++) {
            const u = a / N * 1.05, w = j / 40 * 1.05, px = horiz ? w : u, py = horiz ? u : w, f = 1 + k * (px * px + py * py);
            const X = W / 2 + px * f * R, Y = W / 2 + py * f * R;
            j === -40 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
          }
          ctx.stroke();
        }
        ctx.restore(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, W / 2, R, 0, 7); ctx.stroke();
      });
      el.querySelector('[data-k=cap]').innerHTML = `<b class="num">S ${fmt(st.s)} / C ${fmt(st.c)}</b> 기준 · 설계별 주변부 왜곡 경향을 보여주는 <b>개념도</b>입니다. 실제 제품별 수치가 아니며, 낮은 도수에서도 구면 설계는 가장자리 왜곡이 먼저 나타납니다.`;
    }
    draw();
    return { update(n) { st.s = n.s; st.c = n.c; draw(); } };
  };

  /* ═════════ 5. 근시 억제 원리 ═════════
     중심 초점은 망막에, 주변 초점은 일반 렌즈=망막 뒤 / 근시 억제 렌즈=망막 앞. 초점들을 이은 점선이 '초점 면' */
  Sim.mountMyopia = function (el) {
    const p = 'my' + (++uid) + '_';
    const CX = 440, CY = 200, RX = 162, RY = 136, LX = 308, SX = 172;
    let t = 0, mode = 'normal', anim = null;
    el.innerHTML = `<div class="rf rf--pro"><svg viewBox="0 0 800 410" class="rf-svg" aria-hidden="true"><defs>${eyeDefs(p)}</defs><g class="rf-stage"></g></svg></div>
      <div class="rf-ctl"><div class="seg" data-k="modes"><button data-m="normal" class="is-on">일반 안경 렌즈</button><button data-m="control">근시 억제 렌즈</button></div></div>
      <p class="sim-cap" data-k="msg"></p>`;
    const stage = el.querySelector('.rf-stage'), msg = el.querySelector('[data-k=msg]');
    const onRetina = a => [CX + RX * Math.cos(a), CY + RY * Math.sin(a)];
    const normalAt = a => { const nx = Math.cos(a) / RX, ny = Math.sin(a) / RY, l = Math.hypot(nx, ny); return [nx / l, ny / l]; };
    function lensFront(ctl) {           // 정면에서 본 안경 렌즈 (근시 억제 렌즈는 주변부에 작은 렌즈렛)
      let dots = '';
      if (ctl > .02) for (let ring = 0; ring < 4; ring++) { const rr = 22 + ring * 8, n = 14 + ring * 5; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring * .2; dots += `<circle cx="${(rr * Math.cos(a)).toFixed(1)}" cy="${(rr * Math.sin(a)).toFixed(1)}" r="2.1" fill="#3f8fbf" opacity="${(.75 * ctl).toFixed(2)}"/>`; } }
      return `<g transform="translate(722 300)"><circle r="56" fill="url(#${p}gl)" stroke="#5b8fd1" stroke-width="2"/>${dots}
        ${ctl > .02 ? `<circle r="16" fill="none" stroke="#0b8f63" stroke-width="1.5" stroke-dasharray="3 3" opacity="${ctl.toFixed(2)}"/>` : ''}
        <text y="76" font-size="11.5" font-weight="800" text-anchor="middle" fill="#334155">안경 렌즈 정면</text>
        <text y="92" font-size="10.5" font-weight="700" text-anchor="middle" fill="#64748b">${ctl > .5 ? '중심: 선명 · 주변: 초점 조절 구역' : '전체가 같은 도수'}</text></g>`;
    }
    function draw() {
      const off = lerp(20, -20, t), colP = t > .5 ? '#0b8f63' : '#d92d20';
      const fov = onRetina(0), A = .72;
      const fp = [-A, A].map(a => { const r = onRetina(a), n = normalAt(a); return [r[0] + n[0] * off, r[1] + n[1] * off, r]; });
      const ray = (pts, col, w = 2) => { const d = pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
        return `<polyline points="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity=".8" stroke-linejoin="round"/><polyline points="${d}" fill="none" stroke="#fff" stroke-width="${w}" class="ray-flow"/>`; };
      let g = '';
      // 중심 광선 → 황반
      g += `<path d="M60,${CY - 30} L${SX},${CY - 30} L${LX},${CY - 26} L${fov[0]},${fov[1]} L${LX},${CY + 26} L${SX},${CY + 30} L60,${CY + 30} Z" fill="#2f7bff" opacity=".08"/>`;
      [-30, 0, 30].forEach(h => { g += ray([[60, CY + h], [SX, CY + h], [LX, CY + h * .86], fov], '#2f7bff'); });
      // 주변 광선 (위쪽 시야 → 아래 망막, 아래쪽 시야 → 위 망막)
      fp.forEach(([x, y, r], i) => {
        const s = i ? -1 : 1, y0 = CY + s * 96;
        [-10, 10].forEach(d => {
          const ly = CY + s * 18 + d * .5, sy = CY + s * 52 + d, ext = [x + (x - LX) * .12, y + (y - ly) * .12];
          g += ray([[SX - 90, y0 + d], [SX, sy], [LX, ly], [x, y]].concat(t > .5 ? [ext] : []), colP, 1.8);
        });
        g += `<line x1="${r[0]}" y1="${r[1]}" x2="${x}" y2="${y}" stroke="${colP}" stroke-width="1.6" stroke-dasharray="3 3"/>
          <circle cx="${x}" cy="${y}" r="12" fill="url(#${p}${t > .5 ? 'glow' : 'bad'})" class="pulse"/><circle cx="${x}" cy="${y}" r="4" fill="${colP}" stroke="#fff" stroke-width="1.5"/>`;
      });
      // 초점 면 (주변 초점 – 황반 – 주변 초점을 잇는 곡선)
      const [a1, a2] = fp, qx = 2 * fov[0] - (a1[0] + a2[0]) / 2, qy = 2 * fov[1] - (a1[1] + a2[1]) / 2;
      g += `<path d="M${a1[0]},${a1[1]} Q${qx},${qy} ${a2[0]},${a2[1]}" fill="none" stroke="${colP}" stroke-width="2.5" stroke-dasharray="7 5" opacity=".9"/>
        <circle cx="${fov[0]}" cy="${fov[1]}" r="15" fill="url(#${p}glow)" class="pulse"/><circle cx="${fov[0]}" cy="${fov[1]}" r="4" fill="#fff" stroke="#2f7bff" stroke-width="2"/>`;
      // 안경 렌즈 단면 (근시 억제 렌즈는 앞면에 작은 볼록 렌즈렛)
      let bumps = ''; if (t > .02) for (let i = -5; i <= 5; i++) { if (Math.abs(i) < 2) continue; const y = CY + i * 15; bumps += `<circle cx="${SX - 14}" cy="${y}" r="3.2" fill="#9cc4e8" opacity="${t.toFixed(2)}"/>`; }
      g += `<path d="M${SX - 16},${CY - 92} C${SX - 6},${CY - 46} ${SX - 6},${CY + 46} ${SX - 16},${CY + 92} L${SX + 14},${CY + 92} C${SX + 2},${CY + 46} ${SX + 2},${CY - 46} ${SX + 14},${CY - 92} Z" fill="url(#${p}gl)" stroke="#5b8fd1" stroke-width="2"/>${bumps}`;
      const grow = t < .5;
      const tag = (x, y, txt, col, anchor = 'start') => `<text x="${x}" y="${y}" font-size="12.5" font-weight="800" fill="${col}" text-anchor="${anchor}">${txt}</text>`;
      stage.innerHTML = `<rect x="0" y="0" width="800" height="410" rx="14" fill="url(#${p}bg)"/>${eyeBody(p, CX, CY, RX, RY, LX - 22)}${g}
        ${tag(fov[0] + 18, fov[1] + 4, '중심 초점: 망막 위', '#2f7bff')}
        ${tag(fp[0][0] + 16, fp[0][1] - 10, grow ? '주변 초점: 망막 뒤' : '주변 초점: 망막 앞', colP)}
        ${tag(fp[1][0] - 16, fp[1][1] + 24, grow ? '주변 초점: 망막 뒤' : '주변 초점: 망막 앞', colP, 'end')}
        ${tag(CX + 20, CY + RY + 34, grow ? '주변 초점이 뒤에 맺히면 → 눈이 길어지려는 신호' : '주변 초점을 앞으로 → 길어지는 신호 감소', colP, 'middle')}
        ${tag(SX, CY + 118, t > .5 ? '근시 억제 렌즈' : '일반 렌즈', '#2f5f9e', 'middle')}
        <g transform="translate(26 26)"><rect width="${t > .5 ? 210 : 196}" height="30" rx="15" fill="${colP}"/><text x="${t > .5 ? 105 : 98}" y="20" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${t > .5 ? '근시 억제 렌즈 · 주변 초점 앞' : '일반 렌즈 · 주변 초점 뒤'}</text></g>
        ${lensFront(t)}`;
      msg.innerHTML = (t > .5
        ? `<b>근시 억제 렌즈</b> — 가운데는 일반 렌즈처럼 선명하게 보고, 주변부 구역이 초점을 망막 <b>앞쪽</b>으로 당겨 눈이 길어지는 자극을 줄이려는 원리입니다.`
        : `<b>일반 안경 렌즈</b> — 가운데는 선명하지만 주변부 초점(점선)이 망막 <b>뒤쪽</b>에 맺히는 경향이 있어, 성장기 눈이 길어지는 자극이 될 수 있다는 가설이 있습니다.`)
        + `<br><small>효과는 개인차가 있으며 정기 검진과 함께 사용합니다. 개념 설명용 그림입니다.</small>`;
    }
    el.querySelector('[data-k=modes]').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.dataset.m === mode) return; mode = b.dataset.m;
      el.querySelectorAll('[data-k=modes] button').forEach(x => x.classList.toggle('is-on', x === b));
      const from = t; if (anim) anim.cancel(); anim = tween(900, k => { t = lerp(from, mode === 'control' ? 1 : 0, k); draw(); });
    });
    draw();
    return { update() {}, destroy() { if (anim) anim.cancel(); } };
  };

  /* ═════════ 6. 누진다초점 시야 지도 (개념도) ═════════
     같은 장면을 흐리게 깔고, 선명한 영역(원거리 → 누진대 → 근거리)을 하나로 이어진 곡선으로 그려 그 안만 선명하게 보여줍니다. */
  const nums = s => (String(s ?? '').match(/\d+(\.\d+)?/g) || []).map(Number);
  Sim.addMax = s => { const n = nums(s).map(v => v > 10 ? v / 100 : v); return n.length ? Math.max(...n) : null; };
  // 4단계 등급: 선명한 영역의 넓이와 가장자리 흐림 정도의 기본값 (열에 view 점수를 직접 넣으면 그 값이 우선)
  Sim.TIERS = [
    {id: 1, name: '최고급형', desc: '시야가 가장 넓고 가장자리 흐림이 가장 적어요', far: 97, mid: 97, near: 97, side: 96},
    {id: 2, name: '고급형', desc: '넓고 안정적인 시야', far: 85, mid: 80, near: 86, side: 80},
    {id: 3, name: '보급형', desc: '일상 생활에 균형 잡힌 시야', far: 72, mid: 64, near: 74, side: 66},
    {id: 4, name: '기본형', desc: '기본에 충실한 합리적인 선택', far: 58, mid: 50, near: 60, side: 52}
  ];
  Sim.progScores = (col, tier) => {
    const t = Sim.TIERS.find(x => x.id === Number(tier)) || Sim.TIERS[2], v = (col && col.view) || {};
    const pick = k => (v[k] === undefined || v[k] === '' || isNaN(Number(v[k])) ? t[k] : clamp(Number(v[k]), 0, 100));
    return {far: pick('far'), mid: pick('mid'), near: pick('near'), side: pick('side'), tier: t, auto: ['far', 'mid', 'near', 'side'].every(k => v[k] === undefined || v[k] === '')};
  };
  // 위: 먼 곳(간판) · 가운데: 중간 거리(모니터) · 아래: 가까운 곳(글씨) — 440×440
  function progScene() {
    let bld = '', win = '';
    [[0, 70, 92], [58, 100, 54], [108, 48, 40], [330, 80, 58], [382, 56, 70], [398, 100, 42]].forEach(([x, h, w], k) => {       // 먼 건물 + 창문
      bld += `<rect x="${x}" y="${150 - h}" width="${w}" height="${h}" fill="${k % 2 ? '#a9b9cc' : '#8fa3bb'}"/>`;
      for (let yy = 150 - h + 8; yy < 144; yy += 11) for (let xx = x + 5; xx < x + w - 6; xx += 10) win += `<rect x="${xx}" y="${yy}" width="5" height="6" fill="${(xx * 7 + yy * 3) % 5 ? '#dbe8f5' : '#f6d98a'}" opacity=".9"/>`;
    });
    let trees = ''; for (let i = 0; i < 16; i++) { const x = 8 + i * 28 + (i % 3) * 5, r = 9 + (i % 4) * 3; trees += `<circle cx="${x}" cy="${142 - (i % 2) * 3}" r="${r}" fill="${i % 2 ? '#3f8f54' : '#2f7a46'}"/>`; }
    let gl = ''; for (let i = 0; i < 6; i++) gl += `<rect x="${92 + i * 42}" y="30" width="3" height="82" fill="#27415f" opacity=".5"/>`;
    const paper = ['원거리 · 중간 · 근거리를 하나의 렌즈로 봅니다', '가장자리 흔들림은 줄이고 시야는 넓게 설계', '운전할 때는 먼 곳을 또렷하게 볼 수 있어요', '스마트폰과 책을 볼 때는 아래쪽 근거리 영역', '컴퓨터 화면은 가운데 누진대로 편하게 확인', '처음 쓰면 적응 기간이 필요하며 개인차가 있습니다']
      .map((t, i) => `<text x="${82 + (i % 2) * 4}" y="${352 + i * 14}" font-size="9.6" font-weight="${i === 0 ? 700 : 500}" fill="#3b4350" font-family="sans-serif">${t}</text>`).join('');
    let bars = ''; [28, 44, 36, 58, 48, 70, 62].forEach((h, i) => { bars += `<rect x="${86 + i * 17}" y="${258 - h * .6}" width="11" height="${h * .6}" rx="2" fill="${i % 2 ? '#0b7a91' : '#4aa3b8'}"/>`; });
    let wood = ''; for (let i = 0; i < 9; i++) wood += `<path d="M0 ${296 + i * 17}Q110 ${290 + i * 17} 220 ${297 + i * 17}T440 ${294 + i * 17}" fill="none" stroke="#b79a68" stroke-width="1" opacity=".45"/>`;
    return `<defs><linearGradient id="pgsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb1ec"/><stop offset=".7" stop-color="#cfe8f8"/><stop offset="1" stop-color="#f7efd9"/></linearGradient>
      <radialGradient id="pgsun"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#fff3b0" stop-opacity=".7"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>
      <linearGradient id="pgdesk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcc79f"/><stop offset="1" stop-color="#c3a674"/></linearGradient>
      <linearGradient id="pgscr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef3f8"/></linearGradient></defs>
      <rect width="440" height="440" fill="#efe9db"/><rect width="440" height="152" fill="url(#pgsky)"/>
      <circle cx="360" cy="52" r="70" fill="url(#pgsun)"/><circle cx="360" cy="52" r="15" fill="#fff6c8"/>
      <g fill="#fff" opacity=".9"><ellipse cx="60" cy="38" rx="34" ry="9"/><ellipse cx="84" cy="30" rx="22" ry="8"/><ellipse cx="300" cy="22" rx="30" ry="7"/><ellipse cx="324" cy="30" rx="20" ry="6"/><ellipse cx="170" cy="14" rx="24" ry="5"/></g>
      <path d="M0 120L50 88L96 114L150 82L210 116L270 90L330 118L390 86L440 112V152H0Z" fill="#9cb4d0"/><path d="M0 134L70 108L140 132L220 104L300 130L380 106L440 128V152H0Z" fill="#7f9dbd"/>
      ${bld}${win}${trees}
      <path d="M130 16q6-6 12 0M144 22q5-5 10 0M300 40q5-5 10 0" fill="none" stroke="#33465e" stroke-width="1.6"/>
      <rect x="92" y="28" width="256" height="86" rx="8" fill="#0d1b2e" stroke="#26466b" stroke-width="3"/>${gl}
      <rect x="100" y="36" width="240" height="70" rx="5" fill="#0f2238" stroke="#2d9bb5" stroke-width="1.4"/>
      <text x="220" y="72" font-size="34" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="3" font-family="sans-serif">EYEGENTRY</text>
      <rect x="150" y="80" width="140" height="2.5" fill="#2d9bb5"/><text x="220" y="99" font-size="12.5" font-weight="700" fill="#9fb3cc" text-anchor="middle" font-family="sans-serif">아이젠트리 안경원 · OPTICAL</text>
      <rect x="0" y="148" width="440" height="6" fill="#5b6472"/><rect x="0" y="152" width="440" height="3" fill="#cbd2db"/>
      <rect x="40" y="141" width="24" height="9" rx="3" fill="#d92d20"/><rect x="46" y="137" width="12" height="6" rx="2" fill="#eaf4ff"/><rect x="350" y="141" width="26" height="9" rx="3" fill="#2563eb"/><rect x="356" y="137" width="13" height="6" rx="2" fill="#eaf4ff"/>
      <rect x="0" y="154" width="440" height="136" fill="#e9e2d1"/><path d="M0 170H440M0 200H440M0 230H440M0 260H440" stroke="#ddd5c0" stroke-width="1"/>
      <rect x="384" y="196" width="40" height="88" fill="#d8cdb4"/><path d="M404 196c-24-6-26-34-4-44 8 14 20 18 4 44zM404 200c22-4 30-30 8-42-4 16-12 22-8 42z" fill="#2e8b57"/>
      <rect x="48" y="160" width="344" height="126" rx="9" fill="#1b2431"/><rect x="56" y="168" width="328" height="110" rx="4" fill="url(#pgscr)"/>
      <rect x="56" y="168" width="328" height="15" fill="#0b6b7e"/><circle cx="66" cy="175.5" r="2.6" fill="#ff6b61"/><circle cx="75" cy="175.5" r="2.6" fill="#ffc542"/><circle cx="84" cy="175.5" r="2.6" fill="#4ade80"/><text x="220" y="179" font-size="7.5" font-weight="700" fill="#e6f6f9" text-anchor="middle" font-family="sans-serif">고객 상담 · 시력 기록 2026</text>
      <rect x="56" y="183" width="64" height="95" fill="#eef3f8"/>${[0, 1, 2, 3, 4].map(i => `<rect x="62" y="${191 + i * 15}" width="${40 + (i % 3) * 6}" height="5" rx="2.5" fill="${i === 1 ? '#0b7a91' : '#9aa6b5'}"/>`).join('')}
      <text x="132" y="198" font-size="9" font-weight="800" fill="#16324f" font-family="sans-serif">월간 안경 · 렌즈 상담 현황</text><text x="132" y="209" font-size="6.5" fill="#6b7685" font-family="sans-serif">ABCDEFGHIJKLMNOP 0123456789 · 렌즈 굴절률 1.56 1.60 1.67 1.74</text>
      ${bars}<line x1="84" y1="259" x2="208" y2="259" stroke="#9aa6b5" stroke-width="1"/>
      <rect x="236" y="214" width="128" height="52" rx="4" fill="#cfe4ea"/><path d="M236 266l36-26 24 16 26-24 42 34z" fill="#6fae8a"/><circle cx="342" cy="228" r="6" fill="#ffd24a"/>
      <rect x="236" y="272" width="44" height="3" rx="1.5" fill="#9aa6b5"/>
      <rect x="172" y="284" width="96" height="8" fill="#9aa0aa"/><rect x="150" y="291" width="140" height="6" rx="3" fill="#7d838e"/>
      <rect x="0" y="296" width="440" height="144" fill="url(#pgdesk)"/>${wood}
      <rect x="62" y="304" width="316" height="136" rx="5" fill="#fffdf7" stroke="#d5c9ad" stroke-width="1.6"/><rect x="62" y="304" width="14" height="136" fill="#efe6cf"/>${Array.from({length: 7}, (_, i) => `<circle cx="69" cy="${316 + i * 18}" r="2.6" fill="#b7a984"/>`).join('')}
      <text x="84" y="330" font-size="17" font-weight="800" fill="#15171c" font-family="sans-serif">시력검사 · 안경 · 렌즈</text><rect x="84" y="335" width="150" height="2" fill="#0b6b7e"/>${paper}
      <rect x="300" y="322" width="64" height="40" fill="none" stroke="#9aa6b5" stroke-width="1"/><path d="M300 335H364M300 348H364M322 322V362M344 322V362" stroke="#c4ccd6" stroke-width="1"/><text x="311" y="332" font-size="6.5" font-weight="700" fill="#44505e" font-family="sans-serif">OD</text><text x="333" y="332" font-size="6.5" font-weight="700" fill="#44505e" font-family="sans-serif">OS</text>
      <rect x="388" y="388" width="46" height="9" rx="4.5" fill="#1d4ed8" transform="rotate(-24 411 392)"/><circle cx="412" cy="332" r="21" fill="#f6efe2" stroke="#cdbb97" stroke-width="2"/><circle cx="412" cy="332" r="15" fill="#6f4a2b"/><circle cx="406" cy="327" r="4" fill="#8d6240" opacity=".8"/>`;
  }  function ensureProgScene() {
    if (document.getElementById('prog-scene-host')) return;
    const h = document.createElement('div'); h.id = 'prog-scene-host'; h.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    h.innerHTML = `<svg width="0" height="0" aria-hidden="true"><defs><g id="prog-scene">${progScene()}</g></defs></svg>`; document.body.appendChild(h);
  }
  // 선명 영역 경계: 렌즈 가장자리의 원거리 경계 → 누진대(가운데 잘록) → 근거리 영역까지 하나로 이어지는 매끈한 곡선
  function clearZone(s, k) {
    const yF = 8 + s.far * 1.12 * k, half = (4 + s.mid * .31) * k, nw = (6 + s.near * .78) * k, yW = 118, yN = 160;
    const L = 100 - half, R = 100 + half;
    return `M-6,${yF.toFixed(1)} C40,${yF.toFixed(1)} ${L.toFixed(1)},${yW - 36} ${L.toFixed(1)},${yW} C${L.toFixed(1)},${yW + 16} ${(100 - nw).toFixed(1)},${yN - 24} ${(100 - nw).toFixed(1)},${yN}
      C${(100 - nw).toFixed(1)},${yN + 34} ${(100 - nw * .55).toFixed(1)},212 100,212 C${(100 + nw * .55).toFixed(1)},212 ${(100 + nw).toFixed(1)},${yN + 34} ${(100 + nw).toFixed(1)},${yN}
      C${(100 + nw).toFixed(1)},${yN - 24} ${R.toFixed(1)},${yW + 16} ${R.toFixed(1)},${yW} C${R.toFixed(1)},${yW - 36} 160,${yF.toFixed(1)} 206,${yF.toFixed(1)} L206,-6 L-6,-6 Z`;
  }
  Sim.clearZonePath = (col, add, tier) => clearZone(Sim.progScores(col, tier), clamp(1.18 - .13 * add, .7, 1.05));

  /* ═════════ 7. 왜곡 글자판: 무테 렌즈 너머로 본 글자 (설계 등급별) ═════════ */
  const LB = [{n: '구면', d: 1, b: 1}, {n: '비구면', d: .62, b: .6}, {n: '양면비구면', d: .4, b: .4}, {n: '프리미엄', d: .25, b: .26}, {n: '개인맞춤', d: .14, b: .15}];
  const LB_CH = 'ㄱ가나다라마바사아자차카타파하EFPTOZLDCA0123456789거너더러머버서어저처커터퍼허';
  Sim.mountLetterBoard = function (el, o) {
    let st = {s: o.s, c: o.c, lv: o.level ?? 0, show: o.level ?? 0}, anim = null;
    el.innerHTML = `<div class="lb"><canvas width="1100" height="620"></canvas></div>
      <div class="lb-ctl"><div class="lb-scale"><input type="range" min="0" max="4" step="1" value="${st.lv}" aria-label="설계 등급"><div>${LB.map((x, i) => `<button data-i="${i}" class="${i === st.lv ? 'is-on' : ''}">${x.n}</button>`).join('')}</div></div></div>
      <p class="sim-cap" data-k="cap"></p>`;
    const cv = el.querySelector('canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height, rng = el.querySelector('input'), cap = el.querySelector('[data-k=cap]');
    const cx = W / 2, cy = H / 2, A = W * .31, B = H * .37, PW = 2.6;
    const metric = (x, y) => Math.pow(Math.pow(Math.abs((x - cx) / A), PW) + Math.pow(Math.abs((y - cy) / B), PW), 1 / PW);   // 1 = 렌즈 가장자리
    const lens = new Path2D(); for (let i = 0; i <= 160; i++) { const t = i / 160 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const x = cx + A * Math.sign(c) * Math.pow(Math.abs(c), 2 / PW), y = cy + B * Math.sign(s) * Math.pow(Math.abs(s), 2 / PW); i ? lens.lineTo(x, y) : lens.moveTo(x, y); }
    lens.closePath();
    function draw() {
      const P = Sim.eff(st.s, st.c), k = Math.floor(st.show), f = st.show - k, a = LB[k], b = LB[Math.min(4, k + 1)];
      // 근시(−): 축소 + 술통형, 원시(+): 확대 + 실패형. 가장자리까지 글자가 차도록 왜곡 계수는 0.16 이하로
      const dz = lerp(a.d, b.d, f), bz = lerp(a.b, b.b, f), mag = clamp(1 + P * .012, .88, 1.1);
      const kd = (P < 0 ? -1 : 1) * dz * Math.min(1, Math.abs(P) / 8) * .16, cw = W / 22, ch = H / 13, fs = ch * .44;
      g.fillStyle = '#f6f7f9'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const ch_ =(i, j) => LB_CH[(i * 7 + j * 13 + 3) % LB_CH.length];
      g.font = `700 ${fs}px sans-serif`; g.fillStyle = '#c3c9d2';
      for (let j = 0; j < 13; j++) for (let i = 0; i < 22; i++) { const x = (i + .5) * cw, y = (j + .5) * ch; if (metric(x, y) > 1.02) g.fillText(ch_(i, j), x, y); }
      g.save(); g.clip(lens);
      const grd = g.createRadialGradient(cx - A * .3, cy - B * .4, 10, cx, cy, A * 1.1); grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#e6eef8'); g.fillStyle = grd; g.fill(lens);
      for (let j = -8; j < 21; j++) for (let i = -10; i < 32; i++) {
        const x0 = (i + .5) * cw, y0 = (j + .5) * ch, dx = (x0 - cx) / A, dy = (y0 - cy) / B, r2 = dx * dx + dy * dy;
        const sc = kd < 0 ? mag / (1 - kd * r2) : mag * (1 + kd * r2);
        const x = cx + (x0 - cx) * sc, y = cy + (y0 - cy) * sc, m = metric(x, y); if (m > 1.03) continue;
        const bl = bz * Math.min(1.4, Math.abs(P) / 4 + Math.abs(st.c) / 6) * Math.pow(m, 3) * 9, size = fs * sc * (kd < 0 ? 1 / (1 - kd * r2 * .6) : 1 + kd * r2 * .6), t = ch_(((i % 22) + 22) % 22, ((j % 13) + 13) % 13);
        g.font = `700 ${Math.max(6, size).toFixed(1)}px sans-serif`;
        if (bl < 1.2) { g.fillStyle = '#1f2937'; g.fillText(t, x, y); continue; }
        g.fillStyle = `rgba(31,41,55,${clamp(.06 + bl * .025, .1, .26).toFixed(2)})`;          // 흐림이 클수록 번진 잔상을 진하게
        for (let q = 0; q < 6; q++) { const an = q / 6 * Math.PI * 2; g.fillText(t, x + Math.cos(an) * bl, y + Math.sin(an) * bl * (1 + Math.abs(st.c) * .08)); }
        g.fillStyle = `rgba(31,41,55,${clamp(.9 - bl * .06, .25, .85).toFixed(2)})`; g.fillText(t, x, y);
      }
      g.restore();
      g.lineWidth = 3; g.strokeStyle = '#9aa4b2'; g.stroke(lens); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.save(); g.translate(2, 2); g.stroke(lens); g.restore();
      [[-1, -.32], [1, -.32]].forEach(([sx, sy]) => { const x = cx + sx * A * .93, y = cy + sy * B; g.fillStyle = '#d1d5db'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = '#9ca3af'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.strokeStyle = '#9ca3af'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * 46, y - 10); g.stroke(); });
      cap.innerHTML = `<b>${LB[Math.round(st.show)].n}</b> · <b class="num">S ${fmt(st.s)} / C ${fmt(st.c)}</b> 기준 — 렌즈 가장자리로 갈수록 글자가 휘고 흐려집니다. 등급을 올리면 가장자리 왜곡이 줄어요. <small>개념 설명용 그림입니다.</small>`;
    }
    function setLevel(v) {
      st.lv = v; rng.value = v; el.querySelectorAll('.lb-scale button').forEach(b => b.classList.toggle('is-on', +b.dataset.i === v));
      const from = st.show; if (anim) anim.cancel(); anim = tween(450, t => { st.show = lerp(from, v, t); draw(); });
    }
    rng.addEventListener('input', () => setLevel(+rng.value));
    el.querySelector('.lb-scale div').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLevel(+b.dataset.i); });
    draw();
    return { update(n) { st.s = n.s; st.c = n.c; draw(); }, destroy() { if (anim) anim.cancel(); } };
  };

  /* ═════════ 8. 빛번짐: 구면 수차 · 코마 · 트레포일과 빛번짐 렌즈 ═════════
     밤 도로 장면의 각 광원에 수차별 번짐(PSF)을 그려 더하고, 렌즈 창 안쪽만 번짐을 줄여 보여줍니다. */
  const GL_CTRL = {sa: .3, coma: .3, tre: .35, veil: .25};          // 빛번짐 렌즈 적용 시 남는 비율 (개념값)
  function glarePSF(g, L, a, ctrl) {                                // 한 광원의 번짐: 산란 + 구면 수차 + 코마 + 트레포일 + 코어
    const f = k => a[k] * (ctrl ? GL_CTRL[k] : 1), [r, gg, b] = L.c, col = al => `rgba(${r},${gg},${b},${Math.max(0, al).toFixed(3)})`;
    const rad = (x, y, R, al, stops = [[0, 1], [.35, .4], [1, 0]]) => { const gr = g.createRadialGradient(x, y, 0, x, y, R); stops.forEach(([o, m]) => gr.addColorStop(o, col(al * m))); g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); };
    // 빛의 중심에서 가장 굵고 끝으로 갈수록 가늘어지는 물방울 모양 갈래 (코마는 양옆 2개, 트레포일은 세 갈래)
    const tear = (ang, len, w0, al) => {
      g.save(); g.translate(L.x, L.y); g.rotate(ang);
      [[1, 1], [.7, .8], [.45, .55]].forEach(([s, m]) => {
        const w = w0 * s, l = len * (.55 + .45 * s), gr = g.createRadialGradient(0, 0, 0, 0, 0, l);
        gr.addColorStop(0, col(al * m)); gr.addColorStop(.4, col(al * m * .5)); gr.addColorStop(1, col(0));
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w); g.quadraticCurveTo(l * .5, -w * .8, l, 0); g.quadraticCurveTo(l * .5, w * .8, 0, w); g.arc(0, 0, w, Math.PI / 2, -Math.PI / 2); g.closePath(); g.fill();
      });
      g.restore();
    };
    const sa = f('sa'), co = f('coma'), tr = f('tre'), ve = f('veil');
    if (ve > .01) rad(L.x, L.y, L.r * 26, .18 * ve * L.i, [[0, 1], [.35, .4], [1, 0]]);
    if (sa > .01) { rad(L.x, L.y, L.r * (2.5 + 13 * sa), .55 * sa * L.i, [[0, 1], [.28, .45], [1, 0]]); g.lineWidth = L.r * .35; g.strokeStyle = col(.18 * sa * L.i); g.beginPath(); g.arc(L.x, L.y, L.r * (2.2 + 9 * sa), 0, 7); g.stroke(); }
    if (co > .01) [0, Math.PI].forEach(d => tear(L.ca + d, L.r * (3.5 + 22 * co), L.r * (.8 + 1.2 * co), .55 * co * L.i));
    if (tr > .01) for (let k = 0; k < 3; k++) tear(-Math.PI / 2 + k * Math.PI * 2 / 3, L.r * (3.5 + 18 * tr), L.r * (.6 + .9 * tr), .5 * tr * L.i);
    rad(L.x, L.y, L.r * 1.5, 1, [[0, 1], [.5, .85], [1, 0]]);         // 빛의 중심
  }
  Sim.mountGlare = function (el) {
    const W = 1200, H = 540, LW = 470, LH = 320;
    const st = {sa: .55, coma: .45, tre: .35, veil: .45, mode: 'win', lx: 790, ly: 340, day: false, t: 0};   // t: 0 밤 → 1 낮 (전환 중간값)
    let anim = null;
    el.innerHTML = `<div class="gl2"><div class="gl2-l"><div class="gl"><canvas width="${W}" height="${H}"></canvas><span class="vz-tag vz-tag--l" data-k="tl"></span><span class="vz-tag vz-tag--r" data-k="tr"></span></div>
        <div class="gl-ctl"><div class="seg" data-k="time"><button data-v="day">낮</button><button data-v="night" class="is-on">밤</button></div><p class="sim-cap" data-k="cap"></p></div></div>
      <div class="gl2-r">${[['sa', '구면 수차', '빛 둘레로 둥글게 번져요'], ['coma', '코마', '빛 양옆으로 길게 늘어져 퍼져요'], ['tre', '트레포일', '세 갈래 별 모양으로 퍼져요']].map(([k, n, d]) =>
          `<div class="gl-card"><canvas width="480" height="260" data-psf="${k}"></canvas><div class="gl-card__t"><b>${n}</b><span>${d}</span><div class="sl"><label><span>번짐 정도</span><b class="num" data-v="${k}"></b></label><input type="range" min="0" max="100" value="${Math.round(st[k] * 100)}" data-k="${k}"></div></div></div>`).join('')}
        <div class="gl-card gl-card--v"><div class="gl-card__t"><div class="sl"><label><span>산란 · 뿌연 막 <small>전체가 뿌옇게</small></span><b class="num" data-v="veil"></b></label><input type="range" min="0" max="100" value="${Math.round(st.veil * 100)}" data-k="veil"></div></div></div></div></div>`;    const cv = el.querySelector('.gl canvas'), g = cv.getContext('2d'), wrap = el.querySelector('.gl');
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const base = mk(), baseDay = mk(), glN = mk(), glC = mk();
    // 밤 / 낮 색 구성: 낮에는 하늘·도로가 밝고 가로등은 꺼져 있어 빛번짐이 없음
    const PAL = {
      night: {sky: ['#04060c', '#0f1526', '#1c2236'], city: '#0b0f1a', win: 'rgba(255,205,120,.5)', ground: ['#1d2230', '#2a2f3d'], road: ['#14171f', '#1b1f29', '#232834'], grain: 'rgba(255,255,255,.025)',
        edge: 'rgba(230,232,236,.75)', curb: '#3a3f4b', tree: '#080b12', trunk: '#080b12', pole: '#2b3140', lamp: '#1d222d', signal: '#20252f', far: '#0d1018'},
      day: {sky: ['#5fa6e0', '#9dcbef', '#e3edf5'], city: '#8f9cad', win: 'rgba(214,230,242,.85)', ground: ['#8d929b', '#a7abb2'], road: ['#4d535e', '#5b616c', '#6a707b'], grain: 'rgba(0,0,0,.05)',
        edge: 'rgba(255,255,255,.95)', curb: '#c3c6cc', tree: '#47783f', trunk: '#5b4636', pole: '#7b8291', lamp: '#a3aab5', signal: '#4b5563', far: '#3f4652'}
    };
    const VX = 600, VY = 250;                                        // 도로 소실점
    const CAR = {x: 600, y: 470, w: 300};                            // 마주 오는 차 (앞모습) 중심 · 바닥 높이 · 폭
    const HL = [[CAR.x - CAR.w * .33, CAR.y - 92], [CAR.x + CAR.w * .33, CAR.y - 92]];
    const POLES = [[-1, 330, 150, 7], [-1, 460, 196, 5], [-1, 530, 220, 3.6], [1, 870, 150, 7], [1, 740, 196, 5], [1, 670, 220, 3.6]];   // 쪽, 등 x, 등 y, 크기
    const LIGHTS = [
      {x: 160, y: 86, r: 10, i: .85, c: [228, 236, 255]},
      ...POLES.map(([, x, y, r]) => ({x, y, r, i: .9, c: [255, 210, 128]})),
      ...HL.map(([x, y]) => ({x, y, r: 10, i: 1, c: [246, 249, 255]})),
      {x: 640, y: 262, r: 2.6, i: .9, c: [246, 249, 255]}, {x: 652, y: 262, r: 2.6, i: .9, c: [246, 249, 255]},
      {x: 566, y: 258, r: 2.2, i: .8, c: [255, 70, 60]}, {x: 578, y: 258, r: 2.2, i: .8, c: [255, 70, 60]},
      {x: 1010, y: 236, r: 4.5, i: .9, c: [70, 255, 150]}
    ].map((L, k) => ({...L, ca: -.5 + (k % 3) * .14}));
    function drawBase(c, day) {
      const b = c.getContext('2d'), p = PAL[day ? 'day' : 'night'], lg = (x0, y0, x1, y1, st) => { const gr = b.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      b.fillStyle = lg(0, 0, 0, VY + 20, [[0, p.sky[0]], [.7, p.sky[1]], [1, p.sky[2]]]); b.fillRect(0, 0, W, VY + 20);
      if (day) { b.fillStyle = 'rgba(255,255,255,.75)'; [[180, 70, 70], [250, 84, 50], [820, 60, 80], [900, 76, 54]].forEach(([x, y, r]) => { b.beginPath(); b.ellipse(x, y, r, r * .35, 0, 0, 7); b.fill(); }); }
      else {
        b.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 70; i++) { const x = (i * 157) % W, y = (i * 61) % (VY - 40); b.fillRect(x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
        b.fillStyle = '#d9e0f0'; b.beginPath(); b.arc(160, 86, 16, 0, 7); b.fill(); b.fillStyle = 'rgba(160,170,190,.5)'; b.beginPath(); b.arc(154, 82, 4, 0, 7); b.arc(166, 92, 3, 0, 7); b.fill();
      }
      // 먼 도시 실루엣과 창문
      b.fillStyle = p.city; [[0, 120, 70], [60, 160, 90], [140, 110, 60], [960, 150, 80], [1030, 100, 70], [1090, 170, 110]].forEach(([x, h, w]) => b.fillRect(x, VY + 20 - h, w, h));
      b.fillStyle = p.win; for (let i = 0; i < 60; i++) { const bx = i % 2 ? 965 + (i * 23) % 220 : 8 + (i * 29) % 180, by = VY - 110 + (i * 17) % 110; b.fillRect(bx, by, 5, 7); }
      // 도로: 아스팔트 · 보도 · 연석
      b.fillStyle = lg(0, VY, 0, H, [[0, p.ground[0]], [1, p.ground[1]]]); b.fillRect(0, VY + 18, W, H);
      const road = (lx, rx) => { b.beginPath(); b.moveTo(VX - 34, VY); b.lineTo(VX + 34, VY); b.lineTo(rx, H); b.lineTo(lx, H); b.closePath(); };
      road(-260, W + 260); b.fillStyle = lg(0, VY, 0, H, [[0, p.road[0]], [.6, p.road[1]], [1, p.road[2]]]); b.fill();
      b.fillStyle = p.grain; for (let i = 0; i < 900; i++) { const y = VY + 10 + Math.pow((i * 37 % 100) / 100, 1.6) * (H - VY), x = VX + ((i * 71 % 200) - 100) / 100 * (y - VY) * 2.6; b.fillRect(x, y, 2, 1); }
      const edge = (side, off, w, c) => { b.strokeStyle = c; b.lineWidth = w; b.beginPath(); b.moveTo(VX + side * 30, VY); b.lineTo(VX + side * off, H); b.stroke(); };
      edge(-1, 760, 5, p.edge); edge(1, 760, 5, p.edge);
      edge(-1, 880, 10, p.curb); edge(1, 880, 10, p.curb);
      for (let k = 0; k < 14; k++) { const t0 = Math.pow(k / 14, 2.1), t1 = Math.pow((k + .45) / 14, 2.1), y0 = VY + t0 * (H - VY), y1 = VY + t1 * (H - VY);   // 원근에 맞춘 중앙 점선
        b.fillStyle = 'rgba(240,198,80,.85)'; b.beginPath(); b.moveTo(VX - 1 - t0 * 6, y0); b.lineTo(VX + 1 + t0 * 6, y0); b.lineTo(VX + 1 + t1 * 6, y1); b.lineTo(VX - 1 - t1 * 6, y1); b.fill(); }
      // 가로수 실루엣
      [[-1, 90, 60], [-1, 230, 34], [-1, 360, 20], [1, 1110, 60], [1, 975, 34], [1, 850, 20]].forEach(([, x, s]) => { b.fillStyle = p.trunk; b.fillRect(x - s * .08, VY + 30 - s * .3, s * .16, s * 1.2); b.fillStyle = p.tree; b.beginPath(); b.ellipse(x, VY + 30 - s * 1.6, s * 1.25, s * 1.6, 0, 0, 7); b.fill(); });
      // 가로등: 기둥 · 팔 · 등기구
      POLES.forEach(([side, x, y, s]) => { const px = x - side * s * 7, base = y + s * 34;
        b.strokeStyle = p.pole; b.lineWidth = s * .9; b.beginPath(); b.moveTo(px, base); b.lineTo(px, y + s * 2); b.quadraticCurveTo(px, y - s * .5, x + side * s * .5, y - s * .2); b.stroke();
        b.fillStyle = p.lamp; b.beginPath(); b.ellipse(x, y - s * .4, s * 1.8, s * .7, 0, Math.PI, 0); b.fill(); });
      b.fillStyle = p.signal; b.fillRect(1005, 222, 12, 46); b.fillRect(1009, 268, 4, 120);
      if (day) { b.fillStyle = '#3b8f5a'; b.beginPath(); b.arc(1011, 258, 4, 0, 7); b.fill(); }
      // 젖은 노면의 빛 반사 (세로 줄기, 밤에만)
      if (!day) LIGHTS.forEach(L => { if (L.y > VY + 40 || L.y < 120 && L.x < 300) return; const rx = L.x, top = Math.max(L.y + 40, VY + 12);
        const gr = b.createLinearGradient(0, top, 0, Math.min(H, top + 220)); gr.addColorStop(0, `rgba(${L.c.join(',')},.22)`); gr.addColorStop(1, `rgba(${L.c.join(',')},0)`);
        b.fillStyle = gr; b.fillRect(rx - L.r * 1.2, top, L.r * 2.4, 220); });
      // 멀리 오는 차 · 앞차 실루엣
      b.fillStyle = p.far; b.fillRect(632, 252, 28, 14); b.fillRect(560, 250, 26, 14);
      drawCar(b, day);
      b.fillStyle = 'rgba(242,212,90,.9)'; b.beginPath(); b.moveTo(VX - 6, H - 60); b.lineTo(VX + 6, H - 60); b.lineTo(VX + 8, H); b.lineTo(VX - 8, H); b.fill();
    }
    function drawCar(b, day) {
      const {x, y, w} = CAR, h = w * .56, D = day, lg =(x0, y0, x1, y1, st) => { const gr = b.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      const rr = (x0, y0, ww, hh, r) => { b.beginPath(); b.moveTo(x0 + r, y0); b.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, r); b.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, r); b.arcTo(x0, y0 + hh, x0, y0, r); b.arcTo(x0, y0, x0 + ww, y0, r); b.closePath(); };
      // 바닥 그림자 · 헤드라이트가 비춘 노면
      if (!D) { const gr = b.createRadialGradient(x, y + 30, 10, x, y + 30, w * .9); gr.addColorStop(0, 'rgba(255,250,235,.22)'); gr.addColorStop(1, 'rgba(255,250,235,0)'); b.fillStyle = gr; b.fillRect(x - w, y - 10, w * 2, 140); }
      b.fillStyle = D ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.55)'; b.beginPath(); b.ellipse(x, y + 4, w * .56, 14, 0, 0, 7); b.fill();
      // 바퀴
      b.fillStyle = '#0a0b0e'; rr(x - w * .47, y - 36, w * .14, 40, 7); b.fill(); rr(x + w * .33, y - 36, w * .14, 40, 7); b.fill();
      // 차체 (아래 범퍼 → 앞면 → 보닛)
      b.fillStyle = lg(0, y - h, 0, y, D ? [[0, '#ffad52'], [.45, '#ef8a2c'], [1, '#a5541a']] : [[0, '#d98a34'], [.45, '#b4651f'], [1, '#5c300d']]);
      b.beginPath(); b.moveTo(x - w * .5, y - 10); b.lineTo(x - w * .5, y - h * .55); b.quadraticCurveTo(x - w * .49, y - h * .72, x - w * .4, y - h * .74); b.lineTo(x + w * .4, y - h * .74);
      b.quadraticCurveTo(x + w * .49, y - h * .72, x + w * .5, y - h * .55); b.lineTo(x + w * .5, y - 10); b.quadraticCurveTo(x, y + 4, x - w * .5, y - 10); b.fill();
      // 캐빈 · 앞유리
      b.fillStyle = lg(0, y - h, 0, y - h * .72, D ? [[0, '#e07a26'], [1, '#f6a046']] : [[0, '#a8571a'], [1, '#c87529']]);
      b.beginPath(); b.moveTo(x - w * .4, y - h * .74); b.lineTo(x - w * .3, y - h * 1.08); b.quadraticCurveTo(x, y - h * 1.14, x + w * .3, y - h * 1.08); b.lineTo(x + w * .4, y - h * .74); b.fill();
      b.fillStyle = lg(0, y - h * 1.06, 0, y - h * .76, D ? [[0, '#3f5975'], [.6, '#6e8aa8'], [1, '#9db3c9']] : [[0, '#0b1424'], [.6, '#18263d'], [1, '#22324c']]);
      b.beginPath(); b.moveTo(x - w * .36, y - h * .77); b.lineTo(x - w * .28, y - h * 1.03); b.quadraticCurveTo(x, y - h * 1.08, x + w * .28, y - h * 1.03); b.lineTo(x + w * .36, y - h * .77); b.closePath(); b.fill();
      b.save(); b.clip(); b.fillStyle = 'rgba(180,200,230,.16)'; b.beginPath(); b.moveTo(x + w * .05, y - h * 1.1); b.lineTo(x + w * .16, y - h * 1.1); b.lineTo(x - w * .04, y - h * .74); b.lineTo(x - w * .15, y - h * .74); b.fill(); b.restore();
      // 사이드미러
      b.fillStyle = D ? '#e47f2a' : '#9c5419'; [-1, 1].forEach(s => { b.beginPath(); b.ellipse(x + s * w * .45, y - h * .8, w * .045, w * .028, s * .3, 0, 7); b.fill(); });
      // 보닛 하이라이트 · 앞면 선
      b.strokeStyle = 'rgba(255,220,170,.35)'; b.lineWidth = 2; b.beginPath(); b.moveTo(x - w * .38, y - h * .7); b.quadraticCurveTo(x, y - h * .78, x + w * .38, y - h * .7); b.stroke();
      // 헤드라이트 하우징
      [-1, 1].forEach(s => { b.fillStyle = '#20232b'; b.beginPath(); b.moveTo(x + s * w * .2, y - h * .62); b.lineTo(x + s * w * .46, y - h * .66); b.lineTo(x + s * w * .44, y - h * .5); b.lineTo(x + s * w * .22, y - h * .5); b.closePath(); b.fill();
        b.fillStyle = D ? '#c9d2dd' : 'rgba(235,242,255,.95)'; b.beginPath(); b.moveTo(x + s * w * .25, y - h * .6); b.lineTo(x + s * w * .42, y - h * .63); b.lineTo(x + s * w * .41, y - h * .56); b.lineTo(x + s * w * .26, y - h * .54); b.closePath(); b.fill(); });
      // 그릴 · 엠블럼 · 안개등 · 번호판
      b.fillStyle = '#15171c'; rr(x - w * .19, y - h * .5, w * .38, h * .2, 8); b.fill();
      b.strokeStyle = 'rgba(255,255,255,.08)'; b.lineWidth = 1; for (let i = 1; i < 8; i++) { b.beginPath(); b.moveTo(x - w * .18 + i * w * .045, y - h * .49); b.lineTo(x - w * .18 + i * w * .045, y - h * .31); b.stroke(); }
      b.fillStyle = '#c9ccd3'; b.beginPath(); b.ellipse(x, y - h * .44, w * .03, w * .018, 0, 0, 7); b.fill();
      b.fillStyle = '#121418'; rr(x - w * .42, y - h * .26, w * .84, h * .14, 10); b.fill();
      b.fillStyle = D ? '#9aa2ad' : 'rgba(255,240,210,.8)'; [-1, 1].forEach(s => { b.beginPath(); b.ellipse(x + s * w * .36, y - h * .19, w * .03, w * .016, 0, 0, 7); b.fill(); });
      b.fillStyle = '#eceef1'; rr(x - w * .12, y - h * .25, w * .24, h * .1, 3); b.fill(); b.fillStyle = '#1f2937'; b.font = `800 ${Math.round(w * .055)}px sans-serif`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('12가 3456', x, y - h * .2);
    }
    function drawGlare(c, ctrl) {
      const x = c.getContext('2d'); x.clearRect(0, 0, W, H); x.globalCompositeOperation = 'lighter';
      LIGHTS.forEach(L => glarePSF(x, L, st, ctrl)); x.globalCompositeOperation = 'source-over';
    }
    const lensPath = () => { const p = new Path2D(), w = LW, h = LH, x = st.lx - w / 2, y = st.ly - h / 2, r = 90;
      p.moveTo(x + r, y); p.lineTo(x + w - r * .6, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r * 1.2, y + h);
      p.lineTo(x + r * 1.2, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r * .8); p.quadraticCurveTo(x, y, x + r, y); p.closePath(); return p; };
    function compose() {
      g.drawImage(base, 0, 0);
      if (st.mode !== 'win') g.drawImage(st.mode === 'all' ? glC : glN, 0, 0);
      else {
        const lp = lensPath(), out = new Path2D(); out.rect(0, 0, W, H); out.addPath(lp);
        g.save(); g.clip(out, 'evenodd'); g.drawImage(glN, 0, 0); g.restore();
        g.save(); g.clip(lp); g.drawImage(glC, 0, 0); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 6; g.beginPath();
        g.moveTo(st.lx + 160, st.ly - 175); g.lineTo(st.lx + 60, st.ly - 50); g.moveTo(st.lx + 186, st.ly - 160); g.lineTo(st.lx + 86, st.ly - 35); g.stroke(); g.restore();
      }
      if (st.t > .001) { g.globalAlpha = st.t; g.drawImage(baseDay, 0, 0); g.globalAlpha = 1; }      // 낮: 밝은 장면, 가로등 꺼짐 → 번짐 없음
      if (st.mode === 'win') { g.lineWidth = 3.5; g.strokeStyle = `rgba(255,255,255,${(.9 - st.t * .35).toFixed(2)})`; g.stroke(lensPath()); }
      const tl = el.querySelector('[data-k=tl]'), tr = el.querySelector('[data-k=tr]');
      tl.textContent = st.day ? '낮 · 빛번짐 거의 없음' : '일반 렌즈'; tr.textContent = '렌즈 창 안 · 빛번짐 렌즈'; tr.hidden = st.mode !== 'win' || st.day;
    }
    function drawPSF() {
      el.querySelectorAll('[data-psf]').forEach(c => {
        const x = c.getContext('2d'), k = c.dataset.psf, one = {sa: 0, coma: 0, tre: 0, veil: 0, [k]: Math.max(.35, st[k])};
        x.fillStyle = '#070a12'; x.fillRect(0, 0, 480, 260); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(239, 0, 2, 260);
        x.globalCompositeOperation = 'lighter';
        glarePSF(x, {x: 120, y: 122, r: 6, i: 1, c: [245, 248, 255], ca: -.5}, one, false);
        glarePSF(x, {x: 360, y: 122, r: 6, i: 1, c: [245, 248, 255], ca: -.5}, one, true);
        x.globalCompositeOperation = 'source-over';
        x.font = '800 20px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#cbd5e1'; x.fillText('일반 렌즈', 120, 240); x.fillStyle = '#7fd3e5'; x.fillText('빛번짐 렌즈', 360, 240);
      });
    }
    function redraw() {
      drawGlare(glN, false); drawGlare(glC, true); compose(); drawPSF();
      el.querySelectorAll('.gl2-r b[data-v]').forEach(b => b.textContent = Math.round(st[b.dataset.v] * 100));
      caption();
    }
    function caption() {
      el.querySelector('[data-k=cap]').innerHTML = (st.day
        ? `<b>낮에는</b> 주변이 밝고 동공이 작아져 렌즈 가운데로만 빛이 들어오므로, 수차가 작아 빛번짐이 거의 없어요.`
        : `<b>밤에는</b> 어두워 동공이 커지면서 렌즈 가장자리까지 빛이 들어와 수차가 커지고, 가로등 · 헤드라이트 빛이 퍼져 보여요.
          ${st.mode === 'win' ? '렌즈 창을 끌어 헤드라이트나 가로등 위로 옮겨 보세요 — 창 안쪽이 빛번짐 렌즈로 본 모습입니다.' : ''}`)
        + ` <small>코마 · 트레포일 · 구면 수차를 단순화한 개념 이미지이며, 효과는 제품과 개인에 따라 다릅니다.</small>`;
    }
    let drag = null;
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    wrap.addEventListener('pointerdown', e => { if (st.mode !== 'win') return; const [x, y] = toCanvas(e); drag = {dx: st.lx - x, dy: st.ly - y}; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = toCanvas(e); st.lx = clamp(x + drag.dx, LW / 2, W - LW / 2); st.ly = clamp(y + drag.dy, LH / 2, H - LH / 2); compose(); });
    ['pointerup', 'pointercancel'].forEach(k => wrap.addEventListener(k, () => { drag = null; }));
    el.querySelectorAll('.gl2-r input').forEach(i => i.addEventListener('input', () => { st[i.dataset.k] = +i.value / 100; redraw(); }));
    el.querySelector('[data-k=time]').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || (b.dataset.v === 'day') === st.day) return;
      st.day = b.dataset.v === 'day'; el.querySelectorAll('[data-k=time] button').forEach(x => x.classList.toggle('is-on', x === b));
      const from = st.t; if (anim) anim.cancel(); anim = tween(900, k => { st.t = lerp(from, st.day ? 1 : 0, k); compose(); }); caption();
    });
    wrap.classList.toggle('is-win', st.mode === 'win'); drawBase(base, false); drawBase(baseDay, true); redraw();
    return { update() {}, destroy() { if (anim) anim.cancel(); } };
  };

  Sim.progView = function (col, add, tier, opt = {}) {
    ensureProgScene();
    const n = ++uid, s = Sim.progScores(col, tier), k = clamp(1.18 - .13 * add, .7, 1.05);
    const blur = (2.5 + add * 3.5) * (2.2 - s.side / 50), swim = (100 - s.side) * .36, zone = clearZone(s, k);
    return `<svg class="pg-svg" viewBox="0 0 200 200" role="img" aria-label="시야 지도"><defs>
      <clipPath id="pc${n}"><circle cx="100" cy="100" r="96"/></clipPath>
      <filter id="pb${n}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".011 .019" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="${swim.toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${(blur * 1.25).toFixed(1)} ${(blur * .85).toFixed(1)}" result="b"/><feColorMatrix in="b" type="saturate" values="${(1 - (100 - s.side) / 280).toFixed(2)}"/></filter>
      <filter id="pm${n}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter>
      <mask id="pk${n}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#000"/><path d="${zone}" fill="#fff" filter="url(#pm${n})"/></mask></defs>
      <g clip-path="url(#pc${n})"><g transform="scale(.4545)"><use href="#prog-scene" filter="url(#pb${n})"/></g>
        <rect width="200" height="200" fill="#c2410c" opacity="${((100 - s.side) / 1000).toFixed(2)}"/>
        <g mask="url(#pk${n})"><g transform="scale(.4545)"><use href="#prog-scene"/></g></g>
        <path d="${zone}" fill="none" stroke="#fff" stroke-width="3.6" stroke-opacity="1"/><path d="${zone}" fill="none" stroke="#0b7a91" stroke-width="1.7"/>
        ${opt.labels ? `<text x="24" y="150" font-size="9" font-weight="800" fill="#7c2d12" opacity=".85">흐림</text><text x="176" y="150" font-size="9" font-weight="800" fill="#7c2d12" opacity=".85" text-anchor="end">흐림</text>` : ''}</g>
      <circle cx="100" cy="100" r="96" fill="none" stroke="#cfd6e0" stroke-width="3"/></svg>`;
  };

  global.Sim = Sim;
})(window);
