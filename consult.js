/* 아이젠트리 V5 · 어린이 근시 3종 + 피로감소 (레퍼런스 영상 스타일: 흰 바탕 · 휴대폰 화면 · 민트 · 짙은 청록 카드)
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
  const C = {bg: '#ffffff', teal: '#2bbf95', coral: '#ee8070', amber: '#f2b84b', blue: '#5b8def', dim: '#6b7684', mute: '#9aa6b2', ink: '#3b4856'};
  let uid = 0;
  const YEAR = new Date().getFullYear();

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

  /* 간단한 SVG 꺾은선 차트 (세로축: 위가 −, 아래가 +). 도수가 나빠질수록(더 −) 선이 위로 올라감 */
  function chart({W = 760, H = 340, x0, x1, yMin, yMax, series = [], bands = [], marks = [], vline = null}) {
    const L = 54, R = 16, T = 20, B = 36, X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (v - yMin) / (yMax - yMin) * (H - T - B);
    const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
    let g = '';
    for (let v = Math.ceil(yMin / 2) * 2; v <= yMax; v += 2) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(43,191,149,.22)"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" font-size="13" font-weight="700" fill="${C.dim}" text-anchor="end">${v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0'}</text>`;
    for (let a = x0; a <= x1; a++) if ((x1 - x0 <= 8) || a % 2 === x0 % 2) g += `<text x="${X(a).toFixed(1)}" y="${H - 10}" font-size="13" font-weight="700" fill="${C.dim}" text-anchor="middle">${a}세</text>`;
    RISK.forEach(([v, n, c]) => { if (v > yMin && v < yMax) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${c}" stroke-opacity=".5" stroke-dasharray="5 4"/><text x="${W - R - 4}" y="${(Y(v) - 4).toFixed(1)}" font-size="12" font-weight="800" fill="${c}" text-anchor="end">${n} ${v.toFixed(1).replace('-', '−')}D</text>`; });
    bands.forEach(b => { if (b.op !== undefined && b.op < .01) return; g += `<path d="${path(b.up)}L${path(b.low.slice().reverse()).slice(1)}Z" fill="${b.color}" fill-opacity="${(.24 * (b.op === undefined ? 1 : b.op)).toFixed(3)}"/>`; });
    series.forEach(s => { if (s.op !== undefined && s.op < .01) return; const o = s.op === undefined ? 1 : s.op; g += `<path d="${path(s.pts)}" fill="none" stroke="${s.color}" stroke-width="${s.w || 3.5}" stroke-linecap="round" stroke-linejoin="round" opacity="${o.toFixed(2)}" ${s.dash ? 'stroke-dasharray="7 5"' : ''}/>`; if (s.dots) s.pts.forEach(p => { g += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3.6" fill="${s.color}" opacity="${o.toFixed(2)}"/>`; }); });
    if (vline != null) g += `<line x1="${X(vline).toFixed(1)}" x2="${X(vline).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${C.teal}" stroke-dasharray="3 4" stroke-opacity=".6"/>`;
    marks.forEach(m => { g += `<circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.y).toFixed(1)}" r="13" fill="${m.color}" fill-opacity=".2"><animate attributeName="r" values="11;20;11" dur="1.9s" repeatCount="indefinite"/><animate attributeName="fill-opacity" values=".3;.04;.3" dur="1.9s" repeatCount="indefinite"/></circle><circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.y).toFixed(1)}" r="7" fill="${m.color}" stroke="${C.bg}" stroke-width="3"/>`; if (m.label) g += `<text x="${X(m.x).toFixed(1)}" y="${(Y(m.y) - 18).toFixed(1)}" font-size="15" font-weight="850" fill="${m.color}" text-anchor="middle">${m.label}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" class="cs-svg" aria-hidden="true">${g}</svg>`;
  }

  function mountConsult(el) {
    const id = 'cs' + (++uid), ac = new AbortController();
    let pw = null;                                                    // 고객 도수가 입력돼 있으면 시작값으로 사용 (양안 평균 등가구면도수)
    try { if (typeof S !== 'undefined' && S.power && S.power.set) pw = Math.round(((S.power.rs + S.power.rc / 2) + (S.power.ls + S.power.lc / 2)) / 2 * 4) / 4; } catch (e) {}
    const st = {age: 8, gender: 0, parents: 0, se: pw === null ? -1.5 : clamp(pw, -10, 2), step: 'avg', ctl: false};
    const seg = (items, cur, key) => `<div class="seg">${items.map(([n, v]) => `<button type="button" class="${v === cur ? 'is-on' : ''}" data-${key}="${v}">${n}</button>`).join('')}</div>`;
    const step = (label, val, dn, up, flip) => `<div class="cs-st"><button type="button" data-act="${flip ? up : dn}" aria-label="${label} ${flip ? '늘리기' : '줄이기'}">${flip ? '+' : '−'}</button><b class="num">${val}</b><button type="button" data-act="${flip ? dn : up}" aria-label="${label} ${flip ? '줄이기' : '늘리기'}">${flip ? '−' : '+'}</button></div>`;
    el.innerHTML = `<div class="cs" id="${id}"><div class="cs-top"><b>근시 진행 상담</b><span>국민건강영양조사(KNHANES) 통계 모델 · 또래 비교 · 18세 예측</span></div><div class="cs-in"></div><div class="cs-res"></div>
      <p class="mini-cap">※ 국민건강영양조사(KNHANES) 표준 데이터와 연구 논문(Naduvilath 2024, Tahhan 2025) 기반의 통계 모델입니다. 개인별 결과는 다르며 진단이 아닙니다. 억제 렌즈 효과는 모델 가정(진행 속도 약 41%)에 따른 값입니다.</p></div>`;
    const box = el.querySelector('.cs'), inEl = box.querySelector('.cs-in'), res = box.querySelector('.cs-res');

    function kid() {                                                   // 지금 입력한 나이의 아이 모습 (근시면 안경)
      const k = .36, base = 74;
      return `<div class="cs-kid"><svg viewBox="0 0 64 78" aria-hidden="true"><line x1="6" x2="58" y1="${base + 1}" y2="${base + 1}" stroke="${C.mute}"/>${person(st.age, {x: 32, base, k, glasses: st.se <= -.5})}</svg><span><b class="num">${st.age}세</b>${YEAR - st.age}년생 · ${Math.round(heightOf(st.age))}cm</span></div>`;
    }
    function inputs() {
      inEl.innerHTML = `<div class="cs-f"><label>나이</label>${step('나이', `${st.age}세<small>${YEAR - st.age}년생</small>`, 'age-', 'age+')}</div>
        <div class="cs-f"><label>성별</label>${seg(GENDER, st.gender, 'g')}</div>
        <div class="cs-f"><label>부모 근시</label>${seg(PARENTS, st.parents, 'p')}</div>
        <div class="cs-f"><label>현재 도수 (구면등가)${pw !== null ? ' <em>고객 도수 반영</em>' : ''}</label>${step('도수', fD(st.se), 'se-', 'se+', true)}</div>
        <div class="cs-f"><label>보기</label>${seg([['또래 비교', 'avg'], ['18세 예측', 'pred']], st.step, 'step')}</div>
        <div class="cs-f"><label>근시 억제 렌즈 비교</label>${seg([['끄기', 0], ['비교하기', 1]], st.ctl ? 1 : 0, 'c')}</div>${kid()}`;
    }
    /* ── 그래프 움직임: 값이 바뀌면 점이 미끄러지듯 이동하고, 예측 곡선이 부드럽게 변형되며, 화면을 바꾸면 왼쪽에서 오른쪽으로 그려짐 ── */
    const GR = Array.from({length: 15}, (_, i) => i + 4), ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const AGES = Object.keys(AVG).map(Number), AVGPTS = AGES.map(a => [a, AVG[a]]);
    let view = null, raf = 0;
    function target() {                                                  // 지금 입력값이 만드는 그래프의 목표 상태
      if (st.step === 'avg') return {step: 'avg', age: st.age, se: st.se, label: '우리 아이 ' + fD(st.se)};
      const p = predict(st), ext = a => GR.map(g => a[clamp(g - st.age, 0, a.length - 1)]);
      return {step: 'pred', n: p.ages.length, x0: st.age, mean: ext(p.mean), lo: ext(p.lo), up: ext(p.up), cMean: ext(p.cMean), cLo: ext(p.cLo), cUp: ext(p.cUp), cw: st.ctl ? 1 : 0};
    }
    function blend(a, b, k) {
      if (b.step === 'avg') return {step: 'avg', age: lerp(a.age, b.age, k), se: lerp(a.se, b.se, k), label: b.label};
      const m = key => b[key].map((v, i) => lerp(a[key][i], v, k));
      return {step: 'pred', n: b.n, x0: lerp(a.x0, b.x0, k), mean: m('mean'), lo: m('lo'), up: m('up'), cMean: m('cMean'), cLo: m('cLo'), cUp: m('cUp'), cw: lerp(a.cw, b.cw, k)};
    }
    function svgOf(v) {
      if (v.step === 'avg') {
        const yMin = Math.min(...AGES.map(a => AVG[a]), v.se, -9) - 1;
        return chart({H: 340, x0: 4, x1: 18, yMin, yMax: 2, series: [{pts: AVGPTS, color: '#9aa6b2', dash: true, w: 3}], marks: [{x: clamp(v.age, 4, 18), y: v.se, color: C.amber, label: v.label}]});
      }
      const at = (arr, x) => { const f = x - 4, lo = Math.floor(f), hi = Math.min(14, Math.ceil(f)); return lerp(arr[lo], arr[hi], f - lo); };
      const pts = arr => [[v.x0, at(arr, v.x0)]].concat(GR.filter(g => g > v.x0 + 1e-6).map(g => [g, arr[g - 4]]));
      const mix = (a, b) => a.map((x, i) => lerp(x, b[i], v.cw)), cM = mix(v.mean, v.cMean), cL = mix(v.lo, v.cLo), cU = mix(v.up, v.cUp);
      const vis = GR.map((g, i) => i).filter(i => GR[i] >= v.x0 - 1e-6);
      const yMin = Math.min(...vis.map(i => v.lo[i]), at(v.lo, v.x0)) - 1, yMax = Math.max(1, ...vis.map(i => v.up[i])) + .3;
      return chart({H: 340, x0: v.x0, x1: Math.max(18, v.x0 + 1), yMin, yMax,
        bands: [{up: pts(v.up), low: pts(v.lo), color: C.coral}, {up: pts(cU), low: pts(cL), color: C.teal, op: v.cw}],
        series: [{pts: pts(v.mean), color: C.coral, dots: true}, {pts: pts(cM), color: C.teal, dots: true, op: v.cw}]});
    }
    function paint(v, reveal) {
      const slot = res.querySelector('.cs-slot'); if (!slot) return;
      slot.innerHTML = v.step === 'pred' && v.n < 2 ? '<div class="sim-note">18세는 예측할 기간이 없어요. 나이를 낮춰 보세요.</div>' : svgOf(v);
      const s = slot.firstElementChild; if (s && s.style) s.style.clipPath = reveal < 1 ? `inset(0 ${((1 - reveal) * 100).toFixed(1)}% 0 0)` : '';
    }
    function go() {                                                      // 그래프를 목표 상태로 부드럽게 이동
      cancelAnimationFrame(raf);
      const to = target(), from = view, same = from && from.step === to.step, t0 = performance.now(), dur = same ? 520 : 850;
      (function tick(now) {
        const k = clamp((now - t0) / dur, 0, 1), e = ease(k);
        view = same ? blend(from, to, e) : to; paint(view, same ? 1 : e);
        if (k < 1) raf = requestAnimationFrame(tick); else { view = to; paint(to, 1); }
      })(t0);
    }
    function side() {
      if (st.step === 'avg') {
        const avg = avgOf(st.age), diff = st.se - avg, rk = risk(diff);
        return `<div class="cs-risk cs-risk--${rk.cls}"><small class="cs-k">또래 대비 위험도</small><b class="cs-lvl">${rk.lv}</b>
          <div class="cs-vs"><div><small>${st.age}세 평균</small><b>${fD(avg)}</b></div><i>VS</i><div><small>우리 아이</small><b class="me">${fD(st.se)}</b></div></div>
          <p class="cs-diff">${diff < 0 ? `평균보다 <b class="bad">${Math.abs(diff).toFixed(2)}D</b> 더 근시가 진행됐어요.` : `평균보다 <b class="ok">${Math.abs(diff).toFixed(2)}D</b> 양호해요.`}</p></div>
          <div class="cs-tip"><small class="cs-k">관리 포인트</small><p>${st.age <= 9 ? '만 9세 이전은 <b>시력 관리 골든타임</b>이에요.' : '디지털 기기 사용이 근시 진행을 <b>빠르게</b> 해요.'}</p><p><b>6개월마다 정기 검진</b>과 억제 관리를 권해요.</p></div>`;
      }
      const p = predict(st), last = p.ages.length - 1, ctl = st.ctl, fin = p.mean[last], finC = p.cMean[last], prog = fin - st.se, progC = finC - st.se, diff = Math.abs(prog - progC), pct = Math.abs(prog) > 0 ? Math.round(diff / Math.abs(prog) * 100) : 0;
      return `<div class="cs-sum"><small>18세 예상 도수 · 일반 렌즈</small><b class="bad">${fD(fin)}</b><em>예상 오차 ${fD(p.up[last])} ~ ${fD(p.lo[last])}</em></div>
        ${ctl ? `<div class="cs-sum cs-sum--g"><small>18세 예상 도수 · 근시 억제 렌즈</small><b class="ok">${fD(finC)}</b><p>도수 <b>+${diff.toFixed(2)}D</b> 덜 나빠져요 (<b>${pct}%</b> 억제)</p></div>` : '<div class="cs-tip"><small class="cs-k">안내</small><p>오른쪽 <b>근시 억제 렌즈 비교</b>를 “비교하기”로 바꾸면 억제 효과를 함께 볼 수 있어요.</p></div>'}`;
    }
    res.innerHTML = '<div class="cs-chart"><h5></h5><div class="cs-slot"></div></div><div class="cs-side"></div>';
    function render() {
      inputs();
      res.querySelector('h5').innerHTML = st.step === 'avg' ? '또래 아이들 평균 시력 비교 <small>점선 = 한국 평균</small>' : `18세 기준 근시 진행 예측 <small>${st.ctl ? '코랄 = 일반 렌즈 · 청록 = 억제 렌즈' : '코랄 = 일반 렌즈 (옅은 띠 = 예상 오차)'}</small>`;
      res.querySelector('.cs-side').innerHTML = side();
      go();
    }    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !box.contains(b)) return;
      const d = b.dataset;
      if (d.act === 'age-') st.age = clamp(st.age - 1, 4, 18); else if (d.act === 'age+') st.age = clamp(st.age + 1, 4, 18);
      else if (d.act === 'se-') st.se = clamp(Math.round((st.se - .25) * 4) / 4, -10, 2); else if (d.act === 'se+') st.se = clamp(Math.round((st.se + .25) * 4) / 4, -10, 2);
      else if (d.act === 'ctl') st.ctl = !st.ctl;
      else if (d.c !== undefined) { st.ctl = d.c === '1'; if (st.ctl) st.step = 'pred'; } else if (d.g !== undefined) st.gender = +d.g; else if (d.p !== undefined) st.parents = +d.p; else if (d.step) st.step = d.step; else return;
      render();
    }, {signal: ac.signal});
    render();
    return {destroy() { cancelAnimationFrame(raf); ac.abort(); }};
  }

  /* ───── v5 공통 부품: 레퍼런스(주식 앱 소개 영상) 스타일 — 흰 바탕 · 슬레이트 선 · 민트 포인트 · 짙은 청록 카드 ───── */
  const FX = {mint: '#2bbf95', dark: '#38645f', ink: '#3b4856', coral: '#ee8070', amber: '#f2b84b', blue: '#5b8def', gr: '#6b7684'};
  const swipeHTML = label => `<div class="fx-swipe" tabindex="0" role="slider" aria-label="${label}"><span class="fx-swh"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="${FX.ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="fx-swt"></span></div>`;
  function swipeCtl(sw, {min, max, step, get, set, text}, signal) {            // 밀어서 값을 바꾸는 알약 슬라이더 (레퍼런스의 'Swipe to confirm')
    const swh = sw.querySelector('.fx-swh'), swt = sw.querySelector('.fx-swt');
    const place = () => { const r = sw.getBoundingClientRect(), hw = swh.offsetWidth || 40, span = Math.max(0, r.width - hw - 8); swh.style.transform = `translateX(${((get() - min) / (max - min) * span).toFixed(1)}px)`; swt.textContent = text(get()); swt.dataset.s = (get() - min) / (max - min) > .5 ? "l" : "r"; sw.setAttribute('aria-valuenow', get()); sw.setAttribute('aria-valuemin', min); sw.setAttribute('aria-valuemax', max); };
    const fromX = x => { const r = sw.getBoundingClientRect(), hw = swh.offsetWidth || 40, k = clamp((x - r.left - hw / 2 - 4) / Math.max(1, r.width - hw - 8), 0, 1); set(clamp(Math.round((min + k * (max - min)) / step) * step, min, max)); };
    let drag = false;
    sw.addEventListener('pointerdown', e => { drag = true; try { sw.setPointerCapture(e.pointerId); } catch (_) {} fromX(e.clientX); }, {signal});
    sw.addEventListener('pointermove', e => { if (drag) fromX(e.clientX); }, {signal});
    ['pointerup', 'pointercancel'].forEach(k => sw.addEventListener(k, () => { drag = false; }, {signal}));
    sw.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (!d) return; e.preventDefault(); set(clamp(get() + d * step, min, max)); }, {signal});
    const ro = new ResizeObserver(place); ro.observe(sw);
    return {place, destroy() { ro.disconnect(); }};
  }
  /* 플랫 눈 단면: 흰 안구 · 슬레이트 윤곽선 · 각막 · 홍채 · 수정체(조절 시 두꺼워짐) · 망막 · 시신경 */
  function flatEye({cx, cy, rx, ry, lensK = 1, ret = FX.mint, glow = null, ga = 0}) {
    const f = n => (+n).toFixed(1), x0 = cx - rx, lx = x0 + .4 * rx, a = 58 * Math.PI / 180, dy = .42 * ry, ex = cx - rx * Math.sqrt(1 - .42 * .42);
    const lr = .075 * rx * lensK, lh = .36 * ry / Math.sqrt(lensK), ix = x0 + .3 * rx, r1x = cx + (rx - 5) * Math.cos(a), r1y = cy - (ry - 5) * Math.sin(a), r2y = cy + (ry - 5) * Math.sin(a);
    const g = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff" stroke="${FX.ink}" stroke-width="2.4"/>
      <path d="M${f(ex)} ${f(cy - dy)}Q${f(x0 - rx * .2)} ${f(cy)} ${f(ex)} ${f(cy + dy)}A${f(rx)} ${f(ry)} 0 0 1 ${f(ex)} ${f(cy - dy)}Z" fill="#eefaf6" stroke="${FX.ink}" stroke-width="2.2" stroke-linejoin="round"/>
      ${glow ? `<circle cx="${f(lx)}" cy="${f(cy)}" r="${f(ry * .5)}" fill="${glow}" opacity="${ga.toFixed(2)}"/>` : ''}
      <path d="M${f(ix)} ${f(cy - ry * .74)}V${f(cy - ry * .28)}M${f(ix)} ${f(cy + ry * .28)}V${f(cy + ry * .74)}" stroke="${FX.ink}" stroke-width="${f(Math.max(3.5, ry * .07))}" stroke-linecap="round"/>
      <ellipse cx="${f(lx)}" cy="${f(cy)}" rx="${f(lr)}" ry="${f(lh)}" fill="#bdeedd" stroke="${FX.ink}" stroke-width="2.2"/><ellipse cx="${f(lx - lr * .35)}" cy="${f(cy - lh * .45)}" rx="${f(lr * .22)}" ry="${f(lh * .3)}" fill="#fff" opacity=".85"/>
      <path d="M${f(r1x)} ${f(r1y)}A${f(rx - 5)} ${f(ry - 5)} 0 0 1 ${f(r1x)} ${f(r2y)}" fill="none" stroke="${ret}" stroke-width="6" stroke-linecap="round"/>
      <rect x="${f(cx + rx - 3)}" y="${f(cy + ry * .3)}" width="${f(Math.max(16, rx * .16))}" height="${f(Math.max(8, ry * .13))}" rx="5" fill="${FX.ink}" transform="rotate(22 ${f(cx + rx - 3)} ${f(cy + ry * .3)})"/>`;
    return {g, retX: cx + rx - 5, lx, x0};
  }

  /* ═════════ 2. 영유아 ~ 19세: 근시가 진행되는 원리 ═════════
     안구 길이(AL)와 눈의 초점 거리(Fopt)가 맞으면 정시. 정상 성장은 눈이 자라는 만큼 초점도 같이 맞춰지고(정시화),
     근시형은 안구만 계속 길어져 초점이 망막 앞에 맺힘. 값은 대표적인 성장 곡선을 단순화한 개념값(그림은 차이를 키워 그림). */
  const AL_N = [[0, 16.8], [1, 20.3], [2, 21.4], [3, 21.9], [6, 22.5], [10, 23.0], [14, 23.3], [18, 23.5], [25, 23.6]];   // 정상 안구 길이(mm)
  const HYP = [[0, .9], [1, .7], [3, .45], [6, .2], [10, .04], [25, 0]];                                             // 유아기 생리적 원시(초점이 망막보다 먼 정도, mm)
  const EXTRA = [[0, 0], [5, 0], [6, .15], [8, .5], [10, .9], [12, 1.2], [14, 1.45], [16, 1.6], [18, 1.7], [25, 1.8]];  // 근시형 추가 신장(mm)
  const alN = a => lerpTbl(AL_N, a), foc = a => alN(a) + lerpTbl(HYP, a), alM = a => alN(a) + lerpTbl(EXTRA, a);
  const SLOTS = [['영유아', '0–2세', 1], ['유아', '3–6세', 4.5], ['학령기', '7–12세', 9], ['청소년', '13–18세', 15], ['성인', '19세', 19]];
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
    const id = 'gr' + (++uid), ac = new AbortController(), S = 8.2, X0 = 26, CY = 85, G = 2.4, GH = 5;      // G · GH: 그림에서 차이를 키우는 배율 (숫자는 실제 값)
    const st = {age: 1, play: 0};
    el.innerHTML = `<div class="fx fx--g" id="${id}">
      <div class="fx-left fx-left--g"><div class="fx-big"><b class="fx-cut num"></b><small class="fx-sub num"></small></div><svg viewBox="0 0 260 112" class="fx-chart" aria-hidden="true"></svg><div class="fx-kids"><svg viewBox="0 0 182 296" class="fx-ppl" aria-label="영유아부터 성인까지 키 변화"></svg></div></div>
      <div class="fx-main fx-main--g"><div class="fx-eyes"></div><div class="fx-black fx-black--g"></div></div>
      <div class="fx-ctl"><h6>나이 고르기</h6>
        <div class="fx-pills fx-pills--v" data-k="stage">${SLOTS.map(([n, r], i) => `<button type="button" data-v="${i}">${n}<small>${r}</small></button>`).join('')}</div>
        <button type="button" class="fx-play" aria-label="자동 재생">▶</button>
        ${swipeHTML('나이')}
      </div></div>`;
    const box = el.querySelector('.fx'), $ = s => box.querySelector(s), play = $('.fx-play');
    const sw = swipeCtl($('.fx-swipe'), {min: 0, max: 19, step: .5, get: () => st.age, set: v => { stop(); st.age = v; draw(); }, text: v => `나이 ${v % 1 ? v.toFixed(1) : v}세`}, ac.signal);
    const chart = a => {                                               // 휴대폰 화면의 안구 길이 곡선
      const W = 260, H = 112, L = 8, R = 14, T = 10, B = 20, X = v => L + v / 19 * (W - L - R), Y = v => T + (26 - v) / 10 * (H - T - B), ages = Array.from({length: 39}, (_, i) => i / 2);
      const P = fn => ages.map((v, i) => (i ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(fn(v)).toFixed(1)).join(''), dot = (v, c) => `<circle cx="${X(a)}" cy="${Y(v).toFixed(1)}" r="9" fill="${c}" opacity=".18"/><circle cx="${X(a)}" cy="${Y(v).toFixed(1)}" r="4.2" fill="${c}" stroke="#fff" stroke-width="2"/>`;
      return `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FX.mint}" stop-opacity=".28"/><stop offset="1" stop-color="${FX.mint}" stop-opacity="0"/></linearGradient></defs>
        ${[0, 5, 10, 15, 19].map(t => `<text x="${X(t)}" y="${H - 5}" font-size="8.5" font-weight="700" fill="#9aa1ab" text-anchor="middle">${t}세</text>`).join('')}
        <path d="${P(alN)}L${X(19)} ${H - B}L${X(0)} ${H - B}Z" fill="url(#${id}f)"/><path d="${P(alM)}" fill="none" stroke="${FX.coral}" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3"/><path d="${P(alN)}" fill="none" stroke="${FX.mint}" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="${X(a)}" x2="${X(a)}" y1="${T}" y2="${H - B}" stroke="${FX.ink}" stroke-opacity=".18" stroke-dasharray="2 3"/>${dot(alM(a), FX.coral)}${dot(alN(a), FX.mint)}`;
    };
    function eyeCard(kind, a) {                                          // 눈 한 개: 안구 길이에 맞는 플랫 눈 단면 + 초점 위치
      const myo = kind === 'm', ln = alN(a), lm = alM(a), f = foc(a), L = myo ? lm : ln, d = (f - L) * 2.7, [sName, sCls] = stateOf(d);
      const Lpx = ln * S + (myo ? (lm - ln) * S * G : 0), fx = X0 + ln * S + (f - ln) * S * (f > ln ? GH : G), cx = X0 + Lpx / 2, ry = Math.min(74, Lpx * .4), E = flatEye({cx, cy: CY, rx: Lpx / 2, ry, ret: myo ? FX.coral : FX.mint}), retX = E.retX, col = {hy: FX.amber, ok: FX.mint, my: FX.coral}[sCls];
      const ray = y0 => { const yl = CY + y0 * .35, k = (x) => CY + y0 * .35 * (1 - (x - E.lx) / (fx - E.lx)), end = Math.min(fx, retX) === fx ? retX : retX, pts = `4,${CY + y0} ${X0 - 2},${CY + y0 * .75} ${E.lx},${yl} ${fx <= retX ? fx + ',' + CY + ' ' + retX + ',' + k(retX).toFixed(1) : retX + ',' + k(retX).toFixed(1)}`;
        return `<polyline points="${pts}" fill="none" stroke="${FX.ink}" stroke-width="1.5" stroke-linejoin="round" opacity=".7"/><polyline points="${pts}" fill="none" stroke="${FX.mint}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 7"/>${fx > retX ? `<line x1="${retX}" y1="${k(retX).toFixed(1)}" x2="${fx}" y2="${CY}" stroke="${col}" stroke-width="1.6" stroke-dasharray="3 4" opacity=".8"/>` : ''}`; };
      const spot = sCls === 'ok' ? '' : `<ellipse cx="${retX}" cy="${CY}" rx="3" ry="${clamp(Math.abs(d) * 4, 4, 22).toFixed(1)}" fill="${col}" opacity=".4"/>`;
      const svg = `<svg viewBox="0 4 300 162" class="fx-eye" aria-hidden="true"><g transform="translate(${(150 - cx).toFixed(1)} 0)">${E.g}${spot}${[-14, 0, 14].map(ray).join('')}<circle cx="${fx.toFixed(1)}" cy="${CY}" r="12" fill="${col}" opacity=".25"/><circle cx="${fx.toFixed(1)}" cy="${CY}" r="5" fill="${col}" stroke="#fff" stroke-width="2.2"/></g></svg>`;
      const msg = sCls === 'hy' ? '초점이 망막 <b>뒤</b>에 맺혀요' : sCls === 'my' ? '초점이 망막 <b>앞</b>에 맺혀요' : '초점이 망막에 <b>딱</b> 맺혀요';
      return `<div class="fx-eye-c ${myo ? 'fx-eye-c--n' : 'fx-eye-c--r'}"><div class="fx-eh"><span class="fx-chip">${myo ? '근시형 성장' : '정상 성장'}</span><span class="fx-cutp fx-cutp--${sCls}">${sName} ${fD(Math.abs(d) < .05 ? 0 : d)}</span></div>${svg}<div class="fx-ef"><div><small>안구 길이</small><b class="num">${L.toFixed(1)}<em>mm</em></b></div><span class="fx-note">${msg}</span></div></div>`;
    }
    function draw() {
      const a = st.age, si = stageIdx(a), cm = Math.round(heightOf(a)), ln = alN(a), lm = alM(a), f = foc(a), dN = (f - ln) * 2.7, dM = (f - lm) * 2.7;
      $('.fx-cut').textContent = (a % 1 ? a.toFixed(1) : a) + '세'; $('.fx-sub').textContent = `${SLOTS[si][0]} · ${SLOTS[si][1]}`;
      $('.fx-chart').innerHTML = chart(a);
      box.querySelectorAll('[data-k=stage] button').forEach((b, i) => b.classList.toggle('is-on', i === si));
      const KG = 1.4, B0 = 280;                                          // 사람 한 명이 한 자리에서 나이에 따라 서서히 자람
      $('.fx-ppl').innerHTML = `<line x1="6" x2="176" y1="${B0 + 1}" y2="${B0 + 1}" stroke="#cfd8da" stroke-width="2" stroke-linecap="round"/>`
        + person(a, {x: 91, base: B0, k: KG, col: FX.dark, cloth: CLOTH[si], glasses: (foc(a) - alM(a)) * 2.7 < -.75});

      $('.fx-eyes').innerHTML = eyeCard('n', a) + eyeCard('m', a);
      const bl = d => clamp(Math.abs(d) * 1.15, 0, 6.5).toFixed(1), [nN] = stateOf(dN), [nM] = stateOf(dM);
      $('.fx-black').innerHTML = `<div class="fx-bt"><small>${SLOTS[si][0]} · ${SLOTS[si][1]}</small><h3>${STAGES[si][2]}</h3></div>
        <div class="fx-vis"><figure><div style="filter:blur(${bl(dN)}px)">${SCENE}</div><figcaption>정상 눈</figcaption></figure><figure><div style="filter:blur(${bl(dM)}px)">${SCENE}</div><figcaption>근시형 눈</figcaption></figure></div>`;
      sw.place();
    }
    let raf = 0;
    function stop() { cancelAnimationFrame(raf); st.play = 0; play.textContent = '▶'; }
    function start() {
      if (st.age >= 19) st.age = 0;
      st.play = 1; play.textContent = '❚❚'; let last = performance.now();
      (function tick(now) { if (!st.play) return; st.age = Math.min(19, st.age + (now - last) / 1000 * 3); last = now; draw(); if (st.age >= 19) return stop(); raf = requestAnimationFrame(tick); })(last);
    }
    play.addEventListener('click', () => st.play ? stop() : start(), {signal: ac.signal});
    box.addEventListener('click', e => { const b = e.target.closest('[data-k=stage] button'); if (b) { stop(); st.age = SLOTS[+b.dataset.v][2]; draw(); } }, {signal: ac.signal});
    draw();
    return {destroy() { stop(); ac.abort(); sw.destroy(); }};
  }

  /* ═════════ 3. 근시 억제 렌즈 원리 ═════════
     중심 초점은 망막에, 주변 초점은 일반 렌즈=망막 뒤 / 근시 억제 렌즈=망막 앞. 초점들을 이은 곡선이 '초점 면'.
     휴대폰 화면의 차트는 8세 기준 모델(연 −0.73D, 억제 렌즈는 진행 속도 약 41%)을 단순화한 개념값입니다. */
  function mountControl(el) {
    const p = 'ct' + (++uid) + '_', ac = new AbortController(), RATE = .73, KEEP = .41;
    const CX = 470, CY = 160, RX = 150, RY = 118, LX = 320 + .4 * RX, SX = 190, W = 800, H = 332;
    const st = {years: 2}; let t = 0, mode = 'normal', anim = 0;
    el.innerHTML = `<div class="fx fx--c">
      <div class="fx-main fx-main--c">
        <div class="fx-eyecard"><div class="fx-eyetxt"><small class="ct-k"></small><h3 class="ct-h"></h3><div class="ct-steps"></div></div>
          <svg viewBox="0 0 ${W} ${H}" class="fx-eyebig" aria-hidden="true"><defs>
          <radialGradient id="${p}t"><stop offset="0" stop-color="${FX.mint}" stop-opacity=".7"/><stop offset="1" stop-color="${FX.mint}" stop-opacity="0"/></radialGradient>
          <radialGradient id="${p}c"><stop offset="0" stop-color="${FX.coral}" stop-opacity=".7"/><stop offset="1" stop-color="${FX.coral}" stop-opacity="0"/></radialGradient></defs><g class="ct-g"></g></svg></div></div>
      <div class="fx-ctl"><h6>렌즈 고르기</h6>
        <div class="fx-pills fx-pills--v" data-k="modes"><button type="button" data-m="normal">일반 렌즈</button><button type="button" data-m="control">근시 억제 렌즈</button></div>
        <div class="fx-chartbox"><div class="fx-big"><b class="fx-cut num"></b><small class="fx-sub num"></small></div>
          <svg viewBox="0 0 260 150" class="fx-chart" aria-hidden="true"></svg></div>
        ${swipeHTML('착용 기간')}
      </div></div>`;
    const box = el.querySelector('.fx'), $ = s => box.querySelector(s), g = $('.ct-g'), steps = $('.ct-steps');
    const sw = swipeCtl($('.fx-swipe'), {min: 0, max: 3, step: .5, get: () => st.years, set: v => { st.years = v; draw(); }, text: v => `착용 ${v}년`}, ac.signal);
    const onRetina = a => [CX + (RX - 8) * Math.cos(a), CY + (RY - 8) * Math.sin(a)];
    const normalAt = a => { const nx = Math.cos(a) / (RX - 8), ny = Math.sin(a) / (RY - 8), l = Math.hypot(nx, ny); return [nx / l, ny / l]; };
    const chart = () => {                                              // 휴대폰 화면: 착용 기간에 따른 도수 변화 (일반 vs 억제)
      const Wc = 260, Hc = 150, L = 8, R = 14, T = 10, B = 20, X = v => L + v / 3 * (Wc - L - R), Y = v => T + (v / 2.4) * (Hc - T - B), ys = Array.from({length: 7}, (_, i) => i / 2);   // v: 도수 하락량(D)
      const P = k => ys.map((y, i) => (i ? 'L' : 'M') + X(y).toFixed(1) + ' ' + Y(RATE * k * y).toFixed(1)).join(''), dot = (k, c) => `<circle cx="${X(st.years)}" cy="${Y(RATE * k * st.years).toFixed(1)}" r="9" fill="${c}" opacity=".18"/><circle cx="${X(st.years)}" cy="${Y(RATE * k * st.years).toFixed(1)}" r="4.2" fill="${c}" stroke="#fff" stroke-width="2"/>`;
      return `<defs><linearGradient id="${p}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FX.mint}" stop-opacity=".0"/><stop offset="1" stop-color="${FX.mint}" stop-opacity=".26"/></linearGradient></defs>
        ${[0, 1, 2, 3].map(v => `<text x="${X(v)}" y="${Hc - 5}" font-size="8.5" font-weight="700" fill="#9aa1ab" text-anchor="middle">${v}년</text>`).join('')}
        <text x="${L}" y="${T + 3}" font-size="8" font-weight="700" fill="#9aa1ab">0D</text>
        <path d="${P(KEEP)}L${X(3)} ${Y(RATE * KEEP * 3)}L${X(3)} ${Hc - B}L${X(0)} ${Hc - B}Z" fill="url(#${p}f)" opacity=".7"/>
        <path d="${P(1)}" fill="none" stroke="${FX.coral}" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3"/><path d="${P(KEEP)}" fill="none" stroke="${FX.mint}" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="${X(st.years)}" x2="${X(st.years)}" y1="${T}" y2="${Hc - B}" stroke="${FX.ink}" stroke-opacity=".18" stroke-dasharray="2 3"/>${dot(1, FX.coral)}${dot(KEEP, FX.mint)}`;
    };
    function face(ctl) {                                                // 정면에서 본 아이 얼굴 + 안경 (억제 렌즈는 주변부에 작은 렌즈렛)
      const fx = 736, fy = 236, lens = dx => {
        let dots = ''; if (ctl > .02) [[9, 8], [14, 12], [18, 16]].forEach(([rr, n], ring) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring * .3; dots += `<circle cx="${(dx + rr * Math.cos(a)).toFixed(1)}" cy="${(rr * Math.sin(a)).toFixed(1)}" r="1.5" fill="${FX.mint}" opacity="${(.9 * ctl).toFixed(2)}"/>`; } });
        return `<circle cx="${dx}" cy="0" r="22" fill="rgba(91,141,239,.1)" stroke="${FX.ink}" stroke-width="2.2"/>${dots}${ctl > .02 ? `<circle cx="${dx}" cy="0" r="6" fill="none" stroke="${FX.mint}" stroke-width="1.4" stroke-dasharray="2 2" opacity="${ctl.toFixed(2)}"/>` : ''}`;
      };
      return `<g transform="translate(${fx} ${fy})"><ellipse rx="54" ry="62" fill="#fff" stroke="${FX.ink}" stroke-width="2.2"/><path d="M-54 -14A54 62 0 0 1 54 -14Q0 -52 -54 -14Z" fill="#dde4e8" stroke="${FX.ink}" stroke-width="2"/>
        ${lens(-27)}${lens(27)}<line x1="-5" y1="0" x2="5" y2="0" stroke="${FX.ink}" stroke-width="2"/><path d="M-14 36q14 10 28 0" fill="none" stroke="${FX.ink}" stroke-width="2" stroke-linecap="round"/></g>
        <text x="${fx}" y="308" font-size="11.5" font-weight="800" text-anchor="middle" fill="${FX.ink}">안경 정면</text>
        <text x="${fx}" y="322" font-size="10" font-weight="700" text-anchor="middle" fill="${FX.gr}">${ctl > .5 ? '중심 선명 · 주변 초점 조절' : '전체가 같은 도수'}</text>`;
    }
    const pill = (x, y, txt, col, anchor = 'start') => { const w = txt.length * 12.5 + 20, x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x; return `<g><rect x="${x0.toFixed(1)}" y="${y - 15}" width="${w}" height="22" rx="11" fill="#fff" stroke="${col}" stroke-width="1.8"/><text x="${(x0 + w / 2).toFixed(1)}" y="${y}" font-size="11.5" font-weight="850" fill="${col}" text-anchor="middle">${txt}</text></g>`; };
    function draw() {
      const off = lerp(36, -22, t), colP = t > .5 ? FX.mint : FX.coral, fov = onRetina(0), A = 1.12, E = flatEye({cx: CX, cy: CY, rx: RX, ry: RY, ret: '#8aa4d6'});
      const fp = [-A, A].map(a => { const r = onRetina(a), n = normalAt(a); return [r[0] + n[0] * off, r[1] + n[1] * off, r]; });
      const ray = (pts, col, w = 1.8) => { const d = pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
        return `<polyline points="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity=".8" stroke-linejoin="round"/><polyline points="${d}" fill="none" stroke="#fff" stroke-width="${w}" class="ray-flow"/>`; };
      let s = E.g;
      s += `<path d="M60,${CY - 18} L${SX},${CY - 18} L${LX},${CY - 14} L${fov[0]},${fov[1]} L${LX},${CY + 14} L${SX},${CY + 18} L60,${CY + 18} Z" fill="${FX.blue}" opacity=".07"/>`;   // 중심 광선 → 황반
      [-18, 0, 18].forEach(h => { s += ray([[60, CY + h], [SX, CY + h], [LX, CY + h * .8], fov], FX.blue); });
      fp.forEach(([x, y, r], i) => {                                    // 주변 광선 (위쪽 시야 → 아래 망막, 아래쪽 시야 → 위 망막)
        const sg = i ? -1 : 1, y0 = CY + sg * 92;
        [-10, 10].forEach(d => { const ly = CY + sg * 14 + d * .4, sy = CY + sg * 50 + d, ext = [x + (x - LX) * .12, y + (y - ly) * .12]; s += ray([[SX - 90, y0 + d], [SX, sy], [LX, ly], [x, y]].concat(t > .5 ? [ext] : []), colP, 2.4); });
        s += `<line x1="${r[0]}" y1="${r[1]}" x2="${x}" y2="${y}" stroke="${colP}" stroke-width="2.4" stroke-dasharray="4 3"/><circle cx="${x}" cy="${y}" r="18" fill="url(#${p}${t > .5 ? 't' : 'c'})"/><circle cx="${x}" cy="${y}" r="7" fill="${colP}" stroke="#fff" stroke-width="2.5"/>`;
      });
      const NP = 30, cv = [], bs = [];                                   // 초점 면: 망막 곡면을 따라 가장자리로 갈수록 앞(뒤)으로 벗어나는 완만한 곡선
      for (let i = 0; i <= NP; i++) { const th = -A + 2 * A * i / NP, r = onRetina(th), nn = normalAt(th), o = off * Math.pow(th / A, 2); bs.push(r); cv.push([r[0] + nn[0] * o, r[1] + nn[1] * o]); }
      const cd = cv.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(''), bd = bs.slice().reverse().map(q => 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
      s += `<path d="${cd}${bd}Z" fill="${colP}" fill-opacity=".22"/><path d="${cd}" fill="none" stroke="${colP}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".18"/><path d="${cd}" fill="none" stroke="${colP}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${fov[0]}" cy="${fov[1]}" r="17" fill="url(#${p}t)"/><circle cx="${fov[0]}" cy="${fov[1]}" r="6.5" fill="#fff" stroke="${FX.blue}" stroke-width="3"/>`;
      let bumps = ''; if (t > .02) for (let i = -5; i <= 5; i++) { if (Math.abs(i) < 2) continue; bumps += `<circle cx="${SX - 14}" cy="${CY + i * 15}" r="3.2" fill="${FX.mint}" opacity="${t.toFixed(2)}"/>`; }
      s += `<path d="M${SX - 16},${CY - 92} C${SX - 6},${CY - 46} ${SX - 6},${CY + 46} ${SX - 16},${CY + 92} L${SX + 14},${CY + 92} C${SX + 2},${CY + 46} ${SX + 2},${CY - 46} ${SX + 14},${CY - 92} Z" fill="rgba(91,141,239,.12)" stroke="${FX.ink}" stroke-width="2.2"/>${bumps}`;
      const grow = t < .5, lab = grow ? '주변 초점: 망막 뒤' : '주변 초점: 망막 앞';
      g.innerHTML = `${s}${pill(fov[0] - 16, fov[1] - 8, '중심 초점: 망막 위', FX.blue, 'end')}${pill(fp[0][0] - 14, fp[0][1] - 14, lab, colP, 'end')}${pill(fp[1][0] - 14, fp[1][1] + 28, lab, colP, 'end')}
        ${pill(SX, CY + 120, t > .5 ? '근시 억제 렌즈' : '일반 렌즈', FX.ink, 'middle')}${pill(fov[0] - 18, fov[1] + 34, '초점이 맺히는 선', colP, 'end')}${face(t)}`;
      /* 휴대폰 · 카드 */
      const k = lerp(1, KEEP, t), dNow = RATE * k * st.years, dGen = RATE * st.years, cut = Math.round((1 - k) * 100);
      $('.fx-cut').textContent = cut ? '−' + cut + '%' : '기준'; $('.fx-sub').textContent = `${st.years}년 뒤 약 ${(-dNow).toFixed(2)}D (일반 ${(-dGen).toFixed(2)}D)`;
      $('.fx-chart').innerHTML = chart();
      box.querySelectorAll('[data-k=modes] button').forEach(b => b.classList.toggle('is-on', b.dataset.m === mode));
      $('.ct-k').textContent = t > .5 ? '근시 억제 렌즈' : '일반 안경 렌즈'; $('.ct-h').innerHTML = t > .5 ? '주변 초점을<br>망막 앞으로 당겨요' : '주변 초점이<br>망막 뒤에 맺혀요';
      steps.innerHTML = `<ul><li><span>01 중심 시야</span><b>어디서나 선명</b></li><li><span>02 주변 시야</span><b class="${t > .5 ? 'g' : ''}">${t > .5 ? '초점이 망막 앞' : '초점이 망막 뒤'}</b></li><li><span>03 눈이 길어지려는 신호</span><b class="${t > .5 ? 'g' : ''}">${t > .5 ? '줄어들도록 유도' : '계속 자극될 수 있음'}</b></li></ul>
        <div class="ct-gauge"><u style="width:${lerp(100, 36, t).toFixed(0)}%"></u></div><p>효과는 개인차가 있으며 정기 검진과 함께 사용해요. 개념 설명용 그림이고, 게이지와 도수 변화는 모델 가정(진행 속도 약 41%)에 따른 값이에요.</p>`;
      sw.place();
    }
    const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-k=modes] button'); if (!b || b.dataset.m === mode) return; mode = b.dataset.m;
      const from = t, to = mode === 'control' ? 1 : 0, t0 = performance.now(); cancelAnimationFrame(anim);
      (function tick(now) { const k = clamp((now - t0) / 900, 0, 1); t = lerp(from, to, ease(k)); draw(); if (k < 1) anim = requestAnimationFrame(tick); })(t0);
    }, {signal: ac.signal});
    draw();
    return {destroy() { cancelAnimationFrame(anim); ac.abort(); sw.destroy(); }};
  }

  /* ═════════ 4. 피로감소 렌즈: 가까이 볼 때 눈이 해야 하는 '초점 조절' 부담 비교 (개념도) ═════════
     가까운 것을 보려면 수정체가 두꺼워지며 조절을 하는데(필요량 D = 1 ÷ 거리(m)), 피로감소 렌즈의 가입도만큼 그 부담이 줄어듭니다.
     화면 구성은 레퍼런스 영상(주식 앱 소개)처럼 흰 바탕 · 휴대폰 화면 · 민트 라인 차트 · 검정 알약 탭 · 밀어서 확인 슬라이더 · 검정 카드로 만들었습니다.
     피로도 곡선과 효과 크기는 이해를 돕는 개념값이고 개인차가 있습니다. */
  function mountFatigue(el) {
    const id = 'fx' + (++uid), ac = new AbortController();
    const OBJ = [['스마트폰', 30], ['서류 · 책', 40], ['모니터', 60]], ADDS = [.4, .6], MINT = '#2bbf95', RED = '#ee8070';
    const st = {obj: 1, add: .4, hours: 4};
    const demand = cm => 100 / cm, fat = (D, h) => clamp(D / 3.5 * (.12 + .88 * (1 - Math.exp(-h / 3.2)) / (1 - Math.exp(-8 / 3.2))), 0, 1);
    const lvl = f => f > .75 ? '높음' : f > .45 ? '보통' : '낮음';
    el.innerHTML = `<div class="fx" id="${id}">
      <div class="fx-left">
        <div class="fx-tt"><i></i><div><b>하루 눈 피로 리포트</b><small>가까이 볼 때 · 눈의 조절 부담</small></div></div>
        <div class="fx-big"><b class="fx-cut num"></b><small class="fx-sub num"></small></div>
        <svg viewBox="0 0 260 200" class="fx-chart" aria-hidden="true"></svg>
      </div>
      <div class="fx-main"><div class="fx-eyes"></div>
        <div class="fx-row"><div class="fx-design"></div><div class="fx-black"></div></div>
        <p class="sim-cap fx-cap"></p></div>
      <div class="fx-ctl"><h6>보는 대상</h6>
        <div class="fx-pills fx-pills--v" data-k="obj">${OBJ.map(([n, cm], i) => `<button type="button" data-v="${i}">${n}<small>${cm}cm</small></button>`).join('')}</div>
        <h6>피로감소 가입도</h6>
        <div class="fx-pills fx-pills--h fx-pills--s" data-k="add">${ADDS.map(a => `<button type="button" data-v="${a}">+${a.toFixed(2)}D</button>`).join('')}</div>
        <div class="fx-swipe" tabindex="0" role="slider" aria-label="하루 사용 시간" aria-valuemin="1" aria-valuemax="8"><span class="fx-swh"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="#3b4856" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="fx-swt"></span></div>
      </div></div>`;
    const box = el.querySelector('.fx'), $ = s => box.querySelector(s);
    const sw = $('.fx-swipe'), swh = $('.fx-swh'), swt = $('.fx-swt');
    /* 눈 단면 (레퍼런스 스타일의 플랫 일러스트): 흰 안구에 검정 윤곽선, 민트 망막과 초점, 조절이 클수록 수정체가 두껍고 둥글어지며 섬모체(조절근) 주변이 붉게 */
    const eyeSvg = (D, relief, f) => {
      const cx = 205, cy = 105, R = 76, glow = relief ? MINT : RED, lr = 6 + D * 5, lh = 32 - D * 2.2, lx = 172, INK = '#3b4856';
      const ray = y0 => `<polyline points="34,${cy + y0} 112,${cy + y0 * .6} ${lx},${cy + y0 * .28} ${cx + 71},${cy}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" opacity=".7"/>
        <polyline points="34,${cy + y0} 112,${cy + y0 * .6} ${lx},${cy + y0 * .28} ${cx + 71},${cy}" fill="none" stroke="${MINT}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 7"/>`;
      const zon = [[-1, 56], [1, 154]].map(([s, y]) => `<line x1="162" y1="${y}" x2="${lx}" y2="${cy + s * (lh - 1)}" stroke="${INK}" stroke-width="${(.8 + f * 2.2).toFixed(1)}" stroke-linecap="round" opacity="${(.45 + f * .4).toFixed(2)}"/><rect x="152" y="${y - 7}" width="18" height="14" rx="7" fill="${INK}"/>`).join('');
      const a = 58 * Math.PI / 180, rx = cx + 71 * Math.cos(a), ry1 = cy - 71 * Math.sin(a), ry2 = cy + 71 * Math.sin(a);
      return `<svg viewBox="0 0 340 210" class="fx-eye" aria-hidden="true"><defs><filter id="${id}s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#14181e" flood-opacity=".14"/></filter></defs>
        <rect x="8" y="${cy - 28}" width="24" height="56" rx="6" fill="${INK}"/><rect x="11.5" y="${cy - 22}" width="17" height="40" rx="3" fill="#eceef1"/><circle cx="20" cy="${cy + 24}" r="1.8" fill="#9aa1ab"/>
        <g filter="url(#${id}s)"><circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="2.6"/></g>
        <path d="M139.8 66Q104 ${cy} 139.8 144A${R} ${R} 0 0 1 139.8 66Z" fill="${relief ? '#e3f7ef' : '#fdecea'}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="${lx}" cy="${cy}" r="${(40 + f * 6).toFixed(0)}" fill="${glow}" opacity="${(.05 + f * .24).toFixed(2)}"/>
        <path d="M158 50V84M158 126V160" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>${zon}
        <ellipse cx="${lx}" cy="${cy}" rx="${lr.toFixed(1)}" ry="${lh.toFixed(1)}" fill="${relief ? '#bdeedd' : '#f9cdc6'}" stroke="${INK}" stroke-width="2.4"/><ellipse cx="${(lx - lr * .35).toFixed(1)}" cy="${cy - lh * .45}" rx="${(lr * .22).toFixed(1)}" ry="${(lh * .3).toFixed(1)}" fill="#fff" opacity=".85"/>
        <path d="M${rx.toFixed(1)} ${ry1.toFixed(1)}A71 71 0 0 1 ${rx.toFixed(1)} ${ry2.toFixed(1)}" fill="none" stroke="${MINT}" stroke-width="6.5" stroke-linecap="round"/>
        <rect x="278" y="${cy + 24}" width="30" height="13" rx="6.5" fill="${INK}" transform="rotate(22 278 ${cy + 24})"/>
        ${[-18, 0, 18].map(ray).join('')}
        <circle cx="${cx + 71}" cy="${cy}" r="15" fill="${MINT}" opacity=".24"/><circle cx="${cx + 71}" cy="${cy}" r="5.2" fill="${MINT}" stroke="#fff" stroke-width="2.4"/>
        <ellipse cx="66" cy="${cy}" rx="${relief ? 7 : 3}" ry="38" fill="${relief ? 'rgba(23,181,132,.2)' : 'rgba(0,0,0,.04)'}" stroke="${INK}" stroke-width="2"/>
        <rect x="${relief ? 18 : 26}" y="${cy + 46}" width="${relief ? 96 : 80}" height="19" rx="9.5" fill="${INK}"/><text x="66" y="${cy + 59.5}" font-size="10" font-weight="850" fill="#fff" text-anchor="middle">${relief ? '+' + st.add.toFixed(2) + 'D 가입도' : '일반 렌즈'}</text>${relief ? `<circle cx="27" cy="${cy + 55.5}" r="3.2" fill="${MINT}"/>` : ''}
        <g font-size="9.5" font-weight="800" fill="#8a919b" text-anchor="middle"><text x="118" y="200">각막</text><text x="${lx}" y="200">수정체</text><text x="${cx + 62}" y="200">망막</text></g></svg>`;
    };
    /* 렌즈 설계: 일반 단초점은 어디나 같은 도수, 피로감소 렌즈는 아래로 갈수록 가입도가 부드럽게 커짐 */
    const GZ = [128, 112, 80], LP = 'M20 8H70Q86 8 86 28V112Q86 142 62 142H28Q4 142 4 112V28Q4 8 20 8Z';
    const designCard = () => {
      const a = st.add, op = (.2 + a / .6 * .32).toFixed(2), gy = GZ[st.obj], gid = id + 'g';
      const lens = (x, relief) => {
        const col = relief ? MINT : RED, iso = relief ? [58, 84, 108].map((y, i) => `<path d="M10 ${y}Q45 ${y + 7} 80 ${y}" fill="none" stroke="${MINT}" stroke-opacity="${(.25 + i * .22).toFixed(2)}" stroke-width="1.4" stroke-dasharray="3 3"/>`).join('') : '';
        return `<g transform="translate(${x} 14)"><path d="${LP}" fill="${relief ? 'url(#' + gid + ')' : 'rgba(31,79,224,.08)'}" stroke="#3b4856" stroke-width="2.4"/>${iso}
          <circle cx="45" cy="${gy}" r="9" fill="${col}" fill-opacity=".2"/><circle cx="45" cy="${gy}" r="4.5" fill="#fff" stroke="${col}" stroke-width="2.4"/>
          <text x="45" y="162" font-size="10.5" font-weight="900" fill="#3b4856" text-anchor="middle">${relief ? '피로감소 설계' : '일반 단초점'}</text>
          <text x="45" y="176" font-size="9.5" font-weight="700" fill="#6b7280" text-anchor="middle">${relief ? '아래로 +' + a.toFixed(2) + 'D까지' : '어디나 같은 도수'}</text></g>`;
      };
      return `<h5>렌즈 설계</h5><div class="fx-dg"><svg viewBox="0 0 200 190" class="fx-lens" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${MINT}" stop-opacity="0"/><stop offset=".38" stop-color="${MINT}" stop-opacity=".05"/><stop offset="1" stop-color="${MINT}" stop-opacity="${op}"/></linearGradient></defs>
          <text x="6" y="11" font-size="9" font-weight="800" fill="#6b7280">▲ 먼 곳</text>${lens(6, false)}${lens(104, true)}<text x="194" y="11" font-size="9" font-weight="800" fill="#6b7280" text-anchor="end">가까운 곳 ▼</text></svg>
        <ul><li><b>위쪽(먼 곳)</b>은 내 도수 그대로라 운전 · 멀리 보기가 선명해요.</li><li><b>아래로 갈수록</b> +${a.toFixed(2)}D 가입도가 부드럽게 커져 가까운 화면에서 눈의 초점 조절을 도와요.</li><li>누진다초점보다 <b>가입도가 작고 변화가 완만</b>해서 적응 부담이 적어요.</li><li>디지털 기기를 오래 보는 분 · 초기 노안에 잘 맞아요.</li></ul></div>`;
    };
    /* 휴대폰 화면의 라인 차트: 하루 사용 시간에 따른 눈 피로 (일반 vs 피로감소) */
    const chart = (D0, D1) => {
      const W = 260, H = 200, L = 8, R = 14, T = 10, B = 20, X = h => L + h / 8 * (W - L - R), Y = f => T + (1 - f) * (H - T - B);
      const pts = D => Array.from({length: 33}, (_, i) => [X(i / 4), Y(fat(D, i / 4))]), P = a => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
      const a0 = pts(D0), a1 = pts(D1), h = st.hours, gx = X(h);
      const dotp = (D, c) => `<circle cx="${gx}" cy="${Y(fat(D, h)).toFixed(1)}" r="9" fill="${c}" opacity=".18"/><circle cx="${gx}" cy="${Y(fat(D, h)).toFixed(1)}" r="4.2" fill="${c}" stroke="#fff" stroke-width="2"/>`;
      return `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${MINT}" stop-opacity=".28"/><stop offset="1" stop-color="${MINT}" stop-opacity="0"/></linearGradient></defs>
        ${[0, 2, 4, 6, 8].map(t => `<text x="${X(t)}" y="${H - 5}" font-size="8.5" font-weight="700" fill="#9aa1ab" text-anchor="middle">${t}h</text>`).join('')}
        <path d="${P(a1)}L${X(8)} ${H - B}L${X(0)} ${H - B}Z" fill="url(#${id}f)"/>
        <path d="${P(a0)}" fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"/><path d="${P(a1)}" fill="none" stroke="${MINT}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="${gx}" x2="${gx}" y1="${T}" y2="${H - B}" stroke="#3b4856" stroke-opacity=".18" stroke-dasharray="2 3"/>${dotp(D0, RED)}${dotp(D1, MINT)}`;
    };
    function draw() {
      const cm = OBJ[st.obj][1], D0 = demand(cm), D1 = Math.max(0, D0 - st.add), f0 = fat(D0, st.hours), f1 = fat(D1, st.hours), cut = Math.round((1 - D1 / D0) * 100);
      $('.fx-cut').textContent = '−' + cut + '%'; $('.fx-sub').textContent = `${OBJ[st.obj][0]} ${cm}cm · ${D0.toFixed(2)}D → ${D1.toFixed(2)}D`;
      $('.fx-chart').innerHTML = chart(D0, D1);
      box.querySelectorAll('[data-k=obj] button').forEach(b => b.classList.toggle('is-on', +b.dataset.v === st.obj)); box.querySelectorAll('[data-k=add] button').forEach(b => b.classList.toggle('is-on', +b.dataset.v === st.add));
      const eyeCard = (cls, name, relief, D, f) => `<div class="fx-eye-c ${cls}">${eyeSvg(D, relief, f)}<div class="fx-t"><span class="fx-chip">${name}</span><small>눈이 해야 하는 조절</small><b class="num">${D.toFixed(2)}<em>D</em></b>${relief ? `<span class="fx-cutp">−${cut}% 부담 감소</span>` : '<span class="fx-cutp fx-cutp--n">기준</span>'}
        <div class="fx-bar"><span>눈 피로 · ${st.hours}시간 후</span><i><u style="width:${(f * 100).toFixed(0)}%"></u></i><b>${lvl(f)}</b></div></div></div>`;
      $('.fx-eyes').innerHTML = eyeCard('fx-eye-c--n', '일반 렌즈', false, D0, f0) + eyeCard('fx-eye-c--r', '피로감소 렌즈', true, D1, f1);
      $('.fx-design').innerHTML = designCard();
      $('.fx-black').innerHTML = `<small>피로감소 렌즈 · +${st.add.toFixed(2)}D</small><h3>가까운 화면 앞에서도<br>눈은 덜 힘들게</h3><ul><li><span>눈의 조절</span><b class="num">${D0.toFixed(2)}D → ${D1.toFixed(2)}D</b></li><li><span>부담 감소</span><b class="num g">−${cut}%</b></li><li><span>${st.hours}시간 뒤 눈 피로</span><b>${lvl(f0)} → ${lvl(f1)}</b></li></ul>`;
      $('.fx-cap').innerHTML = `<b>${OBJ[st.obj][0]}을(를) ${cm}cm에서 보면</b> 눈은 ${D0.toFixed(2)}D만큼 초점을 조절해야 해요. 피로감소 렌즈는 +${st.add.toFixed(2)}D 가입도로 이 부담을 ${D1.toFixed(2)}D로 줄여, 오래 볼수록 덜 피로해요. <small>조절량(D = 1÷거리)은 계산값이고, 피로 게이지와 효과 크기는 개인차가 있는 개념 설명용 그림이에요.</small>`;
      place();
    }
    /* 밀어서 하루 사용 시간 늘리기 (레퍼런스의 'Swipe to confirm' 슬라이더) */
    function place() {
      const r = sw.getBoundingClientRect(), hw = swh.offsetWidth || 40, span = Math.max(0, r.width - hw - 8);
      swh.style.transform = `translateX(${((st.hours - 1) / 7 * span).toFixed(1)}px)`; swt.textContent = `사용 ${st.hours}시간`; swt.dataset.s = st.hours > 4.5 ? "l" : "r"; sw.setAttribute('aria-valuenow', st.hours);
    }
    let drag = false;
    const setFromX = x => { const r = sw.getBoundingClientRect(), hw = swh.offsetWidth || 40, k = clamp((x - r.left - hw / 2 - 4) / Math.max(1, r.width - hw - 8), 0, 1); st.hours = Math.round((1 + k * 7) * 2) / 2; draw(); };
    sw.addEventListener('pointerdown', e => { drag = true; sw.setPointerCapture(e.pointerId); setFromX(e.clientX); }, {signal: ac.signal});
    sw.addEventListener('pointermove', e => { if (drag) setFromX(e.clientX); }, {signal: ac.signal});
    ['pointerup', 'pointercancel'].forEach(k => sw.addEventListener(k, () => { drag = false; }, {signal: ac.signal}));
    sw.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') st.hours = Math.min(8, st.hours + .5); else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') st.hours = Math.max(1, st.hours - .5); else return; e.preventDefault(); draw(); }, {signal: ac.signal});
    box.addEventListener('click', e => { const b = e.target.closest('.fx-pills button'); if (!b) return; const k = b.parentElement.dataset.k; if (k === 'obj') st.obj = +b.dataset.v; else st.add = +b.dataset.v; draw(); }, {signal: ac.signal});
    const ro = new ResizeObserver(place); ro.observe(sw);
    draw();
    return {destroy() { ac.abort(); ro.disconnect(); }};
  }

  global.MyoTools = {mountConsult, mountGrowth, mountControl, mountFatigue, person};
})(window);
