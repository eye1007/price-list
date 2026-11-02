/* 아이젠트리 V3 · 추가 시뮬레이션 (틴트·변색·편광 / 블루라이트 / 양안 도수차)
   sim.js 뒤에 불러와 Sim에 mount 함수를 덧붙입니다. 모두 개념 설명용 단순 모델입니다. */
(function (Sim) {
  'use strict';
  let uid = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const seg = (items, cur, key) => `<div class="seg">${items.map(([k, n]) => `<button type="button" class="${k === cur ? 'is-on' : ''}" data-${key}="${k}">${n}</button>`).join('')}</div>`;

  /* ═════════ 틴트 · 변색 · 편광 ═════════
     실사 사진(img/sea.jpg) 위에 선글라스 프레임(직접 그린 SVG)을 놓고, 왼쪽 렌즈는 일반 · 오른쪽 렌즈는 선택한 색상 렌즈. */
  const TINT = {gray: ['그레이', '#2b2f36'], brown: ['브라운', '#4a2f1a'], green: ['그린', '#1f3d2b']};
  const LENS = 'M112 168 C112 152 124 146 142 146 L340 146 C372 146 382 162 383 190 L384 232 C384 282 348 312 300 312 L190 312 C140 312 114 280 112 226 Z';
  const MIR = 'translate(800 0) scale(-1 1)';                       // 왼쪽 렌즈 모양을 좌우로 뒤집어 오른쪽 렌즈로
  function tintScene(id) {
    // 편광 장면: 일반 렌즈에서는 수면 반사 덮개(밝은 막 + 반짝임)가 물속을 가리고, 편광 렌즈에서는 덮개가 걷혀 바위·물고기가 드러남
    const fishAt = [[215, 215, -14, .95], [180, 262, 18, .7], [300, 190, 8, .6], [330, 270, -20, .8], [520, 205, 188, .9], [610, 262, 164, .75], [560, 170, 172, .6], [650, 215, 190, .7]]
      .map(([x, y, r, s]) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-24 0 C-17 -6.5 2 -7.5 14 -2.5 L27 -9 C25 -4 25 4 27 9 L14 2.5 C2 7.5 -17 6.5 -24 0Z"/></g>`).join('');
    const tbl = '0 .26 .48 .6 .66';
    const pill = (cls, x, t) => `<g class="${cls}" transform="translate(${x} 356)"><rect class="tn-pr" x="-46" y="-14" width="92" height="28" rx="14" fill="#0f141e" fill-opacity=".76"/><text class="tn-pt" y="5" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">${t}</text></g>`;
    return `<defs>
        <clipPath id="${id}cr"><path d="${LENS}" transform="${MIR}"/></clipPath>
        <filter id="${id}p" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="table" tableValues="${tbl}"/><feFuncG type="table" tableValues="${tbl}"/><feFuncB type="table" tableValues="${tbl}"/></feComponentTransfer></filter>
        <filter id="${id}c" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.18" intercept="-.07"/><feFuncG type="linear" slope="1.18" intercept="-.07"/><feFuncB type="linear" slope="1.18" intercept="-.07"/></feComponentTransfer></filter>
        <filter id="${id}b"><feGaussianBlur stdDeviation="1.2"/></filter>
        <linearGradient id="${id}vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f9ff" stop-opacity=".7"/><stop offset=".6" stop-color="#e8f3ff" stop-opacity=".54"/><stop offset="1" stop-color="#dcecff" stop-opacity=".4"/></linearGradient>
        <g id="${id}fish" fill="#082a35" fill-opacity=".62" filter="url(#${id}b)">${fishAt}</g>
        <g id="${id}v"><rect width="800" height="450" fill="url(#${id}vg)"/></g>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3038"/><stop offset=".5" stop-color="#14161b"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <image class="tn-bg" href="img/sea.jpg" width="800" height="450" preserveAspectRatio="xMidYMid slice"/>
      <use class="tn-fb" href="#${id}fish" opacity=".5" display="none"/><use class="tn-vb" href="#${id}v" display="none"/>
      <g clip-path="url(#${id}cr)"><image class="tn-ri" href="img/sea.jpg" width="800" height="450" preserveAspectRatio="xMidYMid slice"/>
        <use class="tn-fr" href="#${id}fish" display="none"/><use class="tn-vr" href="#${id}v" display="none"/>
        <rect class="tn-ov" width="800" height="450" style="mix-blend-mode:multiply"/></g>
      <g id="${id}fr">
        <path d="${LENS}" fill="none" stroke="url(#${id}f)" stroke-width="18" stroke-linejoin="round"/>
        <path d="M104 160 C104 140 122 133 146 133 L346 133 C384 133 396 148 399 176" fill="none" stroke="#0e1014" stroke-width="15" stroke-linecap="round"/>
        <rect x="94" y="150" width="26" height="36" rx="6" fill="#0e1014"/>
        <path d="M100 170 L64 178" stroke="#0e1014" stroke-width="13" stroke-linecap="round"/>
        <path d="M128 140 L330 140" stroke="#fff" stroke-opacity=".24" stroke-width="3" stroke-linecap="round"/></g>
      <use href="#${id}fr" transform="${MIR}"/>
      <path d="M383 186 C392 166 408 166 417 186" fill="none" stroke="#0e1014" stroke-width="13" stroke-linecap="round"/>
      <path d="${LENS}" fill="url(#${id}s)"/><path d="${LENS}" transform="${MIR}" fill="url(#${id}s)"/>
      ${pill('tn-ll', 248, '일반 렌즈')}${pill('tn-lr', 552, '')}`;
  }
  Sim.mountTint = function (el, o = {}) {
    const id = 'tn' + (++uid);
    const st = {type: o.type || 'tint', color: 'gray', dens: 55, out: true, pol: true, cur: 55, split: 40}, tw = {raf: 0}, ac = new AbortController(), sg = {signal: ac.signal};
    if (st.type === 'photo') st.out = false;                       // 변색은 실내에서 시작해 잠시 뒤 야외로 넘어가며 보여줌
    el.innerHTML = `<div class="dt__bar" id="${id}t"></div><div class="ex-ctl" id="${id}k"></div>
      <div class="vz vz--static" id="${id}"><svg class="vz-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${tintScene(id)}</svg></div><p class="sim-cap" id="${id}c"></p>`;
    const $$ = s => el.querySelector(s), box = $$('#' + id);
    const ov = box.querySelector('.tn-ov'), ri = box.querySelector('.tn-ri'), bg = box.querySelector('.tn-bg'), lab = box.querySelector('.tn-lr');
    const show = (cls, on) => box.querySelector(cls).setAttribute('display', on ? 'inline' : 'none');
    // 오른쪽 렌즈 안의 사진만 어둡게(색 입힘). 왼쪽 렌즈는 아무것도 하지 않은 일반 렌즈.
    // 편광 장면은 물속 사진 + 수면 반사 덮개: 일반 렌즈(와 편광 끔)는 덮개 때문에 물속이 가려지고, 편광을 켜면 덮개가 걷혀 물속이 보임
    function target() { return st.type === 'photo' ? (st.out ? 72 : 7) : st.type === 'pol' ? 34 : st.dens; }
    function paint() {
      const col = st.type === 'pol' ? TINT.gray[1] : TINT[st.color][1], isPol = st.type === 'pol', src = isPol ? 'img/water.jpg' : 'img/sea.jpg';
      ov.setAttribute('fill', col); ov.setAttribute('fill-opacity', (st.cur / 100 * .92).toFixed(3));
      if (bg.getAttribute('href') !== src) { bg.setAttribute('href', src); ri.setAttribute('href', src); }
      show('.tn-fb', isPol); show('.tn-vb', isPol); show('.tn-fr', isPol); show('.tn-vr', isPol && !st.pol);
      ri.setAttribute('filter', isPol && st.pol ? `url(#${id}c)` : 'none');
      const t = {tint: '틴트 렌즈', photo: st.out ? '변색 · 야외' : '변색 · 실내', pol: st.pol ? '편광 렌즈' : '일반 틴트'}[st.type];
      lab.querySelector('.tn-pt').textContent = t; const w = Math.max(92, t.length * 15 + 34);
      const r = lab.querySelector('.tn-pr'); r.setAttribute('width', w); r.setAttribute('x', -w / 2);
    }
    function animateTo(v) {
      cancelAnimationFrame(tw.raf); const a = st.cur, t0 = performance.now(), ms = st.type === 'photo' ? 1400 : 250;
      (function step(now) { const t = clamp((now - t0) / ms, 0, 1); st.cur = a + (v - a) * (1 - Math.pow(1 - t, 3)); paint(); if (t < 1) tw.raf = requestAnimationFrame(step); })(t0);
    }
    function caption() {
      const T = Math.round(100 - target());
      const txt = {
        tint: `빛 투과율 약 <b class="num">${T}%</b> · 농도가 높을수록 눈부심은 줄지만 어두운 곳에서는 시야가 어두워져요. 운전·야간에는 연한 농도를 권해요.`,
        photo: st.out ? `자외선이 있는 <b>야외</b>에서 어두워진 상태 · 투과율 약 <b class="num">${T}%</b>. 반응 속도와 진하기는 제품마다 달라요.` : `<b>실내</b>에서는 거의 투명한 상태 · 투과율 약 <b class="num">${T}%</b>. 자동차 유리는 자외선을 막아 차 안에서는 덜 어두워지는 제품이 많아요.`,
        pol: st.pol ? `수면에서 반사되는 빛(난반사)을 걸러 내서 <b>물속 바위와 물고기가 또렷하게</b> 보여요. 낚시·운전·바다에서 눈부심도 줄어요. 일부 디지털 화면은 어둡게 보일 수 있어요.` : `같은 농도의 일반 틴트는 <b>수면 반사광이 그대로</b> 남아 물속이 가려져요. 위 버튼에서 편광 켬을 눌러 비교해 보세요.`
      }[st.type];
      $$('#' + id + 'c').innerHTML = txt + ' <small>개념 이미지입니다.</small>';
    }
    function controls() {
      $$('#' + id + 't').innerHTML = seg([['tint', '틴트 (선글라스)'], ['photo', '변색'], ['pol', '편광']], st.type, 'ty');
      const c = $$('#' + id + 'k'); let h = '';
      if (st.type !== 'pol') h += `<div>${seg(Object.entries(TINT).map(([k, v]) => [k, v[0]]), st.color, 'co')}</div>`;
      if (st.type === 'tint') h += `<div class="sl"><label>농도 <b class="num">${st.dens}%</b></label><input type="range" min="10" max="85" step="5" value="${st.dens}" data-dens></div>`;
      if (st.type === 'photo') h += `<div>${seg([['0', '실내'], ['1', '야외 (햇빛)']], st.out ? '1' : '0', 'out')}</div>`;
      if (st.type === 'pol') h += `<div>${seg([['1', '편광 켬'], ['0', '편광 끔']], st.pol ? '1' : '0', 'pol')}</div>`;
      c.innerHTML = h;
    }
    const redraw = () => { controls(); animateTo(target()); caption(); };
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.ty) { st.type = b.dataset.ty; if (st.type === 'photo') { st.out = false; st.cur = 7; } } else if (b.dataset.co) st.color = b.dataset.co;
      else if (b.dataset.out !== undefined) st.out = b.dataset.out === '1'; else if (b.dataset.pol !== undefined) st.pol = b.dataset.pol === '1'; else return;
      redraw(); if (b.dataset.ty === 'photo') tw.to = setTimeout(() => { st.out = true; redraw(); }, 450);
    }, sg);
    el.addEventListener('input', e => { if (e.target.hasAttribute('data-dens')) { st.dens = +e.target.value; e.target.previousElementSibling.querySelector('b').textContent = st.dens + '%'; animateTo(target()); caption(); } }, sg);
    redraw(); st.cur = target(); paint();
    if (st.type === 'photo') tw.to = setTimeout(() => { st.out = true; redraw(); }, 900);
    return {destroy() { ac.abort(); clearTimeout(tw.to); cancelAnimationFrame(tw.raf); }};
  };

  /* ═════════ 블루라이트: 코팅(반사) vs 소재(흡수) ═════════ */
  Sim.mountBlue = function (el) {
    const st = {k: 'coat'}, id = 'bl' + (++uid);
    const KINDS = [['none', '일반 렌즈'], ['coat', '코팅형 (반사)'], ['abs', '소재형 (흡수)']];
    const CAP = {
      none: '파란빛이 거의 그대로 통과해요. 비교용 기준입니다.',
      coat: '렌즈 표면 코팅이 파란빛을 <b>반사</b>해요. 렌즈가 <b>푸르스름·보랏빛으로 비쳐</b> 보이고, 사진을 찍으면 색 반사가 도드라질 수 있어요.',
      abs: '렌즈 소재가 파란빛을 <b>흡수</b>해요. 반사광이 거의 없어 겉모습은 깔끔하고, 제품에 따라 <b>연한 노란 기운</b>이 돌 수 있어요.'
    };
    const spec = k => {   // 파장(nm) → 투과율(%)  (개념 곡선)
      const pts = []; for (let n = 380; n <= 700; n += 4) {
        const t = k === 'coat' ? 93 - 31 * Math.exp(-Math.pow((n - 432) / 24, 2)) : k === 'abs' ? 92 - 48 / (1 + Math.exp((n - 438) / 14)) : 93;
        pts.push([40 + (n - 380) / 320 * 540, 130 - t * 1.0]);
      }
      return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    };
    el.innerHTML = `<div class="dt__bar" id="${id}t"></div>
      <div class="bl-wrap"><svg viewBox="0 0 800 340" class="bl-svg" aria-hidden="true">
        <defs><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe3ff"/><stop offset="1" stop-color="#7fb0ff"/></linearGradient>
          <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b6bff" stop-opacity=".55"/><stop offset=".55" stop-color="#3fc1d8" stop-opacity=".32"/><stop offset="1" stop-color="#9b6bff" stop-opacity=".4"/></linearGradient>
          <radialGradient id="${id}g"><stop offset="0" stop-color="#8fb8ff" stop-opacity=".55"/><stop offset="1" stop-color="#8fb8ff" stop-opacity="0"/></radialGradient>
          <clipPath id="${id}k"><circle cx="400" cy="190" r="128"/></clipPath></defs>
        <rect width="800" height="340" fill="#161b26"/><circle cx="400" cy="170" r="300" fill="url(#${id}g)"/>
        <rect x="170" y="26" width="460" height="288" rx="14" fill="url(#${id}s)"/>
        <g fill="#fff" fill-opacity=".75"><rect x="200" y="52" width="180" height="14" rx="4"/><rect x="200" y="80" width="400" height="9" rx="4"/><rect x="200" y="100" width="360" height="9" rx="4"/><rect x="200" y="120" width="390" height="9" rx="4"/><rect x="200" y="258" width="400" height="9" rx="4"/><rect x="200" y="278" width="300" height="9" rx="4"/></g>
        <g id="${id}l"></g></svg>
        <svg viewBox="0 0 620 170" class="bl-spec" aria-hidden="true">
          <rect x="40" y="10" width="${(455 - 400) / 320 * 540}" height="120" transform="translate(${(400 - 380) / 320 * 540} 0)" fill="#4f6bff" fill-opacity=".14"/>
          <text x="${40 + (428 - 380) / 320 * 540}" y="24" font-size="11" font-weight="700" fill="#4f6bff" text-anchor="middle">유해 청색광 대역</text>
          <line x1="40" y1="130" x2="580" y2="130" stroke="#94a3b8"/><line x1="40" y1="30" x2="40" y2="130" stroke="#94a3b8"/>
          <path d="${spec('none')}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4"/>
          <path id="${id}p" fill="none" stroke="var(--accent,#2563eb)" stroke-width="3"/>
          <g font-size="11" fill="#64748b"><text x="40" y="148">380nm</text><text x="${40 + 120 / 320 * 540}" y="148" text-anchor="middle">500</text><text x="${40 + 220 / 320 * 540}" y="148" text-anchor="middle">600</text><text x="580" y="148" text-anchor="end">700nm</text><text x="34" y="36" text-anchor="end">100%</text><text x="34" y="132" text-anchor="end">0</text><text x="310" y="164" text-anchor="middle">빛의 파장 → 렌즈를 통과하는 비율</text></g></svg></div>
      <p class="sim-cap" id="${id}x"></p>`;
    const draw = () => {
      el.querySelector('#' + id + 't').innerHTML = seg(KINDS, st.k, 'bk');
      const L = el.querySelector('#' + id + 'l');
      L.innerHTML = `<circle cx="400" cy="190" r="128" fill="${st.k === 'abs' ? '#ffc43c' : 'none'}" fill-opacity="${st.k === 'abs' ? .2 : 0}"/>
        ${st.k === 'coat' ? `<circle cx="400" cy="190" r="128" fill="url(#${id}c)"/><path d="M318 138a110 110 0 0 1 90-62" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="7" stroke-linecap="round"/>` : ''}
        <circle cx="400" cy="190" r="128" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
        <text x="400" y="332" font-size="14" font-weight="700" fill="#cbd5e1" text-anchor="middle"></text>`;
      el.querySelector('#' + id + 'p').setAttribute('d', spec(st.k));
      el.querySelector('#' + id + 'x').innerHTML = CAP[st.k] + ' <small>점선은 일반 렌즈. 차단율과 색은 제품마다 달라 개념 이미지로만 봐 주세요.</small>';
    };
    const ac = new AbortController();
    el.addEventListener('click', e => { const b = e.target.closest('[data-bk]'); if (b) { st.k = b.dataset.bk; draw(); } }, {signal: ac.signal});
    draw();
    return {destroy() { ac.abort(); }};
  };

  /* ═════════ 양안 도수차(부등시): 좌우 이미지 크기 차이 ═════════
     안경 렌즈는 도수에 따라 상을 키우거나(+) 줄입니다(−). 좌우 차이가 크면 하나로 합치기 어려워요. */
  Sim.mountAniso = function (el, o = {}) {
    const id = 'an' + (++uid), st = {r: o.r ?? -4, l: o.l ?? -1}, GAIN = 2.5, PER_D = 0.015;
    const sign = (c, m, k) => {   // 시표 모양: 링 + E + 십자선 (중심 기준 m배)
      return `<g transform="translate(100 100) scale(${m.toFixed(4)})" fill="none" stroke="${c}" stroke-opacity="${k}" stroke-width="5">
        <circle r="62"/><path d="M-80 0H-62M62 0H80M0-80V-62M0 62V80" stroke-width="4"/>
        <text y="26" font-size="76" font-weight="800" text-anchor="middle" fill="${c}" fill-opacity="${k}" stroke="none">E</text></g>`;
    };
    const pane = (t, body) => `<figure class="an-p"><svg viewBox="0 0 200 200" aria-hidden="true"><rect width="200" height="200" rx="14" fill="#fff"/>${body}</svg><figcaption>${t}</figcaption></figure>`;
    el.innerHTML = `<div class="ex-ctl"><div class="sl"><label>오른쪽 눈 S <b class="num" id="${id}rv"></b></label><input type="range" min="-12" max="6" step="0.25" value="${st.r}" data-eye="r"></div>
      <div class="sl"><label>왼쪽 눈 S <b class="num" id="${id}lv"></b></label><input type="range" min="-12" max="6" step="0.25" value="${st.l}" data-eye="l"></div></div>
      <div class="an-row" id="${id}v"></div><div class="sum" id="${id}s"></div><p class="sim-cap" id="${id}c"></p>`;
    const draw = () => {
      const mR = 1 + PER_D * GAIN * st.r, mL = 1 + PER_D * GAIN * st.l, d = Math.abs(st.r - st.l), pct = d * PER_D * 100;
      el.querySelector('#' + id + 'rv').textContent = fmt(st.r); el.querySelector('#' + id + 'lv').textContent = fmt(st.l);
      el.querySelector('#' + id + 'v').innerHTML = pane('오른쪽 눈', sign('#d92d20', mR, 1)) + pane('왼쪽 눈', sign('#2563eb', mL, 1)) + pane('뇌에서 합쳐진 모습', sign('#d92d20', mR, .8) + sign('#2563eb', mL, .8));
      const lv = d < 1.5 ? ['chip chip--g', '적응 쉬움'] : d < 3 ? ['chip chip--w', '적응 필요'] : ['chip chip--r', '상담 필요'];
      el.querySelector('#' + id + 's').innerHTML = `좌우 도수 차이 <b class="num">${d.toFixed(2)} D</b> · 이미지 크기 차이 약 <b class="num">${pct.toFixed(1)}%</b> <span class="${lv[0]}">${lv[1]}</span>`;
      el.querySelector('#' + id + 'c').innerHTML = (d < 1.5 ? '차이가 작아 대부분 금방 적응해요.' : d < 3 ? '처음 쓰면 어지럽거나 눈이 피로할 수 있어, 적응 기간과 얇고 가벼운 설계를 안내해 주세요.' : '두 눈의 상이 어긋나 하나로 합치기 어려운 경우가 있어요. 렌즈 설계·두께와 콘택트렌즈 병용을 함께 상담해 주세요.') + ' <small>경험식(도수 1D당 약 1.5%) 기준 · 눈에 보이도록 실제보다 과장해 표시했고 개인차가 큽니다.</small>';
    };
    const ac = new AbortController();
    el.addEventListener('input', e => { const k = e.target.dataset.eye; if (k) { st[k] = +e.target.value; draw(); } }, {signal: ac.signal});
    draw();
    return {destroy() { ac.abort(); }};
  };
})(window.Sim);
