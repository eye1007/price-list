/* 아이젠트리 V4 · 어린이 근시 (블루프린트 HUD 스타일)
   1) mountConsult : 근시 진행 컨설팅(myo-consult) 이식 — 또래 평균 비교(KNHANES) → 18세 진행 예측 → 근시 억제 렌즈 효과
      알고리즘 · 평균 데이터 · 위험도 문구는 원본 그대로이고, 차트는 외부 라이브러리 없이 SVG로 그립니다.
   2) mountGrowth  : 영유아부터 성인까지 키와 안구가 자라며 근시가 진행되는 원리 (사람 그림 + 안구 단면, 개념도)
   3) mountControl : 근시 억제 렌즈 원리 (주변 초점을 망막 앞으로)
   통계 모델과 개념도라서 진단이 아니며 개인차가 있습니다. 색 약속: 청록 = 정상·억제, 코랄 = 근시 진행. */
(function (global) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fD = d => (d > 0.004 ? '+' : d < -0.004 ? '−' : '') + Math.abs(d).toFixed(2) + 'D';
  const C = {bg: '#f6f9ff', teal: '#00957b', coral: '#ef3340', amber: '#e08600', blue: '#1f4fe0', dim: '#3d5468', mute: '#7d93a8', ink: '#0b1f33'};
  let uid = 0;
  const bar = (fig, right) => `<div class="hd-bar"><span>${fig}</span><span class="hd-r">${right || ''}</span></div>`;

  const lerpTbl = (t, a) => { if (a <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (a <= t[i][0]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (a - x0) / (x1 - x0); } return t[t.length - 1][1]; };
  const HT = [[0, 50], [1, 75], [2, 87], [3, 96], [6, 115], [10, 138], [14, 162], [18, 172], [25, 172]];          // 평균 키(cm)
  const HH = [[0, 12], [1, 15.5], [3, 17.5], [6, 19], [10, 20.5], [14, 22], [18, 23], [25, 23]];                 // 머리 높이(cm)
  const heightOf = a => lerpTbl(HT, a);

  /* ───── 나이에 따라 비율이 변하는 사람 선화 (영유아는 머리가 크고 다리가 짧음) ─────
     x: 가운데, base: 발 위치, k: 1cm당 px */
  function person(age, {x = 0, base = 0, k = 1, col = C.teal, glasses = false, pack = true, cloth = '#bfe3ff', pants = '#6a7fa6'} = {}) {
    const H = heightOf(age), hh = lerpTbl(HH, age), u = clamp(age / 18, 0, 1);
    const hhP = hh * k, nP = hh * .2 * k, tlP = H * (.38 - .05 * u) * k, swP = H * (.32 - .06 * u) * k, hwP = swP * .8, lw = Math.max(2.8, hhP * .4);
    const top = base - H * k, shY = top + hhP + nP, hipY = shY + tlP, hcy = top + hhP / 2, rx = hhP * .4, ry = hhP / 2;
    const f = n => (+n).toFixed(1), s2 = 2.2;
    const SK = '#ffe0c2', INK = '#1c2b3d';
    const limb = (x1, y1, x2, y2, w, fl = C.bg) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="${f(w + s2)}" stroke-linecap="round"/><line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${fl}" stroke-width="${f(Math.max(.6, w - .4))}" stroke-linecap="round"/>`;
    let g = '';
    [-1, 1].forEach(d => { g += limb(x + d * hwP * .27, hipY - lw * .3, x + d * hwP * .33, base - lw * .55, lw * 1.1, pants); });                                  // 다리
    [-1, 1].forEach(d => { g += limb(x + d * swP * .5, shY + lw * .5, x + d * (swP * .5 + swP * .1), shY + tlP * .92, lw * .78, cloth); });                         // 팔
    g += `<path d="M${f(x - swP / 2)} ${f(shY + lw * .3)}Q${f(x - swP / 2)} ${f(shY)} ${f(x - swP / 2 + lw * .6)} ${f(shY)}H${f(x + swP / 2 - lw * .6)}Q${f(x + swP / 2)} ${f(shY)} ${f(x + swP / 2)} ${f(shY + lw * .3)}L${f(x + hwP / 2)} ${f(hipY)}H${f(x - hwP / 2)}Z" fill="${cloth}" stroke="${col}" stroke-width="${s2}" stroke-linejoin="round"/>`;   // 몸통
    if (pack && age >= 5 && age < 18) [-1, 1].forEach(d => { g += `<line x1="${f(x + d * swP * .27)}" y1="${f(shY + 1)}" x2="${f(x + d * swP * .3)}" y2="${f(hipY - tlP * .12)}" stroke="${C.amber}" stroke-width="${f(Math.max(1.4, lw * .3))}" stroke-linecap="round" opacity=".9"/>`; });   // 가방끈
    g += limb(x, top + hhP - 1, x, shY + 2, hhP * .28, SK);                                                                                                   // 목
    g += `<ellipse cx="${f(x)}" cy="${f(hcy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${SK}" stroke="${col}" stroke-width="${s2}"/>`;
    if (age < 2) g += `<path d="M${f(x - hhP * .1)} ${f(top + 1.5)}q${f(hhP * .1)} ${f(-hhP * .22)} ${f(hhP * .2)} 0" fill="none" stroke="#5b3a29" stroke-width="2.4" stroke-linecap="round"/>`;
    else g += `<path d="M${f(x - rx)} ${f(hcy - ry * .12)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x + rx)} ${f(hcy - ry * .12)}Q${f(x)} ${f(hcy - ry * .62)} ${f(x - rx)} ${f(hcy - ry * .12)}Z" fill="#5b3a29" stroke="#3d2619" stroke-width="1.2"/>`;
    const ex = hhP * .16, ey = hcy + hhP * .04, er = Math.max(1.1, hhP * .045);
    if (glasses) { const gr = hhP * .135; g += `<circle cx="${f(x - ex)}" cy="${f(ey)}" r="${f(gr)}" fill="rgba(255,255,255,.65)" stroke="${C.coral}" stroke-width="2"/><circle cx="${f(x + ex)}" cy="${f(ey)}" r="${f(gr)}" fill="rgba(255,255,255,.65)" stroke="${C.coral}" stroke-width="2"/><line x1="${f(x - ex + gr)}" y1="${f(ey)}" x2="${f(x + ex - gr)}" y2="${f(ey)}" stroke="${C.coral}" stroke-width="1.5"/>`; }
    g += `<circle cx="${f(x - ex)}" cy="${f(ey)}" r="${f(er)}" fill="${INK}"/><circle cx="${f(x + ex)}" cy="${f(ey)}" r="${f(er)}" fill="${INK}"/><path d="M${f(x - hhP * .08)} ${f(hcy + hhP * .24)}q${f(hhP * .08)} ${f(hhP * .07)} ${f(hhP * .16)} 0" fill="none" stroke="#c0504a" stroke-width="1.6" stroke-linecap="round"/>`;
    return g;
  }

  /* ───── 안구 단면 (가로 단면, 빛은 왼쪽에서 들어옴) ─────
     공막·맥락막·망막 3겹 / 각막 · 전방 · 홍채(동공) · 수정체 · 섬모체와 진대 · 유리체 / 황반(중심와) · 시신경 유두와 망막 혈관
     x0: 각막 맨 앞, L: 안구 길이(px), ry: 세로 반지름. labels: 해부 이름표 */
  function eyeModel({x0, cy, L, ry, col = C.dim, ret = C.blue, labels = false}) {
    const f = n => (+n).toFixed(1), rx = L / 2, cx = x0 + rx, FP = '#a8561a';
    const wall = (y, r = 0) => cx - (rx - r) * Math.sqrt(Math.max(0, 1 - Math.pow(y / (ry - r), 2)));   // 높이 y에서 앞쪽 벽의 x
    const P = (th, r = 0) => [cx + (rx - r) * Math.cos(th), cy + (ry - r) * Math.sin(th)];
    const arc = (a, b, r, sw) => { const p = P(a, r), q = P(b, r); return `M${f(p[0])} ${f(p[1])}A${f(rx - r)} ${f(ry - r)} 0 0 ${b > a ? 1 : 0} ${f(q[0])} ${f(q[1])}`; };
    const xl = x0 + .2 * L, xi = x0 + .15 * L;
    let g = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="rgba(31,79,224,.16)" stroke="${col}" stroke-width="3.8"/>
      <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - 4)}" ry="${f(ry - 4)}" fill="none" stroke="${FP}" stroke-width="3" opacity=".75"/>`;                                   // 공막 · 맥락막
    g += `<path d="${arc(-1.3, 1.3, 8)}" fill="none" stroke="${ret}" stroke-width="5.5" stroke-linecap="round"/>`;                                                                   // 망막
    const thd = .32, pd = P(thd), nx = Math.cos(thd) / rx, ny = Math.sin(thd) / ry, nl = Math.hypot(nx, ny), ux = nx / nl, uy = ny / nl;             // 시신경 유두 + 시신경
    [[-1.05, 0, 13, 1.3, .55], [1.2, 1, 13, 1.3, .55], [-.62, 0, 18, 1, .45], [.85, 1, 18, 1, .45]].forEach(([b, , r, w, o]) => { const a = thd, p = P(a, r), q = P(b, r); g += `<path d="M${f(p[0])} ${f(p[1])}A${f(rx - r)} ${f(ry - r)} 0 0 ${b > a ? 1 : 0} ${f(q[0])} ${f(q[1])}" fill="none" stroke="#e0392f" stroke-width="${w + .4}" opacity="${o + .3}" stroke-linecap="round"/>`; });   // 망막 혈관
    g += `<polygon points="${f(pd[0] - uy * 6)},${f(pd[1] + ux * 6)} ${f(pd[0] + uy * 6)},${f(pd[1] - ux * 6)} ${f(pd[0] + uy * 6 + ux * 24)},${f(pd[1] - ux * 6 + uy * 24)} ${f(pd[0] - uy * 6 + ux * 24)},${f(pd[1] + ux * 6 + uy * 24)}" fill="#efe7d3" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${f(P(thd, 8)[0])}" cy="${f(P(thd, 8)[1])}" r="3.4" fill="#f2c14e" stroke="#b98a1b" stroke-width=".8"/>`;
    g += `<path d="${arc(-.11, .11, 8)}" fill="none" stroke="#e0b030" stroke-width="7" stroke-linecap="round" opacity=".75"/><circle cx="${f(P(0, 5)[0])}" cy="${f(cy)}" r="1.8" fill="${C.bg}"/>`;   // 황반 · 중심와
    [-1, 1].forEach(s => {                                                                                                                       // 섬모체 · 진대
      const yc = s * .76 * ry, xc = wall(yc, 4);
      g += `<ellipse cx="${f(xc + .028 * L)}" cy="${f(cy + yc - s * .06 * ry)}" rx="${f(.032 * L)}" ry="${f(.07 * ry)}" fill="#f2b45e" stroke="#8a4b12" stroke-width="1.2"/>`;
      for (let i = -1; i <= 1; i++) g += `<line x1="${f(xc + .04 * L)}" y1="${f(cy + yc - s * .1 * ry + i * 4)}" x2="${f(xl + i * 2)}" y2="${f(cy + s * (.33 + i * .04) * ry)}" stroke="${C.dim}" stroke-width=".9" opacity=".7"/>`;
      const ya = s * .68 * ry, yb = s * .21 * ry;                                                                                                  // 홍채
      g += `<path d="M${f(xi - .009 * L)} ${f(cy + ya)}L${f(xi + .009 * L)} ${f(cy + ya)}L${f(xi + .004 * L)} ${f(cy + yb)}L${f(xi - .004 * L)} ${f(cy + yb)}Z" fill="#8b5a2b" stroke="#3f2610" stroke-width="1.1"/>`;
    });
    const yc0 = .42 * ry, xa = wall(yc0), k1 = x0 - .15 * L, k2 = x0 - .06 * L;                                                                  // 각막
    g += `<path d="M${f(xa)} ${f(cy - yc0)}Q${f(k1)} ${f(cy)} ${f(xa)} ${f(cy + yc0)}L${f(xa + .022 * L)} ${f(cy + yc0)}Q${f(k2 + .0 * L)} ${f(cy)} ${f(xa + .022 * L)} ${f(cy - yc0)}Z" fill="rgba(31,79,224,.42)" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
    g += `<ellipse cx="${f(xl)}" cy="${f(cy)}" rx="${f(.05 * L)}" ry="${f(.34 * ry)}" fill="rgba(31,79,224,.5)" stroke="#1d3fa8" stroke-width="2.4"/>` +                       // 수정체
      [[.032, .26], [.016, .17]].map(([a, b]) => `<ellipse cx="${f(xl)}" cy="${f(cy)}" rx="${f(a * L)}" ry="${f(b * ry)}" fill="none" stroke="${ret}" stroke-width="1" opacity=".4"/>`).join('');
    if (labels) {
      const lbl = (x, y, tx, ty, t, a = 'middle') => `<line x1="${f(x)}" y1="${f(y)}" x2="${f(tx)}" y2="${f(ty + (ty < y ? 3 : -9))}" stroke="${C.ink}" stroke-width="1" opacity=".6"/><text x="${f(tx)}" y="${f(ty)}" font-size="12" font-weight="850" fill="${C.ink}" text-anchor="${a}">${t}</text>`;
      g += lbl(x0 - .04 * L, cy - .3 * ry, x0 - .04 * L, cy - ry - 10, '각막') + lbl(xi, cy - .45 * ry, xi + 12, cy - ry - 10, '홍채') + lbl(xl, cy + .34 * ry, xl, cy + ry + 18, '수정체')
        + lbl(pd[0] + ux * 24, pd[1] + uy * 24, pd[0] + ux * 24, pd[1] + uy * 24 + 16, '시신경')
        + `<text x="${f(cx + .12 * rx)}" y="${f(cy - .5 * ry)}" font-size="12" font-weight="850" fill="${C.dim}" text-anchor="middle">유리체</text>`;
    }
    return g;
  }

  /* ═════════ 1. 근시 진행 상담 ═════════ */
  const AVG = {4: .27, 5: .27, 6: -.50, 7: -.50, 8: -.97, 9: -1.45, 10: -1.68, 11: -1.91, 12: -2.15, 13: -2.31, 14: -2.47, 15: -2.63, 16: -2.72, 17: -2.81, 18: -2.90};   // KNHANES 나이별 평균 굴절도수
  const RISK = [[-.5, '경도', C.blue], [-3, '중등도', C.amber], [-6, '고도', C.coral], [-9, '초고도', '#9333ea']];
  const GENDER = [['여아', 0], ['남아', .014]], PARENTS = [['없음', 0], ['1명', .18], ['2명', .48]];
  const avgOf = a => AVG[clamp(Math.round(a), 4, 18)];

  function predict(st) {                       // 원본 calculatePrediction 그대로
    const o = {ages: [], mean: [], lo: [], up: [], cMean: [], cLo: [], cUp: []};
    let se = st.se, cse = st.se;
    for (let age = st.age; age <= 18; age++) {
      const t = age - st.age, spread = .48 * Math.sqrt(t), cs = spread * .5;
      o.ages.push(age); o.mean.push(se); o.cMean.push(cse);
      o.lo.push(se - spread); o.up.push(se + spread); o.cLo.push(cse - cs); o.cUp.push(cse + cs);
      let d = (-1.119 - .702 + st.gender + (.107 * age) - (.002 * age * age) + (.036 * age) + (.042 * se)) * .84;
      d -= st.parents * .05; if (age >= 16) d *= .5;
      se += d; cse += d * .41;
    }
    return o;
  }

  function risk(diff) {                        // 원본 위험도 문구
    if (diff <= -1.0) return {cls: 'red', lv: '상위 10% (고위험군)', desc: '또래 대비 근시 진행이 <b>매우 빠릅니다</b>. 고도근시 진입 확률이 아주 높으므로 즉각적이고 적극적인 억제 관리가 필요합니다.'};
    if (diff <= -0.5) return {cls: 'orange', lv: '빠른 편 (주의)', desc: '평균보다 근시가 <b>조금 빠르게</b> 나타나고 있습니다. 지금부터 올바른 습관과 시력 교정을 병행하면 늦출 수 있습니다.'};
    if (diff <= 0.5) return {cls: 'green', lv: '대한민국 평균 수준', desc: '한국 아이들의 <b>표준 속도</b>와 비슷합니다. 다만 동아시아는 근시 유병률이 높으므로 꾸준한 정기 검진을 권장합니다.'};
    return {cls: 'blue', lv: '하위 10% (저위험군)', desc: '평균에 비해 <b>시력이 아주 잘 유지</b>되고 있습니다. 현재의 좋은 생활 습관을 이어나가시기 바랍니다.'};
  }

  /* 간단한 SVG 꺾은선 차트 (세로축: 위가 +, 아래가 −). 도수가 나빠질수록 선이 아래로 내려감 */
  function chart({W = 640, H = 320, x0, x1, yMin, yMax, series = [], bands = [], marks = [], vline = null}) {
    const L = 50, R = 14, T = 16, B = 32, X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (yMax - v) / (yMax - yMin) * (H - T - B);
    const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
    let g = '';
    for (let v = Math.ceil(yMin / 2) * 2; v <= yMax; v += 2) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(0,149,123,.16)"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${C.dim}" text-anchor="end">${v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0'}</text>`;
    for (let a = x0; a <= x1; a++) if ((x1 - x0 <= 8) || a % 2 === x0 % 2) g += `<text x="${X(a).toFixed(1)}" y="${H - 10}" font-size="11" font-weight="700" fill="${C.dim}" text-anchor="middle">${a}세</text>`;
    RISK.forEach(([v, n, c]) => { if (v > yMin && v < yMax) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${c}" stroke-opacity=".5" stroke-dasharray="5 4"/><text x="${W - R - 4}" y="${(Y(v) - 4).toFixed(1)}" font-size="10" font-weight="800" fill="${c}" text-anchor="end">${n} ${v.toFixed(1).replace('-', '−')}D</text>`; });
    bands.forEach(b => { g += `<path d="${path(b.up)}L${path(b.low.slice().reverse()).slice(1)}Z" fill="${b.color}" fill-opacity=".24"/>`; });
    series.forEach(s => { g += `<path d="${path(s.pts)}" fill="none" stroke="${s.color}" stroke-width="${s.w || 3.5}" stroke-linecap="round" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="7 5"' : ''}/>`; if (s.dots) s.pts.forEach(p => { g += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3.6" fill="${s.color}"/>`; }); });
    if (vline != null) g += `<line x1="${X(vline).toFixed(1)}" x2="${X(vline).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${C.teal}" stroke-dasharray="3 4" stroke-opacity=".6"/>`;
    marks.forEach(m => { g += `<circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.y).toFixed(1)}" r="13" fill="${m.color}" fill-opacity=".18"/><circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.y).toFixed(1)}" r="7" fill="${m.color}" stroke="${C.bg}" stroke-width="3"/>`; if (m.label) g += `<text x="${X(m.x).toFixed(1)}" y="${(Y(m.y) - 18).toFixed(1)}" font-size="12" font-weight="850" fill="${m.color}" text-anchor="middle">${m.label}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" class="cs-svg" aria-hidden="true">${g}</svg>`;
  }

  function mountConsult(el) {
    const id = 'cs' + (++uid), ac = new AbortController();
    let pw = null;                                                    // 고객 도수가 입력돼 있으면 시작값으로 사용 (양안 평균 등가구면도수)
    try { if (typeof S !== 'undefined' && S.power && S.power.set) pw = Math.round(((S.power.rs + S.power.rc / 2) + (S.power.ls + S.power.lc / 2)) / 2 * 4) / 4; } catch (e) {}
    const st = {age: 8, gender: 0, parents: 0, se: pw === null ? -1.5 : clamp(pw, -10, 2), step: 'avg', ctl: false};
    const seg = (items, cur, key) => `<div class="seg">${items.map(([n, v]) => `<button type="button" class="${v === cur ? 'is-on' : ''}" data-${key}="${v}">${n}</button>`).join('')}</div>`;
    const step = (label, val, dn, up) => `<div class="cs-st"><button type="button" data-act="${dn}" aria-label="${label} 줄이기">−</button><b class="num">${val}</b><button type="button" data-act="${up}" aria-label="${label} 늘리기">+</button></div>`;
    el.innerHTML = `<div class="cs hud" id="${id}">${bar('FIG. 01 — CONSULT', '<b class="hd-n">KNHANES</b> · 또래 비교 · 18세 예측')}<div class="cs-in"></div><div class="cs-res"></div>
      <p class="mini-cap">※ 국민건강영양조사(KNHANES) 표준 데이터와 연구 논문(Naduvilath 2024, Tahhan 2025) 기반의 통계 모델입니다. 개인별 결과는 다르며 진단이 아닙니다. 억제 렌즈 효과는 모델 가정(진행 속도 약 41%)에 따른 값입니다.</p></div>`;
    const box = el.querySelector('.cs'), inEl = box.querySelector('.cs-in'), res = box.querySelector('.cs-res');

    function kid() {                                                   // 지금 입력한 나이의 아이 모습 (근시면 안경)
      const k = .36, base = 74;
      return `<div class="cs-kid"><svg viewBox="0 0 64 78" aria-hidden="true"><line x1="6" x2="58" y1="${base + 1}" y2="${base + 1}" stroke="${C.mute}"/>${person(st.age, {x: 32, base, k, glasses: st.se <= -.5})}</svg><span><b class="num">${st.age}세</b>키 ${Math.round(heightOf(st.age))}cm</span></div>`;
    }
    function inputs() {
      inEl.innerHTML = `<div class="cs-f"><label>나이</label>${step('나이', st.age + '세', 'age-', 'age+')}</div>
        <div class="cs-f"><label>성별</label>${seg(GENDER, st.gender, 'g')}</div>
        <div class="cs-f"><label>부모 근시</label>${seg(PARENTS, st.parents, 'p')}</div>
        <div class="cs-f"><label>현재 도수 (구면등가)${pw !== null ? ' <em>고객 도수 반영</em>' : ''}</label>${step('도수', fD(st.se), 'se-', 'se+')}</div>
        <div class="cs-f"><label>보기</label>${seg([['① 또래 평균 비교', 'avg'], ['② 18세까지 진행 예측', 'pred']], st.step, 'step')}</div>${kid()}`;
    }
    function stepAvg() {
      const avg = avgOf(st.age), diff = st.se - avg, rk = risk(diff);
      const ages = Object.keys(AVG).map(Number), yMin = Math.floor(Math.min(...ages.map(a => AVG[a]), st.se, -9)) - 1;
      const svg = chart({H: 225, x0: 4, x1: 18, yMin, yMax: 2, series: [{pts: ages.map(a => [a, AVG[a]]), color: '#4b5f70', dash: true, w: 3}], marks: [{x: clamp(st.age, 4, 18), y: st.se, color: C.amber, label: '우리 아이 ' + fD(st.se)}]});
      res.innerHTML = `<div class="cs-chart"><h5>또래 아이들 평균 시력 비교 <small>점선 = 한국 평균</small></h5>${svg}</div>
        <div class="cs-side"><div class="cs-risk cs-risk--${rk.cls}"><h5>현재 위험도 진단</h5>
          <div class="cs-vs"><div><small>${st.age}세 평균</small><b>${fD(avg)}</b></div><i>VS</i><div><small>우리 아이</small><b class="me">${fD(st.se)}</b></div></div>
          <p class="cs-diff">${diff < 0 ? `평균 대비 <b class="bad">${Math.abs(diff).toFixed(2)}D</b> 더 근시가 진행된 상태입니다.` : `평균 대비 <b class="ok">+${Math.abs(diff).toFixed(2)}D</b> 양호한 상태입니다.`}</p>
          <div class="cs-lv"><b>${rk.lv}</b><span>${rk.desc}</span></div></div>
          <ul class="cs-sol">${st.age <= 9 ? '<li class="gold">⏳ 만 9세 이전은 <b>시력 관리 골든타임</b>입니다.</li>' : ''}<li>📱 디지털 기기 사용으로 <b>근시 진행이 1.5배 가속</b>되고 있습니다.</li><li>🏥 <b>6개월 정기 검진</b>과 적극적인 억제 관리를 권장합니다.</li></ul>
          <button type="button" class="btn btn--accent cs-go" data-step="pred">② 미래 시력 예측 보기</button></div>`;
    }
    function stepPred() {
      const p = predict(st), n = p.ages.length, last = n - 1, ctl = st.ctl;
      const pts = a => p.ages.map((x, i) => [x, a[i]]), svg = chart({
        H: 225, x0: st.age, x1: Math.max(18, st.age + 1), yMin: Math.floor(Math.min(...p.lo, ...(ctl ? p.cLo : []), st.se)) - 1, yMax: Math.max(1, Math.ceil(Math.max(...p.up, ...p.cUp))),
        bands: [{up: pts(p.up), low: pts(p.lo), color: C.coral}].concat(ctl ? [{up: pts(p.cUp), low: pts(p.cLo), color: C.teal}] : []),
        series: [{pts: pts(p.mean), color: C.coral, dots: true}].concat(ctl ? [{pts: pts(p.cMean), color: C.teal, dots: true}] : [])
      });
      const fin = p.mean[last], finC = p.cMean[last], prog = fin - st.se, progC = finC - st.se, diff = Math.abs(prog - progC), pct = Math.abs(prog) > 0 ? Math.round(diff / Math.abs(prog) * 100) : 0;
      res.innerHTML = `<div class="cs-chart"><h5>18세 기준 근시 진행 예측 <small>${ctl ? '코랄 = 일반 렌즈 · 청록 = 억제 렌즈' : '코랄 = 일반 렌즈 (옅은 띠 = 예상 오차)'}</small></h5>${n < 2 ? '<div class="sim-note">18세는 예측할 기간이 없어요. 나이를 낮춰 보세요.</div>' : svg}</div>
        <div class="cs-side"><div class="cs-sum"><small>18세 예상 도수 (일반 렌즈)</small><b class="bad">${fD(fin)}</b><em>예상 오차 ${fD(p.up[last])} ~ ${fD(p.lo[last])}</em></div>
          <button type="button" class="cs-tog ${ctl ? 'is-on' : ''}" data-act="ctl">${ctl ? '일반 진행 그래프만 보기' : '근시 억제 렌즈 사용 시 변화 보기'}</button>
          ${ctl ? `<div class="cs-sum cs-sum--g"><small>억제 렌즈 착용 시 예상 도수</small><b class="ok">${fD(finC)}</b><p>도수 <b>+${diff.toFixed(2)}D</b> 세이브 (<b>${pct}%</b> 억제)</p></div>` : ''}
          <button type="button" class="btn btn--line cs-go" data-step="avg">← 또래 비교로</button></div>`;
    }
    function render() { inputs(); (st.step === 'avg' ? stepAvg : stepPred)(); }
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !box.contains(b)) return;
      const d = b.dataset;
      if (d.act === 'age-') st.age = clamp(st.age - 1, 4, 18); else if (d.act === 'age+') st.age = clamp(st.age + 1, 4, 18);
      else if (d.act === 'se-') st.se = clamp(Math.round((st.se - .25) * 4) / 4, -10, 2); else if (d.act === 'se+') st.se = clamp(Math.round((st.se + .25) * 4) / 4, -10, 2);
      else if (d.act === 'ctl') st.ctl = !st.ctl;
      else if (d.g !== undefined) st.gender = +d.g; else if (d.p !== undefined) st.parents = +d.p; else if (d.step) st.step = d.step; else return;
      render();
    }, {signal: ac.signal});
    render();
    return {destroy() { ac.abort(); }};
  }

  /* ═════════ 2. 영유아 ~ 성인: 근시가 진행되는 원리 ═════════
     안구 길이(AL)와 눈의 초점 거리(Fopt)가 맞으면 정시. 정상 성장은 눈이 자라는 만큼 초점도 같이 맞춰지고(정시화),
     근시형은 안구만 계속 길어져 초점이 망막 앞에 맺힘. 값은 대표적인 성장 곡선을 단순화한 개념값. */
  const AL_N = [[0, 16.8], [1, 20.3], [2, 21.4], [3, 21.9], [6, 22.5], [10, 23.0], [14, 23.3], [18, 23.5], [25, 23.6]];   // 정상 안구 길이(mm)
  const HYP = [[0, .9], [1, .7], [3, .45], [6, .2], [10, .04], [25, 0]];                                             // 유아기 생리적 원시(초점이 망막보다 먼 정도, mm)
  const EXTRA = [[0, 0], [5, 0], [6, .15], [8, .5], [10, .9], [12, 1.2], [14, 1.45], [16, 1.6], [18, 1.7], [25, 1.8]];  // 근시형 추가 신장(mm)
  const alN = a => lerpTbl(AL_N, a), foc = a => alN(a) + lerpTbl(HYP, a), alM = a => alN(a) + lerpTbl(EXTRA, a);
  const SLOTS = [['영유아', '0–2세', 1], ['유아', '3–6세', 4.5], ['학령기', '7–12세', 9], ['청소년', '13–18세', 15], ['성인', '19세~', 22]];
  const STAGES = [[2.99, '영유아', '안구가 아직 짧아 초점이 망막 <b>뒤</b>에 맺히는 <b>생리적 원시</b> 상태예요. 이 시기에 키도 눈도 아주 빠르게 자랍니다.'],
    [6.99, '유아', '눈이 자라는 동안 눈 속 수정체도 얇아지며 초점이 같이 이동해, 원시가 점점 줄어드는 <b>정시화</b>가 일어나요.'],
    [12.99, '학령기', '정상 눈은 초점과 망막이 맞게 자라 정시를 유지해요. <b>근시형</b>은 안구만 계속 길어져 초점이 망막 <b>앞</b>에 맺히기 시작해요. 근시 진행이 가장 빠른 시기예요.'],
    [18.99, '청소년', '근시형은 안구 길이가 계속 늘어 도수가 올라가요. 한 번 길어진 안구는 <b>줄어들지 않아</b> 도수를 되돌릴 수 없어요.'],
    [99, '성인', '성장이 멈추며 안구 길이와 도수가 거의 안정돼요. 그래서 성장기에 진행을 늦추는 것이 중요해요.']];
  const stageIdx = a => STAGES.findIndex(s => a <= s[0]);

  const CLOTH = ['#ffd166', '#ff9f8f', '#7cc4ff', '#7fd8a6', '#b9a8f5'];                   // 시기별 옷 색
  const SCENE = `<svg viewBox="0 0 160 76" preserveAspectRatio="xMidYMid slice"><rect width="160" height="76" fill="#9fd3ff"/><circle cx="130" cy="17" r="10" fill="#ffc83d"/><path d="M0 52Q40 34 80 50T160 46V76H0Z" fill="#46b86a"/><rect x="30" y="34" width="34" height="26" fill="#fff3d6" stroke="#8a5a2b" stroke-width="2"/><path d="M26 35L47 17L68 35Z" fill="#ef3340"/><rect x="42" y="45" width="10" height="15" fill="#8a5a2b"/><rect x="100" y="38" width="6" height="22" fill="#8a5a2b"/><circle cx="103" cy="32" r="14" fill="#1f9d55"/><circle cx="116" cy="40" r="9" fill="#2fbf71"/></svg>`;
  const stateOf = d => Math.abs(d) < .5 ? ['정시', 'ok'] : d > 0 ? ['원시', 'hy'] : ['근시', 'my'];

  function mountGrowth(el) {
    const id = 'gr' + (++uid), ac = new AbortController(), SC = 11, X0 = 90, CY = 150, G = 2.4;       // G: 그림에서 초점·길이 차이를 눈에 띄게 키우는 배율 (수치는 실제값)
    const st = {age: 3, play: 0};
    el.innerHTML = `<div class="gr hud" id="${id}">${bar('FIG. 02 — GROWTH', '<span class="hd-lg"><i class="t"></i>정상 성장<i class="c"></i>근시형 성장 (안경)</span><b class="hd-n gr-cnt"></b>')}
      <svg viewBox="0 0 400 276" class="gr-ppl" aria-label="영유아부터 성인까지 키 변화"></svg>
      <svg viewBox="0 0 560 300" class="gr-eye" aria-hidden="true"></svg>
      <div class="gr-side"><div class="gr-nums"></div><div class="gr-gauge"></div><div class="gr-vis"></div></div>
      <div class="gr-ctl"><button type="button" class="btn btn--line gr-play" data-act="play">▶ 자라는 모습 보기</button>
        <div class="sl"><input type="range" min="0" max="25" step="0.5" value="${st.age}" aria-label="나이"></div><span class="chip gr-stage"></span></div>
      <p class="sim-cap gr-cap"></p></div>`;
    const box = el.querySelector('.gr'), ppl = box.querySelector('.gr-ppl'), eye = box.querySelector('.gr-eye'), gauge = box.querySelector('.gr-gauge'), vis = box.querySelector('.gr-vis'), nums = box.querySelector('.gr-nums'), cap = box.querySelector('.gr-cap'), rng = box.querySelector('input'), play = box.querySelector('.gr-play');
    function draw() {
      const a = st.age, ln = alN(a), lm = alM(a), f = foc(a), si = stageIdx(a), cm = Math.round(heightOf(a));
      const dN = (f - ln) * 2.7, dM = (f - lm) * 2.7;                                                    // 안구 1mm ≈ 2.7D 근사 (실제 수치)
      const rN = X0 + ln * SC, rMv = rN + (lm - ln) * SC * G, fx = rN + (f - ln) * SC * G, ry = n => n * SC * .44, ryM = ry(ln) * 1.04;
      /* 사람: 5개 시기를 같은 눈금으로 나란히 — 지금 시기만 현재 나이로 자라고 밝게 표시 */
      const XS = [48, 122, 196, 276, 352], BASE = 236, K = 1.2;
      ppl.innerHTML = `<line x1="8" x2="392" y1="${BASE + 1}" y2="${BASE + 1}" stroke="#16324f" stroke-width="2"/>` + SLOTS.map((s, i) => {
        const on = i === si, ag = on ? a : s[2], top = BASE - heightOf(ag) * K;
        return `<g class="pp ${on ? 'is-on' : ''}" data-age="${s[2]}" role="button" tabindex="0" aria-label="${s[0]} ${s[1]}"><rect x="${XS[i] - 36}" y="4" width="72" height="268" fill="transparent"/>
          ${person(ag, {x: XS[i], base: BASE, k: K, col: on ? C.teal : '#5d7694', cloth: CLOTH[i], glasses: (foc(ag) - alM(ag)) * 2.7 < -.75})}
          ${on ? `<line x1="${XS[i] - 30}" x2="${XS[i] + 30}" y1="${top.toFixed(1)}" y2="${top.toFixed(1)}" stroke="${C.teal}" stroke-dasharray="3 3"/><text x="${XS[i]}" y="${(top - 6).toFixed(1)}" font-size="14" font-weight="900" fill="${C.teal}" text-anchor="middle">${cm}cm</text>` : ''}
          <text x="${XS[i]}" y="${BASE + 17}" font-size="12.5" font-weight="900" fill="${on ? C.ink : C.dim}" text-anchor="middle">${s[0]}</text><text x="${XS[i]}" y="${BASE + 30}" font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="middle">${s[1]}</text></g>`;
      }).join('');
      /* 안구 단면 — 근시형은 눈이 뒤로 길어지고, 영유아는 초점이 망막 뒤에 맺힘 (그림은 차이를 키워서 표현) */
      const LXp = X0 + .2 * ln * SC, exR = rMv - 8;
      const ray = (y, ghost) => { const y1 = CY + (y - CY) * .9, y2 = CY + (y - CY) * .7, m = (CY - y2) / (fx - LXp), head = `M14 ${y}H${(X0 - 8).toFixed(1)}L${X0} ${y1.toFixed(1)}L${LXp.toFixed(1)} ${y2.toFixed(1)}`;
        const body = fx <= exR ? `L${fx.toFixed(1)} ${CY}L${exR.toFixed(1)} ${(CY + m * (exR - fx)).toFixed(1)}` : `L${exR.toFixed(1)} ${(y2 + m * (exR - LXp)).toFixed(1)}`;
        return `<path d="${head}${body}" fill="none" stroke="${C.amber}" stroke-width="2.2" stroke-linejoin="round"/>` + (fx > exR ? `<path d="M${exR.toFixed(1)} ${(y2 + m * (exR - LXp)).toFixed(1)}L${fx.toFixed(1)} ${CY}" fill="none" stroke="${C.amber}" stroke-width="1.6" stroke-dasharray="3 4" opacity=".7"/>` : ''); };
      const myo = `<ellipse cx="${(X0 + (rMv - X0) / 2).toFixed(1)}" cy="${CY}" rx="${((rMv - X0) / 2).toFixed(1)}" ry="${ryM.toFixed(1)}" fill="rgba(239,51,64,.04)" stroke="${C.coral}" stroke-width="3" stroke-dasharray="8 5"/>`;
      const tP = (xr, n, ryy, th) => [X0 + (xr - X0) / 2 + ((xr - X0) / 2 - 8) * Math.cos(th), CY + (ryy - 8) * Math.sin(th)];
      const retM = (() => { const p = tP(rMv, 0, ryM, -1.3), q = tP(rMv, 0, ryM, 1.3); return `<path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}A${((rMv - X0) / 2 - 8).toFixed(1)} ${(ryM - 8).toFixed(1)} 0 0 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}" fill="none" stroke="${C.coral}" stroke-width="5.5" stroke-linecap="round"/>`; })();
      const blur = (x, d, col) => `<ellipse cx="${x.toFixed(1)}" cy="${CY}" rx="${clamp(Math.abs(d) * G * 1.1, 1.5, 14).toFixed(1)}" ry="${clamp(Math.abs(d) * G * 3, 2.5, 34).toFixed(1)}" fill="${col}" fill-opacity=".35" stroke="${col}" stroke-width="1.5"/>`;
      const pN = tP(rN, 0, ry(ln), -.95), pM = tP(rMv, 0, ryM, .95), lx = rMv + 34;
      eye.innerHTML = `${myo}${eyeModel({x0: X0, cy: CY, L: ln * SC, ry: ry(ln), col: C.teal, ret: C.teal, labels: true})}${retM}
        ${[CY - 20, CY, CY + 20].map(y => ray(y)).join('')}
        ${blur(rN - 8, f - ln, C.teal)}${blur(rMv - 8, f - lm, C.coral)}
        <circle cx="${fx.toFixed(1)}" cy="${CY}" r="13" fill="${C.amber}" fill-opacity=".3"/><circle cx="${fx.toFixed(1)}" cy="${CY}" r="6" fill="${C.amber}" stroke="#fff" stroke-width="2.5"/>
        <g font-size="12.5" font-weight="900" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round"><text x="${(fx - 14).toFixed(1)}" y="${CY - 14}" fill="${C.amber}" text-anchor="end">초점</text>
          <line x1="${pN[0].toFixed(1)}" y1="${pN[1].toFixed(1)}" x2="${(lx - 3).toFixed(1)}" y2="${(pN[1] - 4).toFixed(1)}" stroke="${C.teal}" stroke-width="1.2"/><text x="${lx.toFixed(1)}" y="${pN[1].toFixed(1)}" fill="${C.teal}">정상 망막</text>
          <line x1="${pM[0].toFixed(1)}" y1="${pM[1].toFixed(1)}" x2="${(lx - 3).toFixed(1)}" y2="${(pM[1] + 1).toFixed(1)}" stroke="${C.coral}" stroke-width="1.2"/><text x="${lx.toFixed(1)}" y="${(pM[1] + 5).toFixed(1)}" fill="${C.coral}">근시형 망막</text></g>`;
      /* 큰 숫자 · 원시→정시→근시 눈금 · 눈이 보는 세상 */
      const sN = stateOf(dN), sM = stateOf(dM), lab = (d, s) => `<i class="st st--${s[1]}">${s[0]} ${fD(Math.abs(d) < .05 ? 0 : d)}</i>`;
      nums.innerHTML = `<div class="gr-n"><b class="num">${a % 1 ? a.toFixed(1) : a}<small>세</small></b><span>나이 · ${SLOTS[si][0]}</span></div>
        <div class="gr-n"><b class="num">${cm}<small>cm</small></b><span>평균 키</span></div>
        <div class="gr-n gr-n--t"><b class="num">${ln.toFixed(1)}<small>mm</small></b><span>정상 안구 길이</span>${lab(dN, sN)}</div>
        <div class="gr-n gr-n--c"><b class="num">${lm.toFixed(1)}<small>mm</small></b><span>근시형 안구 길이</span>${lab(dM, sM)}</div>`;
      const pos = d => clamp((3 - d) / 9 * 100, 1.5, 98.5);
      gauge.innerHTML = `<div class="gg-t"><span>눈의 초점 상태</span><em>${fD(0).replace('0.00D', '0D')} 정시가 가장 좋은 상태</em></div><div class="gg-bar"><u class="gg-n" style="left:${pos(dN).toFixed(1)}%"><b>정상</b></u><u class="gg-m" style="left:${pos(dM).toFixed(1)}%"><b>근시형</b></u></div>
        <div class="gg-z"><span class="z-hy">원시 +3D</span><span class="z-ok">정시 0D</span><span class="z-my">근시 −6D</span></div>`;
      const bl = d => clamp(Math.abs(d) * 1.15, 0, 6.5).toFixed(1);
      vis.innerHTML = `<figure class="vv"><div class="vv-s"><div style="filter:blur(${bl(dN)}px)">${SCENE}</div></div><figcaption><b>정상 눈이 보는 세상</b>${sN[0] === '정시' ? '또렷해요' : sN[0] === '원시' ? '초점이 덜 맞아요' : '조금 흐려요'}</figcaption></figure>
        <figure class="vv vv--c"><div class="vv-s"><div style="filter:blur(${bl(dM)}px)">${SCENE}</div></div><figcaption><b>근시형 눈이 보는 세상</b>${sM[0] === '정시' ? '또렷해요' : sM[0] === '원시' ? '초점이 덜 맞아요' : '멀리가 흐려요'}</figcaption></figure>`;
      box.querySelector('.gr-cnt').textContent = 'AGE ' + String(Math.floor(a)).padStart(2, '0') + ' / 25';
      box.querySelector('.gr-stage').textContent = SLOTS[si][0] + ' · ' + SLOTS[si][1]; cap.innerHTML = STAGES[si][2] + ' <small>대표적인 성장 곡선을 단순화한 개념도예요. 그림은 차이를 이해하기 쉽게 키워서 그렸고, 숫자는 실제 값이에요.</small>';
    }
    let raf = 0;
    function stop() { cancelAnimationFrame(raf); st.play = 0; play.textContent = '▶ 자라는 모습 보기'; }
    function start() {
      if (st.age >= 25) st.age = 0;
      st.play = 1; play.textContent = '❚❚ 멈추기'; let last = performance.now();
      (function tick(now) { if (!st.play) return; st.age = Math.min(25, st.age + (now - last) / 1000 * 2.2); last = now; rng.value = st.age; draw(); if (st.age >= 25) return stop(); raf = requestAnimationFrame(tick); })(last);
    }
    play.addEventListener('click', () => st.play ? stop() : start(), {signal: ac.signal});
    rng.addEventListener('input', () => { stop(); st.age = +rng.value; draw(); }, {signal: ac.signal});
    const jump = e => { const g = e.target.closest('[data-age]'); if (!g || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return; stop(); st.age = +g.dataset.age; rng.value = st.age; draw(); };
    ppl.addEventListener('click', jump, {signal: ac.signal}); ppl.addEventListener('keydown', jump, {signal: ac.signal});
    draw();
    return {destroy() { stop(); ac.abort(); }};
  }
  /* ═════════ 3. 근시 억제 렌즈 원리 ═════════
     중심 초점은 망막에, 주변 초점은 일반 렌즈=망막 뒤 / 근시 억제 렌즈=망막 앞. 초점들을 이은 점선이 '초점 면' */
  function mountControl(el) {
    const p = 'ct' + (++uid) + '_', ac = new AbortController();
    const CX = 470, CY = 160, RX = 150, RY = 118, LX = 320 + .2 * 300, SX = 190, W = 800, H = 332;
    let t = 0, mode = 'normal', anim = 0;
    el.innerHTML = `<div class="ct hud">${bar('FIG. 03 — CONTROL', '<span class="hd-lg"><i class="t"></i>억제 렌즈<i class="c"></i>일반 렌즈</span>')}
      <svg viewBox="0 0 ${W} ${H}" class="ct-svg" aria-hidden="true"><defs>
        <radialGradient id="${p}t"><stop offset="0" stop-color="${C.teal}" stop-opacity=".75"/><stop offset="1" stop-color="${C.teal}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${p}c"><stop offset="0" stop-color="${C.coral}" stop-opacity=".75"/><stop offset="1" stop-color="${C.coral}" stop-opacity="0"/></radialGradient></defs><g class="ct-g"></g></svg>
      <div class="ct-side"><div class="seg" data-k="modes"><button type="button" data-m="normal" class="is-on">일반 안경 렌즈</button><button type="button" data-m="control">근시 억제 렌즈</button></div>
        <div class="ct-steps"></div><p class="sim-cap" data-k="msg"></p></div></div>`;
    const g = el.querySelector('.ct-g'), steps = el.querySelector('.ct-steps'), msg = el.querySelector('[data-k=msg]');
    const onRetina = a => [CX + (RX - 8) * Math.cos(a), CY + (RY - 8) * Math.sin(a)];
    const normalAt = a => { const nx = Math.cos(a) / (RX - 8), ny = Math.sin(a) / (RY - 8), l = Math.hypot(nx, ny); return [nx / l, ny / l]; };
    function face(ctl) {                                                // 정면에서 본 아이 얼굴 + 안경 (억제 렌즈는 주변부에 작은 렌즈렛)
      const fx = 736, fy = 236, lens = (dx) => {
        let dots = ''; if (ctl > .02) [[9, 8], [14, 12], [18, 16]].forEach(([rr, n], ring) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring * .3; dots += `<circle cx="${(dx + rr * Math.cos(a)).toFixed(1)}" cy="${(rr * Math.sin(a)).toFixed(1)}" r="1.5" fill="${C.teal}" opacity="${(.85 * ctl).toFixed(2)}"/>`; } });
        return `<circle cx="${dx}" cy="0" r="22" fill="rgba(31,79,224,.1)" stroke="${C.blue}" stroke-width="2.2"/>${dots}${ctl > .02 ? `<circle cx="${dx}" cy="0" r="6" fill="none" stroke="${C.teal}" stroke-width="1.4" stroke-dasharray="2 2" opacity="${ctl.toFixed(2)}"/>` : ''}`;
      };
      return `<g transform="translate(${fx} ${fy})"><ellipse rx="54" ry="62" fill="${C.bg}" stroke="${C.dim}" stroke-width="2"/>
        <path d="M-54 -14A54 62 0 0 1 54 -14Q0 -52 -54 -14Z" fill="${C.dim}" fill-opacity=".3" stroke="${C.dim}"/>
        ${lens(-27)}${lens(27)}<line x1="-5" y1="0" x2="5" y2="0" stroke="${C.blue}" stroke-width="2"/><circle cx="-27" cy="0" r="2.2" fill="${C.ink}" opacity=".0"/>
        <path d="M-14 36q14 10 28 0" fill="none" stroke="${C.dim}" stroke-width="2" stroke-linecap="round"/></g>
        <text x="${fx}" y="308" font-size="11.5" font-weight="800" text-anchor="middle" fill="${C.ink}">안경 정면</text>
        <text x="${fx}" y="322" font-size="10" font-weight="700" text-anchor="middle" fill="${C.dim}">${ctl > .5 ? '중심 선명 · 주변 초점 조절' : '전체가 같은 도수'}</text>`;
    }
    function draw() {
      const off = lerp(32, -32, t), colP = t > .5 ? C.teal : C.coral, fov = onRetina(0), A = .72;
      const fp = [-A, A].map(a => { const r = onRetina(a), n = normalAt(a); return [r[0] + n[0] * off, r[1] + n[1] * off, r]; });
      const ray = (pts, col, w = 1.8) => { const d = pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
        return `<polyline points="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity=".75" stroke-linejoin="round"/><polyline points="${d}" fill="none" stroke="#fff" stroke-width="${w}" class="ray-flow"/>`; };
      let s = '';
      s += eyeModel({x0: CX - RX, cy: CY, L: 2 * RX, ry: RY, col: '#16324f', ret: C.blue, labels: true});
      s += `<path d="M60,${CY - 18} L${SX},${CY - 18} L${LX},${CY - 14} L${fov[0]},${fov[1]} L${LX},${CY + 14} L${SX},${CY + 18} L60,${CY + 18} Z" fill="${C.blue}" opacity=".07"/>`;   // 중심 광선 → 황반
      [-18, 0, 18].forEach(h => { s += ray([[60, CY + h], [SX, CY + h], [LX, CY + h * .8], fov], C.blue); });
      fp.forEach(([x, y, r], i) => {                                    // 주변 광선 (위쪽 시야 → 아래 망막, 아래쪽 시야 → 위 망막)
        const sg = i ? -1 : 1, y0 = CY + sg * 92;
        [-10, 10].forEach(d => {
          const ly = CY + sg * 14 + d * .4, sy = CY + sg * 50 + d, ext = [x + (x - LX) * .12, y + (y - ly) * .12];
          s += ray([[SX - 90, y0 + d], [SX, sy], [LX, ly], [x, y]].concat(t > .5 ? [ext] : []), colP, 1.6);
        });
        s += `<line x1="${r[0]}" y1="${r[1]}" x2="${x}" y2="${y}" stroke="${colP}" stroke-width="2.4" stroke-dasharray="4 3"/><circle cx="${x}" cy="${y}" r="18" fill="url(#${p}${t > .5 ? 't' : 'c'})" class="pulse"/><circle cx="${x}" cy="${y}" r="7" fill="${colP}" stroke="#fff" stroke-width="2.5"/>`;
      });
      const [a1, a2] = fp, qx = 2 * fov[0] - (a1[0] + a2[0]) / 2, qy = 2 * fov[1] - (a1[1] + a2[1]) / 2;   // 초점 면 (주변 초점 – 황반 – 주변 초점)
      s += `<path d="M${a1[0]},${a1[1]} Q${qx},${qy} ${a2[0]},${a2[1]} L${a2[2][0]},${a2[2][1]} A${RX - 8} ${RY - 8} 0 0 0 ${a1[2][0]},${a1[2][1]} Z" fill="${colP}" fill-opacity=".26"/>
        <path d="M${a1[0]},${a1[1]} Q${qx},${qy} ${a2[0]},${a2[1]}" fill="none" stroke="${colP}" stroke-width="13" stroke-linecap="round" opacity=".2"/>
        <path d="M${a1[0]},${a1[1]} Q${qx},${qy} ${a2[0]},${a2[1]}" fill="none" stroke="${colP}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="${fov[0]}" cy="${fov[1]}" r="18" fill="url(#${p}t)" class="pulse"/><circle cx="${fov[0]}" cy="${fov[1]}" r="6.5" fill="#fff" stroke="${C.blue}" stroke-width="3"/>`;
      let bumps = ''; if (t > .02) for (let i = -5; i <= 5; i++) { if (Math.abs(i) < 2) continue; bumps += `<circle cx="${SX - 14}" cy="${CY + i * 15}" r="3.2" fill="${C.teal}" opacity="${t.toFixed(2)}"/>`; }
      s += `<path d="M${SX - 16},${CY - 92} C${SX - 6},${CY - 46} ${SX - 6},${CY + 46} ${SX - 16},${CY + 92} L${SX + 14},${CY + 92} C${SX + 2},${CY + 46} ${SX + 2},${CY - 46} ${SX + 14},${CY - 92} Z" fill="rgba(31,79,224,.14)" stroke="${C.blue}" stroke-width="2"/>${bumps}`;
      const grow = t < .5, tag = (x, y, txt, col, anchor = 'start') => `<text x="${x}" y="${y}" font-size="12.5" font-weight="800" fill="${col}" text-anchor="${anchor}" stroke="${C.bg}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${txt}</text>`;
      g.innerHTML = `${s}${tag(fov[0] - 18, fov[1] - 12, '중심 초점: 망막 위', C.blue, 'end')}
        ${tag(fp[0][0] - 14, fp[0][1] - 10, grow ? '주변 초점: 망막 뒤' : '주변 초점: 망막 앞', colP, 'end')}
        ${tag(fp[1][0] - 14, fp[1][1] + 24, grow ? '주변 초점: 망막 뒤' : '주변 초점: 망막 앞', colP, 'end')}
        ${tag(SX, CY + 116, t > .5 ? '근시 억제 렌즈' : '일반 렌즈', C.blue, 'middle')}
        <text x="${fov[0] - 20}" y="${fov[1] + 32}" font-size="14" font-weight="900" fill="${colP}" text-anchor="end" stroke="${C.bg}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">초점이 맺히는 선</text>
        <g transform="translate(20 18)"><rect width="${t > .5 ? 214 : 200}" height="28" rx="14" fill="${colP}" fill-opacity=".16" stroke="${colP}"/><text x="${t > .5 ? 107 : 100}" y="19" font-size="12.5" font-weight="850" fill="${colP}" text-anchor="middle">${t > .5 ? '근시 억제 렌즈 · 주변 초점 앞' : '일반 렌즈 · 주변 초점 뒤'}</text></g>${face(t)}`;
      const sig = lerp(100, 36, t);
      steps.innerHTML = `<div class="ct-st"><i>01</i><div><b>중심 시야</b><span>어떤 렌즈든 황반에 정확히 초점이 맺혀 선명하게 봐요.</span></div></div>
        <div class="ct-st is-hot ${t > .5 ? 'is-ok' : ''}"><i>02</i><div><b>주변 시야</b><span>${t > .5 ? '렌즈 주변부가 초점을 망막 <b>앞</b>으로 당겨요.' : '주변 초점이 망막 <b>뒤</b>에 맺히는 경향이 있어요.'}</span></div></div>
        <div class="ct-st ${t > .5 ? 'is-ok' : 'is-bad'}"><i>03</i><div><b>눈이 길어지려는 신호</b><div class="ct-gauge"><u style="width:${sig.toFixed(0)}%"></u></div><span>${t > .5 ? '줄어들도록 유도' : '계속 자극이 될 수 있음'}</span></div></div>`;
      msg.innerHTML = (t > .5 ? '효과는 개인차가 있으며 정기 검진과 함께 사용합니다.' : '주변 초점이 뒤에 맺히면 눈이 길어지는 자극이 된다는 가설이 있습니다.') + ' <small>개념 설명용 그림이며 게이지는 정성적 표현입니다.</small>';
    }
    const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    el.querySelector('[data-k=modes]').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.dataset.m === mode) return; mode = b.dataset.m;
      el.querySelectorAll('[data-k=modes] button').forEach(x => x.classList.toggle('is-on', x === b));
      const from = t, to = mode === 'control' ? 1 : 0, t0 = performance.now(); cancelAnimationFrame(anim);
      (function tick(now) { const k = clamp((now - t0) / 900, 0, 1); t = lerp(from, to, ease(k)); draw(); if (k < 1) anim = requestAnimationFrame(tick); })(t0);
    }, {signal: ac.signal});
    draw();
    return {destroy() { cancelAnimationFrame(anim); ac.abort(); }};
  }

  global.MyoTools = {mountConsult, mountGrowth, mountControl, person};
})(window);
