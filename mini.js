/* 아이젠트리 V4 · 분류 하단의 미니 시뮬레이션
   예전에는 분류마다 설명 이미지를 붙였지만, 같은 내용을 직접 만져 볼 수 있는 시뮬레이션으로 바꿉니다.
   모든 시뮬레이션은 개념 설명용 단순 모델입니다. */
(function (global) {
  'use strict';
  const Mini = {};
  let handles = [], uid = 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* 어린이 근시: 성장하면서 안구가 길어지면 초점이 망막 앞으로 */
  function mountAxial(el) {
    const id = 'ax' + (++uid), L0 = 22.6, PX = 11.5, AGE0 = 6, AGE1 = 18;
    el.innerHTML = `<svg viewBox="0 0 520 210" class="mini-svg" aria-hidden="true"></svg>
      <div class="sl"><label>나이 <b class="num" id="${id}a"></b></label><input type="range" min="${AGE0}" max="${AGE1}" step="1" value="8"></div>
      <p class="sim-cap" id="${id}c"></p>`;
    const svg = el.querySelector('svg'), rng = el.querySelector('input'), ac = new AbortController();
    function draw() {
      const age = +rng.value, t = (age - AGE0) / (AGE1 - AGE0), AL = L0 + 2.2 * Math.pow(t, .85);       // 근시가 진행되는 눈의 안축장 (개념값)
      const x0 = 120, L = AL * PX, xr = x0 + L, F = x0 + L0 * PX, cy = 105, ry = 64 + (AL - L0) * 5;
      const ray = y => { const k = (cy - y) / (F - 160), yr = y + k * (xr - 160); return `<path d="M20 ${y}H160L${F.toFixed(1)} ${cy}L${xr.toFixed(1)} ${yr.toFixed(1)}" fill="none" stroke="#f59e0b" stroke-width="2"/>`; };
      const blur = clamp((xr - F) * .42, 1.5, 26), D = (AL - L0) * 2.7;
      svg.innerHTML = `<ellipse cx="${(x0 + L / 2).toFixed(1)}" cy="${cy}" rx="${(L / 2).toFixed(1)}" ry="${ry.toFixed(1)}" fill="#fff" stroke="#94a3b8" stroke-width="3"/>
        <path d="M${(x0 + L / 2 + (L / 2) * Math.cos(-.9)).toFixed(1)} ${(cy + ry * Math.sin(-.9)).toFixed(1)}A${(L / 2).toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${(x0 + L / 2 + (L / 2) * Math.cos(.9)).toFixed(1)} ${(cy + ry * Math.sin(.9)).toFixed(1)}" fill="none" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="160" cy="${cy}" rx="7" ry="26" fill="#9bd1ea" stroke="#3f8fbf" stroke-width="2"/>${[70, 105, 140].map(ray).join('')}
        <circle cx="${F.toFixed(1)}" cy="${cy}" r="5" fill="#16a34a"/><text x="${F.toFixed(1)}" y="${cy - 14}" font-size="12" font-weight="800" fill="#16a34a" text-anchor="middle">초점</text>
        <ellipse cx="${xr.toFixed(1)}" cy="${cy}" rx="${(blur * .55).toFixed(1)}" ry="${blur.toFixed(1)}" fill="#f59e0b" fill-opacity=".35" stroke="#f59e0b"/>
        <text x="${(xr + 14).toFixed(1)}" y="${cy + 4}" font-size="12" font-weight="800" fill="#e5484d">망막</text>
        <text x="20" y="194" font-size="12" font-weight="700" fill="#64748b">안구 길이 ${AL.toFixed(1)}mm</text>`;
      el.querySelector('#' + id + 'a').textContent = age + '세';
      el.querySelector('#' + id + 'c').innerHTML = D < .4 ? '초점이 망막에 정확히 맺혀 <b>또렷하게</b> 보여요.' : `성장기에 <b>안구 길이가 늘어나면</b> 초점이 망막 <b>앞</b>에 맺혀 근시가 진행돼요 (약 <b class="num">−${D.toFixed(1)}D</b>). <small>안구가 1mm 길어지면 근시가 대략 2.5~3D 진행하는 경험값을 쓴 개념도입니다.</small>`;
    }
    rng.addEventListener('input', draw, {signal: ac.signal}); draw();
    return {destroy() { ac.abort(); }};
  }

  /* 굴절률별 두께: 근시와 원시 두 가지를 한 번에 */
  function mountThick(el) {
    const rows = [1.56, 1.60, 1.67, 1.74].map(n => ({idx: n.toFixed(2), n, st: 'ok'}));
    el.innerHTML = [[-4, '근시 −4.00D · 가장자리 두께'], [4, '원시 +4.00D · 중심 두께']].map(([P, t]) => `<div class="mini-thick"><b>${t}</b>${Sim.thicknessHTML({P, rows, r: 31})}</div>`).join('')
      + '<p class="sim-cap">굴절률이 높을수록 같은 도수에서 렌즈가 얇아집니다. <small>단순화한 계산 모델입니다.</small></p>';
    return {};
  }

  /* ───── 단초점 하단: 한 줄짜리 간단 그림 3개 (조작 없음) ───── */
  function mountBlue1(el) {
    const x = nm => 10 + (nm - 300) / 480 * 280, id = 'b1' + (++uid);
    el.innerHTML = `<svg viewBox="0 0 300 116" class="mini-svg mini-svg--c" aria-hidden="true">
      <defs><linearGradient id="${id}g" x1="0" x2="1">${[[300, '#6d28d9'], [400, '#4338ca'], [450, '#2563eb'], [500, '#06b6d4'], [550, '#22c55e'], [590, '#eab308'], [650, '#f97316'], [700, '#dc2626'], [780, '#7f1d1d']].map(([n, c]) => `<stop offset="${((n - 300) / 480).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient>
        <pattern id="${id}h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#0f172a" fill-opacity=".55"/><line x1="0" y1="0" x2="0" y2="6" stroke="#fff" stroke-opacity=".55" stroke-width="2"/></pattern></defs>
      <rect x="10" y="38" width="280" height="26" rx="5" fill="url(#${id}g)"/>
      <rect x="10" y="38" width="${(x(400) - 10).toFixed(1)}" height="26" rx="5" fill="url(#${id}h)"/>
      <rect x="${x(400).toFixed(1)}" y="38" width="${(x(500) - x(400)).toFixed(1)}" height="26" fill="url(#${id}h)" fill-opacity=".45"/>
      <g font-size="10" font-weight="800" fill="#475569" text-anchor="middle"><text x="${((10 + x(400)) / 2).toFixed(1)}" y="30">UV 자외선</text><text x="${((x(400) + x(500)) / 2).toFixed(1)}" y="30">블루라이트</text><text x="${((x(500) + 290) / 2).toFixed(1)}" y="30">가시광선</text></g>
      <g font-size="10" font-weight="800" text-anchor="middle"><text x="${((10 + x(400)) / 2).toFixed(1)}" y="82" fill="#b42318">차단 99%↑</text><text x="${((x(400) + x(500)) / 2).toFixed(1)}" y="82" fill="#b54708">일부 차단</text><text x="${((x(500) + 290) / 2).toFixed(1)}" y="82" fill="#027a48">그대로 통과</text></g>
      <g font-size="9" fill="#94a3b8" text-anchor="middle"><text x="${x(400).toFixed(1)}" y="104">400nm</text><text x="${x(500).toFixed(1)}" y="104">500nm</text></g></svg>
      <p class="mini-cap">블루라이트 차단율은 제품마다 달라요 (21~40%)</p>`;
    return {};
  }
  function mountDist1(el) {
    const id = 'd1' + (++uid);
    const grid = k => { let d = ''; const N = 6; for (let a = -N; a <= N; a++) for (const hz of [0, 1]) { let p = ''; for (let j = -24; j <= 24; j++) { const u = a / N * 1.08, w = j / 24 * 1.08, px = hz ? w : u, py = hz ? u : w, f = 1 + k * (px * px + py * py); p += (j === -24 ? 'M' : 'L') + (50 + px * f * 44).toFixed(1) + ' ' + (50 + py * f * 44).toFixed(1); } d += p; } return d; };
    el.innerHTML = `<div class="mini-3">${[['구면', -.22], ['비구면', -.13], ['양면비구면', -.07]].map(([n, k], i) => `<figure><svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}c${i}"><circle cx="50" cy="50" r="44"/></clipPath></defs><circle cx="50" cy="50" r="46" fill="#0f1c2e"/><path d="${grid(k)}" clip-path="url(#${id}c${i})" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1"/></svg><figcaption>${n}</figcaption></figure>`).join('')}</div>
      <p class="mini-cap">가장자리로 갈수록 휘어 보이는 정도 (−4.00D 예시)</p>`;
    return {};
  }
  function mountThick1(el) {
    const rows = [1.56, 1.60, 1.67, 1.74].map(n => ({idx: n.toFixed(2), n, st: 'ok'}));
    el.innerHTML = `<div class="mini-thick">${Sim.thicknessHTML({P: -4, rows, r: 31})}</div><p class="mini-cap">−4.00D 가장자리 두께 · 굴절률이 높을수록 얇아요</p>`;
    return {};
  }

  /* 자이스 포토퓨전 X 변색 컬러 이미지 — 가격표 데이터(다초점 분류 이미지)에 등록된 주소를 그대로 씀 */
  const ZCOLOR = 'https://d2moqdbadhfait.cloudfront.net/images/options/option_photofusion.png';
  function mountZColor(el) {
    let u = ZCOLOR;
    try { const c = S.data.categories.find(x => /다초점/.test(x.name || '')); if (c && c.img && typeof safeUrl === 'function' && safeUrl(c.img)) u = c.img; } catch (e) {}
    // 포스터 전체가 아니라 맨 아래 '색상' 부분(원 7개 + 이름 · 농도)만 잘라서 크게 보여줌 (원본 2133×2133 기준 x100~2040, y1330~1850)
    el.innerHTML = `<div class="zc"><img src="${esc(u)}" alt="자이스 포토퓨전 X 변색 컬러" decoding="async"></div>`;
    return {};
  }
  /* 3D 시뮬레이션(three.js)은 필요할 때만 불러옴 */
  function mount3D(el, kind) {
    let h = null, dead = false;
    el.innerHTML = '<div class="sim-note">3D 화면을 불러오는 중…</div>';
    import('./sim3d.js').then(M => { if (dead || !document.body.contains(el)) return; el.innerHTML = ''; h = kind === 'of' ? M.mountOffice(el) : M.mountProg3D(el, {tier: 3, add: (typeof S !== 'undefined' && S.add) || 1.5}); })
      .catch(() => { if (!dead) el.innerHTML = '<div class="sim-note">3D 화면을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</div>'; });
    return {destroy() { dead = true; if (h && h.destroy) h.destroy(); h = null; }};
  }
  const PANELS = {
    office3d: {t: '오피스 렌즈 · 모니터 · 서류 · 벽 시계 3D', w: 2, mount: el => mount3D(el, 'of')},
    zcolor: {t: '자이스 변색렌즈 컬러 · 포토퓨전 X', tab: '자이스 변색 컬러', w: 2, mount: mountZColor},
    consult: {t: '근시 진행 상담 · 또래 비교와 18세 예측', tab: '근시 진행 상담', w: 2, hud: 1, mount: el => MyoTools.mountConsult(el)},
    growth: {t: '영유아부터 성인까지 · 근시가 진행되는 원리', tab: '성장과 근시 진행 원리', w: 2, hud: 1, mount: el => MyoTools.mountGrowth(el)},
    blue1: {t: '블루라이트 · 어디가 차단되나', compact: true, mount: mountBlue1},
    dist1: {t: '설계별 왜곡', compact: true, mount: mountDist1},
    thick1: {t: '굴절률별 두께', compact: true, mount: mountThick1},
    blue: {t: '블루라이트 · 청색광을 거르는 두 가지 방식', mount: el => Sim.mountBlue(el)},
    dist: {t: '설계별 왜곡 · 구면 / 비구면 / 양면비구면', mount: el => Sim.mountDistortion(el, {s: -4, c: 0})},
    thick: {t: '굴절률별 두께 · 같은 도수 비교', w: 2, mount: mountThick},
    tint: {t: '선글라스 · 농도와 편광 비교', w: 2, mount: el => Sim.mountTint(el)},
    photo: {t: '변색 · 실내에서 야외로', tab: '변색 시연', w: 2, mount: el => Sim.mountTint(el, {type: 'photo'})},
    axial: {t: '왜 근시가 늘까요? · 성장기 안구 길이', w: 2, mount: mountAxial},
    myopia: {t: '근시 억제 렌즈의 원리', tab: '근시 억제 렌즈 원리', w: 2, hud: 1, mount: el => MyoTools.mountControl(el)},
    refraction: {t: '근시 · 원시 · 난시와 교정', w: 2, mount: el => Sim.mountRefraction(el)},
    glare: {t: '빛번짐 · 야간 운전 시야', w: 2, mount: el => Sim.mountGlare(el)}
  };
  const SETS = [                                             // 분류 이름 → 하단 시뮬레이션 (위에서부터 먼저 맞는 것)
    [/^오피스/, ['office3d']],
    [/근시 정보/, ['axial', 'myopia']],
    [/어린이 근시/, ['consult', 'growth', 'myopia']],
    [/시력 이상/, ['refraction']],
    [/빛번짐/, ['glare']],
    [/다초점/, ctx => ctx.photo ? ['zcolor'] : []],             // 다초점: 변색 보드를 보고 있을 때만 자이스 변색 컬러 이미지
    [/변색/, ['zcolor', 'photo']],
    [/선글라스/, ['tint']],
    [/단초점|고난시|착색/, ['blue1', 'dist1', 'thick1']]
  ];
  const setOf = (name, ctx) => { const s = SETS.find(x => x[0].test(name || '')); return s ? (typeof s[1] === 'function' ? s[1](ctx || {}) : s[1]) : null; };
  Mini.has = name => !!setOf(name, {photo: true});            // 이 분류에 하단 영역이 있는지 (비어 있으면 아무것도 안 붙임)
  Mini.html = (name, ctx) => {
    const ids = setOf(name, ctx); if (!ids || !ids.length) return '';
    const row = ids.every(k => PANELS[k].compact), tabs = !row && ids.length > 1;               // 여러 개면 탭으로 하나씩 보여줌
    return `<section class="minis ${row ? 'minis--row' : ''} ${tabs ? 'minis--tabs' : ''}">${tabs ? `<div class="seg mini-tabs">${ids.map((k, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-mt="${k}">${esc(PANELS[k].tab || PANELS[k].t)}</button>`).join('')}</div>` : ''}${ids.map((k, i) => `<div class="mini ${PANELS[k].w === 2 ? 'mini--w' : ''} ${PANELS[k].hud ? 'mini--hud' : ''} ${tabs && i ? 'is-off' : ''}" data-mini="${k}"><h4>${esc(PANELS[k].t)}</h4><div class="mini__b"></div></div>`).join('')}</section>`;
  };
  const mountCard = card => {
    if (card.dataset.m) return; card.dataset.m = '1';
    try { const h = PANELS[card.dataset.mini].mount(card.querySelector('.mini__b')); if (h) handles.push(h); } catch (e) { card.querySelector('.mini__b').innerHTML = '<div class="sim-note">시뮬레이션을 불러오지 못했습니다.</div>'; }
  };
  Mini.mount = root => {
    root.querySelectorAll('[data-mini]:not(.is-off)').forEach(mountCard);
    root.querySelectorAll('.mini-tabs').forEach(bar => bar.addEventListener('click', e => {      // 탭을 처음 누를 때 그 시뮬레이션을 불러옴 (상태는 유지)
      const b = e.target.closest('[data-mt]'); if (!b) return;
      bar.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
      bar.parentElement.querySelectorAll('[data-mini]').forEach(c => { const on = c.dataset.mini === b.dataset.mt; c.classList.toggle('is-off', !on); if (on) mountCard(c); });
    }));
  };
  Mini.destroy = () => { handles.forEach(h => { try { h.destroy && h.destroy(); } catch (e) {} }); handles = []; };
  global.Mini = Mini;
})(window);
