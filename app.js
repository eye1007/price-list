/* 아이젠트리 V2 · 앱 로직 */
'use strict';
/* ═════════ 설정 ═════════ */
const FB_CONFIG = {apiKey:"AIzaSyBV128h-2uzJUjGsazgK0XXn6f0uVnMyV8",authDomain:"eyegentry-5c7de.firebaseapp.com",databaseURL:"https://eyegentry-5c7de-default-rtdb.firebaseio.com",projectId:"eyegentry-5c7de",storageBucket:"eyegentry-5c7de.firebasestorage.app",messagingSenderId:"772851251300",appId:"1:772851251300:web:330b44914302a6b0048771"};
const DATA_PATH = 'price_list/lensData';
const CACHE_KEY = 'gentry.lensData.v2';
const IDLE_MS = 5 * 60 * 1000;                    // 조작이 없으면 고객 정보 초기화
const CALC_URL = 'https://eye1007.github.io/calc/';
const ADMIN_URL = 'admin.html';
const FIXED_IDX = ['1.56', '1.60', '1.67', '1.74'];
const FRAME = {small: {label: '작은 테', r: 27}, mid: {label: '보통 테', r: 31}, large: {label: '큰 테', r: 35}};
const REC_STEPS = [[3, 1.56], [5, 1.60], [8, 1.67], [Infinity, 1.74]];   // |합도수| → 권장 최소 굴절률
const AGES = [{id: 'none', n: '전체'}, {id: 'student', n: '학생'}, {id: 'adult', n: '성인'}, {id: 'senior', n: '시니어'}];
const SAMPLE = {s: -4, c: 0};                      // 고객 도수가 없을 때 보여줄 예시

/* ═════════ 유틸 ═════════ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const escBr = s => esc(s).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
const safeColor = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : null;
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const toArr = x => Array.isArray(x) ? x.filter(v => v != null) : (x && typeof x === 'object' ? Object.values(x) : []);
const money = v => Number(String(v ?? 0).replace(/[^0-9]/g, '')) || 0;
const numOrNull = v => (v === undefined || v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
const fmtD = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
const won = v => v.toLocaleString() + '원';
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const ICON = {
  eye: '<svg class="i" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  cmp: '<svg class="i" viewBox="0 0 24 24"><path d="M8 3H4v18h4M16 3h4v18h-4M12 3v18"/></svg>'
};
function lensStripe(hex) {                         // 흰색에 가까운 제품색은 중립색으로 대체
  const c = safeColor(hex); if (!c) return '#9aa1ad';
  const h = c.slice(1), f = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
  const lum = (parseInt(f.slice(0, 2), 16) * 299 + parseInt(f.slice(2, 4), 16) * 587 + parseInt(f.slice(4, 6), 16) * 114) / 1000;
  return lum > 235 ? '#9aa1ad' : c;
}
function isLight(hex) {
  const h = (safeColor(hex) || '#000').slice(1), f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
  return (parseInt(f.slice(0, 2), 16) * 299 + parseInt(f.slice(2, 4), 16) * 587 + parseInt(f.slice(4, 6), 16) * 114) / 1000 > 140;
}

/* ═════════ 상태 ═════════ */
const S = {
  data: {categories: [], brands: [], issues: [], matrices: [], images: []},
  lenses: [], byKey: {}, loaded: false,
  tab: store.get('tab'),
  power: {rs: 0, rc: 0, ls: 0, lc: 0, set: false}, age: 'none', issue: 'none',
  cmp: []
};
const hasProfile = () => S.age !== 'none' || S.issue !== 'none';
const worstEye = () => Math.abs(Sim.eff(S.power.rs, S.power.rc)) >= Math.abs(Sim.eff(S.power.ls, S.power.lc)) ? 'R' : 'L';
const eyePw = eye => !S.power.set ? {...SAMPLE, sample: true}
  : (eye === 'R' ? {s: S.power.rs, c: S.power.rc, sample: false} : {s: S.power.ls, c: S.power.lc, sample: false});
function recMinIndex() {
  const m = Math.max(Math.abs(Sim.eff(S.power.rs, S.power.rc)), Math.abs(Sim.eff(S.power.ls, S.power.lc)));
  return REC_STEPS.find(([lim]) => m <= lim)[1];
}
function analyse() {
  const {rs, rc, ls, lc} = S.power, R = rs + rc / 2, L = ls + lc / 2, tags = [];
  const w = Math.abs(R) >= Math.abs(L) ? R : L;
  if (w <= -0.5) tags.push([w <= -6 ? '고도 근시' : w <= -3 ? '중등도 근시' : '경도 근시', '']);
  else if (w >= 0.5) tags.push([w >= 4 ? '고도 원시' : '원시', '']);
  const mc = Math.max(Math.abs(rc), Math.abs(lc));
  if (mc >= 3) tags.push(['고도 난시', 'w']); else if (mc >= 0.75) tags.push(['난시', '']);
  if (Math.abs(R - L) >= 2) tags.push(['부등시', 'w']);
  if (Math.max(Math.abs(Sim.eff(rs, rc)), Math.abs(Sim.eff(ls, lc))) >= 6) tags.push(['고도수', 'w']);
  return tags;
}
function rowState(it) {                              // 'ok' | 'out' | 'na'  (기존 가격표와 동일한 규칙)
  if (money(it.pSale) <= 0) return 'na';
  if (!S.power.set) return 'ok';
  const sMin = numOrNull(it.sMin), sMax = numOrNull(it.sMax), cMin = numOrNull(it.cMin), sum = numOrNull(it.sumMax);
  for (const [s, c] of [[S.power.rs, S.power.rc], [S.power.ls, S.power.lc]]) {
    if (sMax !== null && s > sMax) return 'out';
    if (sMin !== null && s < sMin) return 'out';
    if (cMin !== null && c < cMin) return 'out';
    if (sum !== null && sum > 0 && Math.max(s, s + c) > sum) return 'out';
  }
  return 'ok';
}
function lensAvail(l) { const st = l.items.map(rowState); return st.includes('ok') ? 'ok' : (st.includes('out') ? 'out' : 'na'); }
function lensMatches(l) {
  if (S.age !== 'none' && toArr(l.targetAges).length && !toArr(l.targetAges).includes(S.age)) return false;
  if (S.issue !== 'none' && !toArr(l.targetIssues).includes(S.issue)) return false;
  return true;
}

/* ═════════ 데이터 ═════════ */
function normalize(raw) {
  const d = raw || {};
  return {
    categories: toArr(d.categories).map(c => ({...c})),
    brands: toArr(d.brands).map(b => ({...b, lenses: toArr(b.lenses).map(l => ({...l, items: toArr(l.items)}))})),
    issues: toArr(d.issues),
    matrices: toArr(d.matrices).map(m => ({...m, cols: toArr(m.cols)})),
    images: toArr(d.images)
  };
}
/* 왼쪽 분류 정리 — 화면에서만 나누고 묶음 (저장된 데이터와 V1 관리자 호환은 그대로) */
const GROUPS = ['기본', '기능 · 대상', '컬러', '기타', '정보'];                 // 소제목 순서
const GROUP_OF = [[/정보/, '정보'], [/단초점|고난시|다초점/, '기본'], [/착색|선글라스|변색/, '컬러'], [/피로|빛번짐|근시|오피스|기능/, '기능 · 대상']];
const ALIAS = [[/^피로감소/, '피로감소 · 오피스']];                               // 긴 분류명 줄이기
const SPLITS = [{test: /고난시.*착색|착색.*고난시/, parts: [{name: '고난시', kind: 'astig', has: l => !/착색/.test(l.name)}, {name: '착색', kind: 'tint', has: l => /착색/.test(l.name)}]}];
/* 같은 굴절률에 가격만 다른 줄이 여러 개인 렌즈는 '기본 한 줄 + 옵션 +금액'으로 접어서 보여줌 (화면에서만, 저장 데이터는 그대로) */
const FOLD = [{brand: '호야', name: /^마이오스마트$/}];
function foldOptions() {
  S.lenses.forEach(l => {
    if (!FOLD.some(f => f.brand === l.brandName && f.name.test(l.name))) return;
    const by = new Map(), main = [], opts = new Map();
    l.items.forEach(it => { const k = idxKey(it) || ''; if (!by.has(k)) by.set(k, []); by.get(k).push(it); });
    by.forEach(arr => {
      const ok = arr.filter(it => money(it.pSale) > 0).sort((a, b) => money(a.pSale) - money(b.pSale));
      if (!ok.length) { main.push(...arr); return; }
      main.push(ok[0]);
      ok.slice(1).forEach(it => {
        const base = plain(ok[0].spec), full = plain(it.spec), n = (full.startsWith(base) ? full.slice(base.length) : full).trim() || full;
        if (!opts.has(n)) opts.set(n, money(it.pSale) - money(ok[0].pSale));
      });
    });
    l.items = main; l.opts = [...opts].map(([n, p]) => ({n, p}));
  });
}
const optBlock = l => (l.opts && l.opts.length) ? `<div class="card__opts"><b>옵션</b>${l.opts.map(o => `<span>${esc(o.n)}<i class="num">+${won(o.p)}</i></span>`).join('')}</div>` : '';
function regroup() {
  const cats = [];
  S.data.categories.forEach(c => {
    const sp = c.id !== 'ai' && SPLITS.find(s => s.test.test(c.name || ''));
    if (sp) {
      const mine = S.lenses.filter(l => l.tabId === c.id), parts = sp.parts.map(p => ({p, ls: mine.filter(p.has)}));
      if (parts.every(x => x.ls.length)) {            // 한쪽이 비면 나누지 않고 그대로 둠
        parts.forEach((x, i) => {
          const id = c.id + ':' + i; x.ls.forEach(l => { l.tabId = id; });
          if (i === 0) { S.data.matrices.forEach(m => { if (m.tabId === c.id) m.tabId = id; }); S.data.images.forEach(m => { if (m.tabId === c.id) m.tabId = id; }); }
          cats.push({...c, id, name: x.p.name, kind: x.p.kind, order: (c.order ?? 999) + i / 10});
        });
        return;
      }
    }
    cats.push({...c});
  });
  cats.forEach(c => {
    c.name = (ALIAS.find(a => a[0].test(c.name || '')) || [0, c.name])[1];
    c.group = (GROUP_OF.find(g => g[0].test(c.name || '')) || [0, '기타'])[1];
  });
  S.data.categories = cats;
}
function applyData(raw, fromCache) {
  S.data = normalize(raw);
  S.lenses = []; S.byKey = {};
  S.data.brands.forEach((b, bi) => b.lenses.forEach((l, li) => {
    const o = {...l, brandName: b.name, key: bi + ':' + li}; S.lenses.push(o); S.byKey[o.key] = o;
  }));
  regroup(); foldOptions();
  S.cmp =S.cmp.filter(k => S.byKey[k]);
  S.loaded = true;
  if (!visibleTabs().find(t => t.id === S.tab)) S.tab = (visibleTabs()[0] || {}).id || null;
  renderAll();
  if (!fromCache) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch (e) {} }
}
function connect() {
  try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c) applyData(c, true); } catch (e) {}
  if (typeof firebase === 'undefined') { pill('인터넷 연결을 확인해 주세요 · 저장된 가격표를 표시 중'); return; }
  firebase.initializeApp(FB_CONFIG);
  const db = firebase.database();
  db.ref(DATA_PATH).on('value', snap => { const v = snap.val(); if (v) applyData(v, false); }, () => pill('가격 데이터를 불러오지 못했습니다'));
  db.ref('.info/connected').on('value', s => { if (s.val() === true) pill(null); else if (S.loaded) pill('오프라인 · 마지막으로 저장된 가격표를 표시 중'); });
}
function pill(t) { const p = $('#pill'); if (t) { p.textContent = t; p.hidden = false; } else p.hidden = true; }

/* ═════════ 분류 / 본문 ═════════ */
const railCats = () => {
  const gi = c => { const i = GROUPS.indexOf(c.group); return i < 0 ? 3 : i; };
  return S.data.categories.filter(c => c.id !== 'ai' && c.group !== '정보').sort((a, b) => gi(a) - gi(b) || byOrder(a, b));   // 정보 탭은 화면에서 뺌
};
function visibleTabs() {
  const t = railCats();
  if (hasProfile()) t.unshift({id: 'rec', name: '맞춤 추천', rec: true});
  return t;
}
function tabCount(id) {
  if (id === 'rec') return S.lenses.filter(lensMatches).filter(l => lensAvail(l) === 'ok').length;
  return S.lenses.filter(l => l.tabId === id).length + S.data.matrices.filter(m => m.tabId === id).length;
}
function renderRail() {
  const tabs = visibleTabs();
  let grp = null;
  $('#cats').innerHTML = tabs.map(t => {
    const n = tabCount(t.id), head = !t.rec && t.group !== grp ? (grp = t.group, `<div class="cat-grp">${esc(grp)}</div>`) : '';
    return `${head}<button class="cat ${t.rec ? 'cat--rec' : ''} ${t.group === '정보' ? 'cat--info' : ''} ${t.id === S.tab ? 'is-on' : ''}" data-a="cat" data-v="${esc(t.id)}"><span>${esc(t.name)}</span>${n ? `<em>${n}</em>` : ''}</button>${t.rec ? '<div class="cat-sep"></div>' : ''}`;
  }).join('');
  const on = $('#cats .is-on'); if (on && on.scrollIntoView) on.scrollIntoView({block: 'nearest', inline: 'nearest'});
  renderClient();
}
function renderClient() {
  const el = $('#client'), p = S.power;
  if (!p.set && !hasProfile()) { el.innerHTML = `<button class="client__empty" data-a="power">${ICON.eye}고객 도수 입력</button>`; return; }
  const eye = (n, s, c) => `<div class="cl-eye"><em>${n}</em><b class="num">${fmtD(s)}</b><span class="num">${fmtD(c)}</span></div>`;
  const tags = (p.set ? analyse().map(([t, k]) => `<span class="tg ${k ? 'tg--' + k : ''}">${t}</span>`) : []).concat(
    [S.age !== 'none' ? AGES.find(a => a.id === S.age).n : '', S.issue !== 'none' ? (S.data.issues.find(i => i.id === S.issue) || {}).name : '']
      .filter(Boolean).map(t => `<span class="tg tg--g">${esc(t)}</span>`)).join('');
  el.innerHTML = `<h4>고객</h4>${p.set ? eye('R', p.rs, p.rc) + eye('L', p.ls, p.lc) : ''}<div class="cl-tags">${tags}</div>
    ${p.set ? `<div class="cl-rec">두께 권장 <b>굴절률 ${recMinIndex().toFixed(2)}↑</b></div>` : ''}
    <div class="cl-act"><button data-a="power">수정</button><button data-a="reset">초기화</button></div>`;
}
function renderHead() {
  const t = visibleTabs().find(x => x.id === S.tab);
  if (!t) { $('#head').innerHTML = ''; return; }
  let n = 0, ok = 0;
  const lenses = t.rec ? S.lenses.filter(lensMatches) : S.lenses.filter(l => l.tabId === t.id);
  n = lenses.length; ok = lenses.filter(l => lensAvail(l) === 'ok').length;
  // 다초점 보드가 2개 이상(일반 · 변색)이면 제목 옆에 전환 버튼을 한 줄로 둠
  const mxs = t.rec ? [] : S.data.matrices.filter(m => m.tabId === t.id), mxi = clamp(MXSEL[t.id] || 0, 0, Math.max(0, mxs.length - 1));
  const sw = mxs.length > 1 ? `<div class="mxsw"><div class="seg">${mxs.map((m, i) => `<button class="${i === mxi ? 'is-on' : ''}" data-a="mx" data-v="${i}">${esc(mxLabel(m, mxs))}</button>`).join('')}</div></div>` : '';
  $('#head').innerHTML = `<div><h1>${esc(t.name)}</h1></div>${sw}
    <p>${n ? `제품 ${n}개${S.power.set ? ` · 이 도수로 제작 가능 <b>${ok}개</b>` : ''}` : ''}</p>
    <div class="sp">${n ? '가격 행을 누르면 두께 · 견적을 볼 수 있어요' : ''}</div>`;
}
function renderMain() {
  const sc = $('#scroll'); if (!S.loaded) return;
  const keep = sc.scrollTop;
  Mini.destroy();
  const cat = S.data.categories.find(c => c.id === S.tab);
  // 다초점 보드가 2개 이상이면(일반 · 변색) 위의 버튼으로 하나씩 보여줌
  const mxs = S.tab === 'rec' ? [] : S.data.matrices.filter(m => m.tabId === S.tab), mxi = clamp(MXSEL[S.tab] || 0, 0, Math.max(0, mxs.length - 1)), mxSel = mxs[mxi];
  const ctx = {photo: !!mxSel && /변색/.test((mxSel.brand || '') + (mxSel.name || ''))};
  const hasMini = !!cat && Mini.has(cat.name), mini = hasMini ? Mini.html(cat.name, ctx) : '';
  let html = '<div class="grid">';
  if (S.tab === 'rec') {
    const ls = S.lenses.filter(lensMatches), ok = ls.filter(l => lensAvail(l) === 'ok').sort(byOrder), off = ls.filter(l => lensAvail(l) !== 'ok').sort(byOrder);
    if (!ok.length && !off.length) html += `<div class="empty"><b>조건에 맞는 제품이 없습니다</b>연령·증상 조건을 바꿔 보세요.</div>`;
    const catName = id => (S.data.categories.find(c => c.id === id) || {}).name || '기타';
    const catRank = id => { const i = railCats().findIndex(c => c.id === id); return i < 0 ? 99 : i; };
    ok.sort((a, b) => catRank(a.tabId) - catRank(b.tabId) || byOrder(a, b));
    let lastTab = null;
    ok.forEach(l => { if (l.tabId !== lastTab) { lastTab = l.tabId; html += `<div class="sec">${esc(catName(l.tabId))}</div>`; } html += lensCard(l); });
    if (off.length) { html += `<div class="sec">현재 도수로는 제작이 어려운 제품</div>`; off.forEach(l => html += lensCard(l)); }
  } else {
    const pool = [];
    S.lenses.filter(l => l.tabId === S.tab).forEach(l => pool.push({k: 'lens', o: l}));
    if (mxSel) pool.push({k: 'matrix', o: mxSel});
    S.data.images.filter(i => i.tabId === S.tab).forEach(i => pool.push({k: 'media', o: i}));
    pool.sort((a, b) => byOrder(a.o, b.o));
    if (S.power.set) { const rank = p => p.k === 'lens' && lensAvail(p.o) !== 'ok' ? 1 : 0; pool.sort((a, b) => rank(a) - rank(b)); }
    let offStarted = false;
    const idxs = cat && /어린이 근시/.test(cat.name) ? null : tabIdxs(S.lenses.filter(l => l.tabId === S.tab));   // 어린이 근시는 굴절률이 제각각이라 빈 줄을 만들지 않고 각 렌즈 줄만 보여줌
    pool.forEach(p => {
      if (p.k === 'lens' && S.power.set && lensAvail(p.o) !== 'ok' && !offStarted) { offStarted = true; html += `<div class="sec">현재 도수로는 제작이 어려운 제품</div>`; }
      html += p.k === 'lens' ? lensCard(p.o, idxs) : p.k === 'matrix' ? matrixCard(p.o) : mediaCard(p.o);
    });
    if (!pool.length && !mini) html += `<div class="empty"><b>등록된 제품이 없습니다</b>관리자 화면에서 제품을 추가해 주세요.</div>`;
  }
  html += '</div>';
  const img = cat && safeUrl(cat.img);
  if (hasMini) html += mini;                               // 분류 하단 설명 이미지 대신 직접 만든 미니 시뮬레이션 (비어 있으면 아무것도 안 붙임)
  else if (img) html += `<div class="media banner"><img src="${esc(img)}" alt="" loading="lazy" decoding="async"></div>`;
  sc.innerHTML = html; sc.scrollTop = keep;
  if (mini) Mini.mount(sc);
}
const MXSEL = {};                                           // 분류별로 고른 다초점 보드 (일반 / 변색)
const mxLabel = (m, all) => { const t = /변색/.test((m.brand || '') + (m.name || '')) ? '변색렌즈 다초점' : '일반 다초점'; return all.filter(x => x !== m && (/변색/.test((x.brand || '') + (x.name || ''))) === /변색/.test((m.brand || '') + (m.name || ''))).length ? ([m.brand, m.name].filter(Boolean).join(' · ') || t) : t; };
/* 이름이 길면 글자 크기를 줄여 한 줄에 들어오게 */
const nameSize = n => { const k = String(n || '').length; return k <= 12 ? '' : k <= 15 ? 'n2' : k <= 19 ? 'n3' : 'n4'; };
/* 카드 하단 특징: lens_copy.js 문구가 있으면 그것을, 없으면 관리자 설명을 보여줌 */
function specBlock(l) {
  const c = lensCopy(l);
  if (c) return `<div class="card__spec"><b>특징${c.tag ? `<em>${esc(c.tag)}</em>` : ''}</b><ul>${c.feats.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  return l.desc ? `<div class="card__spec"><b>특징</b><p>${esc(l.desc)}</p></div>` : '';
}
/* 같은 분류의 카드는 굴절률 행을 똑같이 맞춤 — 없는 굴절률은 빈 줄로 둠 (예: D-Free는 1.56 줄이 비고 1.60부터 값) */
const idxKey = it => { const m = String((it && it.idx) || '').match(/\d\.\d+/); return m ? Number(m[0]).toFixed(2) : null; };
const tabIdxs = lenses => { const s = new Set(); lenses.forEach(l => l.items.forEach(it => { const k = idxKey(it); if (k) s.add(k); })); return [...s].sort(); };
/* 여벌 도수 범위: 카드마다 보이지 않고 왼쪽 '도수범위' 버튼(전체 모음)과 렌즈 상세에서만 보여줌 (ranges.js) */
const refOf = l => (typeof RANGE_REF === 'undefined' ? null : RANGE_REF.find(r => r.brand === l.brandName && new RegExp(r.name).test(l.name)) || null);
function rangeFor(l, idx) {
  const ref = refOf(l), lines = ref && ref.idx[idxKey({idx})];
  return lines ? `<div class="dt-range"><b>여벌 도수 범위 · ${esc(idx)}</b>${lines.map(t => `<span>${esc(t)}</span>`).join('')}<small>${esc(ref.src)} · 재고는 주문 전 확인</small></div>` : '';
}
function openRange() {
  if (typeof RANGE_REF === 'undefined') return;
  const sec = new Map();
  RANGE_REF.forEach(ref => {
    const ls = S.lenses.filter(l => l.brandName === ref.brand && new RegExp(ref.name).test(l.name));
    if (!ls.length) return;
    if (!sec.has(ref.brand)) sec.set(ref.brand, []);
    sec.get(ref.brand).push({names: ls.map(l => l.name), ref});
  });
  openSheet(`<div class="sh-h"><h2>여벌 도수 범위</h2><small>신성옵틱 · 케미 · 자이스 자료 기준 · 재고는 주문 전 확인</small>${X_BTN}</div><div class="sh-b"><div class="rgw">${
    [...sec].map(([brand, list]) => `<section class="rgs"><h3>${esc(brand)}</h3>${list.map(({names, ref}) => `<div class="rgs__l"><h4>${names.map(esc).join(' · ')}</h4>${
      Object.keys(ref.idx).sort().map(k => `<div class="rg"><i class="num">${k}</i><span>${ref.idx[k].map(esc).join('<br>')}</span></div>`).join('')}<small>${esc(ref.src)}</small></div>`).join('')}</section>`).join('')
  }</div></div>`, 'sheet--w');
}
function lensCard(l, idxs) {
  const avail = lensAvail(l), rec = S.power.set ? recMinIndex() : null;
  const okRows = l.items.filter(it => rowState(it) === 'ok');
  const recItem = rec && okRows.length > 1 ? (okRows.find(it => parseFloat(it.idx) >= rec - 0.001) || okRows[okRows.length - 1]) : null;
  const inCmp = S.cmp.includes(l.key);
  const shown = l.items.filter(it => !(rowState(it) === 'na' && !/\d/.test(it.idx || '')));   // 굴절률이 '-'인 빈 줄은 숨김
  const rowOf = it => {
    const st = rowState(it), sale = money(it.pSale), off = money(it.pOff), isRec = it === recItem;
    const pct = off > sale && sale > 0 ? Math.round((1 - sale / off) * 100) : 0;
    const price = st === 'ok'
      ? `<div class="price">${off > sale ? `<s>${won(off)}<em>−${pct}%</em></s>` : ''}<b class="num">${sale.toLocaleString()}<i>원</i></b></div>`
      : `<div class="price"><b>${st === 'out' ? '범위 초과' : '—'}</b></div>`;
    return `<button class="row ${isRec ? 'is-rec' : ''} ${st !== 'ok' ? 'is-out' : ''}" ${st === 'ok' ? `data-a="detail" data-k="${esc(l.key)}" data-i="${esc(it.idx)}"` : 'tabindex="-1"'}>
      <span class="row__i num">${esc(it.idx || '-')}</span>
      <span class="row__s">${esc((it.spec || '').replace(/<br\s*\/?>/gi, ' ')) || '&nbsp;'}${isRec ? '<span class="rec-tag">권장</span>' : ''}</span>${price}</button>`;
  };
  let rows;
  if (idxs && idxs.length) {
    rows = idxs.map(k => { const hit = shown.filter(it => idxKey(it) === k); return hit.length ? hit.map(rowOf).join('') : `<div class="row row--empty" aria-hidden="true"><span class="row__i num">${k}</span><span class="row__s"></span><div class="price"><b>—</b></div></div>`; }).join('')
      + shown.filter(it => !idxKey(it)).map(rowOf).join('');
  } else rows = shown.map(rowOf).join('');
  return `<article class="card ${l.isSale ? 'card--sale' : ''} ${S.power.set && avail !== 'ok' ? 'card--off' : ''}" style="--sw:${lensStripe(l.bgColor)}">
    <div class="card__top"><div class="card__id"><div class="eyebrow"><i></i>${esc(l.brandName)}</div><h3 class="${nameSize(l.name)}">${esc(l.name)}</h3></div>
      ${l.isSale ? '<span class="tag tag--sale">SALE</span>' : ''}
      <button class="cmp ${inCmp ? 'is-on' : ''}" data-a="cmp" data-k="${esc(l.key)}" aria-pressed="${inCmp}">${inCmp ? ICON.check : ICON.cmp}비교</button></div>
    <div class="rows">${rows}</div>
    ${optBlock(l)}${specBlock(l)}</article>`;
}
/* ───── 다초점 보드: 제품별 열에 굴절률 가격 · 옵션 · 시야 지도를 한 표로 ───── */
const ADDS = [1.0, 1.5, 2.0, 2.5, 3.0];
S.add = Number(store.get('add')) || 1.5;
const man = v => !v ? '—' : v % 10000 === 0 ? (v / 10000) + '만' : v % 1000 === 0 ? (v / 10000).toFixed(1).replace(/\.0$/, '') + '만' : won(v);
function deriveOpts(m) {                              // 예전 입력 "옵션 : 착색 +15,000원" 제목에서 옵션을 자동 추출
  const r = String(m.name || '').match(/^[^:：]*[:：]\s*(.+?)\s*\+\s*([\d,]+)\s*원/);
  return r ? [{n: r[1].trim(), p: Number(r[2].replace(/,/g, ''))}] : [];
}
const plain = s => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
const progRef = c => { const t = plain(c.name) + ' ' + plain(c.brand); return PROG_REF.prof.find(p => p.m.test(t)) || null; };
function refOpts(m, c) {                              // 관리자에 옵션이 없을 때 쓰는 자이스·케미 가격표 기준 옵션
  const prof = progRef(c); if (!prof) return [];
  const photo = /변색/.test((m.brand || '') + (m.name || '')), today = new Date().toISOString().slice(0, 10), rate = PROG_REF.rate[prof.brand];
  return PROG_REF.opts[prof.brand].filter(o => !(photo && o.noPhoto) && (!o.only || o.only.test(plain(c.name))))
    .map(o => o.until && today <= o.until ? {n: o.n, p: 0, free: true, tag: o.tag} : {n: o.n, p: Math.floor(o.p * rate / 1000) * 1000, tag: o.tag});
}
function colOpts(m, c) {
  const own = toArr(c.opts).filter(o => o && o.n), common = toArr(m.opts).filter(o => o && o.n);
  const list = (own.length || common.length) ? [...common.filter(o => !own.find(x => x.n === o.n)), ...own] : deriveOpts(m);
  return list.length ? list.map(o => ({n: o.n, p: money(o.p)})) : refOpts(m, c);
}
const addChips = () => `<div class="seg">${ADDS.map(a => `<button class="${Math.abs(S.add - a) < .01 ? 'is-on' : ''}" data-a="pg-add" data-v="${a}">+${a.toFixed(2)}</button>`).join('')}</div>`;
function tiersFor(m) {                                // 열마다 등급(1~4). 직접 지정이 없으면 같은 표 안에서 가격 순위로 4등분
  const rep = c => { const p = c.prices || {}, k = ['idx_160', 'idx_156', 'idx_167', 'idx_174'].find(x => money((p[x] || {}).sale)); return k ? money(p[k].sale) : 0; };
  const order = m.cols.map((c, i) => ({i, v: rep(c)})).filter(x => x.v).sort((a, b) => b.v - a.v), auto = {};
  order.forEach((x, r) => { auto[x.i] = Math.min(4, Math.floor(r * 4 / order.length) + 1); });
  return m.cols.map((c, i) => [1, 2, 3, 4].includes(Number(c.tier)) ? Number(c.tier) : (auto[i] || 4));
}
function optNames(m) { const n = []; m.cols.forEach(c => colOpts(m, c).forEach(o => { if (!n.includes(o.n)) n.push(o.n); })); return n; }
const firstLine = s => { const t = String(s || '').replace(/<br\s*\/?>/gi, ' ').split('\n')[0].trim(), k = t.indexOf('. '); return k > 0 ? t.slice(0, k + 1) : t; };
function matrixCard(m) {
  const cols = m.cols, mi = S.data.matrices.indexOf(m), tiers = tiersFor(m), TI = Sim.TIERS, n = cols.length;
  const over = cols.map(c => { const mx = Sim.addMax(c.addInfo); return mx !== null && S.add > mx + .001; });
  const at = (i, ix) => `data-a="pg" data-m="${mi}" data-c="${i}" data-i="${ix || ''}"`;
  let g = `<div class="pg-l pg-corner">굴절률</div>` + cols.map((c, i) => {
    const bg = safeColor(c.bgColor) || '#cbd5e1';
    return `<button class="pg-h ${over[i] ? 'is-over' : ''}" ${at(i)}><span class="pg-bar" style="background:${bg}"></span><span class="pg-t pg-t${tiers[i]}">${TI[tiers[i] - 1].name}</span>${c.brand ? `<small>${esc(c.brand)}</small>` : ''}<b>${esc(plain(c.name))}</b>
      ${c.desc ? `<span class="pg-d">${esc(plain(c.desc))}</span>` : ''}      ${c.isSale ? '<span class="tag tag--sale">SALE</span>' : ''}${over[i] ? '<span class="pg-over">ADD 범위 초과</span>' : ''}</button>`;
  }).join('');
  FIXED_IDX.forEach(ix => {
    g += `<div class="pg-l pg-idx num">${ix}</div>` + cols.map((c, i) => {
      const p = (c.prices && c.prices['idx_' + ix.replace('.', '')]) || {}, sale = money(p.sale), off = money(p.off);
      return sale ? `<button class="pg-c ${over[i] ? 'is-over' : ''}" ${at(i, ix)}>${off > sale ? `<s class="num">${man(off)}</s>` : ''}<b class="num">${man(sale)}</b></button>` : `<div class="pg-c pg-na">—</div>`;
    }).join('');
  });
  // 옵션표: 브랜드(자이스 · 케미)별 가로 띠 — 위는 옵션 이름, 아래는 추가 금액. 같은 옵션 구성을 쓰는 제품끼리 한 줄로 묶음
  const names = optNames(m); let noteRow = '';
  if (names.length) {
    const groups = new Map();
    cols.forEach(c => {
      const list = names.map(nm => { const o = colOpts(m, c).find(x => x.n === nm); return o && (o.free || o.p) ? o : null; }).filter(Boolean);
      if (!list.length) return;
      const ref = progRef(c), key = ref ? ref.brand : list.map(o => o.n + ':' + o.p).join('|');
      if (!groups.has(key)) groups.set(key, {label: ref ? PROG_REF.label[ref.brand] : '', cols: [], opts: new Map()});
      const gp = groups.get(key); gp.cols.push(c);
      list.forEach(o => { if (!gp.opts.has(o.n)) gp.opts.set(o.n, o); });
    });
    const gname = cs => { const w = cs.map(c => plain(c.name).split(' ')); let k = 0; while (w.every(a => a[k] && a[k] === w[0][k]) && k < w[0].length - 1) k++; return k ? w[0].slice(0, k).join(' ') + ' ' + w.map(a => a.slice(k).join(' ')).join('·') : w.map(a => a.join(' ')).join(' · '); };
    g += `<div class="pg-sec">옵션 · 추가 금액</div><div class="pg-ob">${[...groups.values()].map(gp => `<div class="og"><div class="og__n"><b>${esc(gp.label || gname(gp.cols))}</b>${gp.label ? `<small>${esc(gp.cols.map(c => plain(c.name)).join(' · '))}</small>` : ''}</div><div class="og__c">${[...gp.opts.values()].map(o => `<div class="og__i"><span>${esc(o.n)}${o.tag ? `<em>${esc(o.tag)}</em>` : ''}</span><b class="num ${o.free ? 'pg-free' : ''}">${o.free ? '무상' : '+' + man(o.p)}</b></div>`).join('')}</div></div>`).join('')}</div>`;
    const notes = [...new Set(cols.map(c => (progRef(c) || {}).brand).filter(Boolean))].map(b => PROG_REF.note[b]).filter(Boolean);
    if (notes.length) noteRow = `<div class="pg-note">${notes.map(esc).join('<br>')}</div>`;
  }
  g += `<div class="pg-x">${noteRow}`;
  // 렌즈 특징: 제품별 설명 · 누진대 · 추천 대상 (관리자 입력이 있으면 그 값, 없으면 자이스·케미 자료)
  const refs = cols.map(progRef);
  const lines = (c, r) => { const own = String(c.detail || '').split(/\n+/).map(s => s.trim()).filter(Boolean); return own.length ? own : (r ? r.feats : []); };
  const frow = (label, fn) => `<div class="pg-l pg-fl">${label}</div>` + cols.map((c, i) => { const h = fn(c, refs[i]); return h ? `<button class="pg-c pg-f" ${at(i)}>${h}</button>` : '<div class="pg-c pg-na">—</div>'; }).join('');
  if (cols.some((c, i) => lines(c, refs[i]).length || c.corridor || (refs[i] && refs[i].corridor))) {
    g += `<div class="pg-sec">렌즈 특징</div>`;
    g += frow('특징', (c, r) => { const L = lines(c, r); return L.length ? `<ul>${L.slice(0, 4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''; });
    g += frow('누진대', (c, r) => c.corridor ? esc(/mm/.test(c.corridor) ? c.corridor : plain(c.corridor) + 'mm') : r ? esc(r.corridor) : '');
    if (refs.some(Boolean)) g += frow('추천', (c, r) => r ? esc(r.fit) : '');
  }
  // 시야 비교: ADD 조절 + 같은 등급이 이어진 열은 한 칸으로 합쳐 크게
  g += `<div class="pg-sec pg-vhead"><span>시야 비교</span>
    <label class="pg-addc">ADD<input type="range" class="pg-add" min="0.75" max="3.5" step="0.25" value="${S.add}" aria-label="ADD"><b class="num pg-addv">+${S.add.toFixed(2)}</b></label>
    ${S.power.set ? `<span class="pg-pw num">R ${fmtD(S.power.rs)} / ${fmtD(S.power.rc)} · L ${fmtD(S.power.ls)} / ${fmtD(S.power.lc)}</span>` : ''}
    <span class="pg-key"><i></i>선 안쪽 선명 · 바깥 흐림 (개념도)</span></div>`;
  g += `<div class="pg-l pg-vlab">시야<br>지도</div>`;
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && tiers[j + 1] === tiers[i]) j++;
    const t = TI[tiers[i] - 1];
    g += `<button class="pg-c pg-vc" style="grid-column:span ${j - i + 1}" ${at(i)} aria-label="${t.name} 시야 지도"><span class="pg-vsvg" data-tier="${t.id}">${Sim.progView({}, S.add, t.id)}</span>
      <span class="pg-t pg-t${t.id}">${t.name}</span><small>${t.desc}</small></button>`;
    i = j + 1;
  }
  g += '</div>';
  return `<article class="pgb"><div class="pgb__t"><div><b>${[m.brand, m.name].filter(Boolean).map(esc).join(' · ') || '다초점'}</b>
      <small>제품 · 가격 · 시야 지도를 누르면 상세 정보와 견적을 볼 수 있어요</small></div></div>
    <div class="pgb__s"><div class="pgb__g" style="--n:${n}">${g}</div></div></article>`;
}
const PG = {m: 0, c: 0, idx: null, opts: new Set(), frame: 0};
function openProg(mi, ci, idx) {
  PG.m = mi; PG.c = ci; PG.idx = idx || null; PG.opts = new Set(); PG.frame = 0;
  openSheet(`<div class="sh-h"><h2 id="pg-title"></h2><small id="pg-sub"></small>${X_BTN}</div><div class="sh-b" id="pg-body"></div>`, 'sheet--w');
  renderProg();
}
function renderProg() {
  const m = S.data.matrices[PG.m], c = m && m.cols[PG.c]; if (!c) return closeSheet();
  const prices = FIXED_IDX.map(ix => { const p = (c.prices && c.prices['idx_' + ix.replace('.', '')]) || {}; return {ix, sale: money(p.sale), off: money(p.off)}; }).filter(x => x.sale);
  if (!prices.find(x => x.ix === PG.idx)) PG.idx = (prices[0] || {}).ix || null;
  const tier = tiersFor(m)[PG.c], cur = prices.find(x => x.ix === PG.idx), opts = colOpts(m, c).filter(o => o.p), sc = Sim.progScores(c, tier), tierName = Sim.TIERS[tier - 1].name;
  const optSum = opts.filter(o => PG.opts.has(o.n)).reduce((s, o) => s + o.p, 0), total = (cur ? cur.sale : 0) + optSum + PG.frame;
  const nm = String(c.name).replace(/<br\s*\/?>/gi, ' ');
  $('#pg-title').textContent = nm; $('#pg-sub').textContent = [m.brand, m.name].filter(Boolean).join(' · ');
  const mx = Sim.addMax(c.addInfo), over = mx !== null && S.add > mx + .001;
  const bars = sc.auto ? '' : `<div class="pg-bars">${[['원거리', sc.far], ['중간', sc.mid], ['근거리', sc.near], ['주변 안정', sc.side]].map(([n, v]) => `<div><span>${n}</span><i style="--v:${v}%"></i><b class="num">${Math.round(v)}</b></div>`).join('')}</div>`;
  $('#pg-body').innerHTML = `<div class="dt"><div class="dt__l">
      <div class="eyebrow">${esc(c.brand || m.brand || '')}</div><h3>${escBr(c.name)}</h3>
      <div class="chips" style="margin-bottom:.8rem"><span class="pg-t pg-t${tier}">${tierName}</span>${c.desc ? `<span class="chip">${escBr(c.desc)}</span>` : ''}${c.addInfo ? `<span class="chip chip--g">ADD ${escBr(c.addInfo)}</span>` : ''}${c.corridor ? `<span class="chip chip--g">누진대 ${escBr(c.corridor)}</span>` : ''}${c.isSale ? '<span class="tag tag--sale">SALE</span>' : ''}</div>
      ${c.detail ? `<p style="white-space:pre-line">${esc(c.detail)}</p>` : (progRef(c) ? `<ul class="pg-feat">${progRef(c).feats.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '')}
      <div class="dt__rows">${prices.map(x => `<button class="dr ${x.ix === PG.idx ? 'is-on' : ''}" data-a="pg-idx" data-i="${x.ix}"><span class="row__i num">${x.ix}</span><span class="row__s">${x.off > x.sale ? `<s class="num" style="color:var(--faint);font-size:.78rem">${won(x.off)}</s>` : ''}</span><div class="price"><b class="num">${x.sale.toLocaleString()}<i>원</i></b></div></button>`).join('')}</div>
      ${opts.length ? `<div class="lh" style="margin:1rem 0 .4rem">옵션 선택</div><div class="dt__rows">${opts.map(o => `<button class="dr ${PG.opts.has(o.n) ? 'is-on' : ''}" data-a="pg-opt" data-n="${esc(o.n)}"><span class="row__i">${PG.opts.has(o.n) ? ICON.check : ICON.plus}</span><span class="row__s">${esc(o.n)}</span><div class="price"><b class="num">+${o.p.toLocaleString()}<i>원</i></b></div></button>`).join('')}</div>` : ''}
    </div><div class="dt__r">
      <div class="dt__bar"><div class="seg" style="visibility:hidden"></div>${addChips()}</div>
      ${over ? `<div class="sum sum--w">이 제품의 ADD 범위(${esc(c.addInfo)})를 넘는 값입니다.</div>` : ''}
      <div class="pg-big">${Sim.progView(c, S.add, tier, {labels: true})}
        <button class="btn btn--accent btn--s pg-3d" data-a="pg-3d" data-t="${tier}"><em class="b3d">3D</em>안경 쓴 시점으로 보기</button><div class="pg-legend"><span>위쪽 · 원거리</span><span>가운데 · 중간</span><span>아래쪽 · 근거리</span></div></div>${bars}
      <p class="tk-foot"><b>${tierName}</b> 기준의 개념도입니다${[1, 2, 3, 4].includes(Number(c.tier)) ? '' : ' (같은 표 안의 가격 순위로 자동 분류)'}. 선 안쪽이 선명한 영역이고, 선 바깥의 흐린 부분은 렌즈 가장자리의 왜곡 영역입니다. 실제 느낌은 개인차가 있습니다.</p>
      <div class="est" style="margin-top:1rem">
        <div class="est__r"><span>안경테 (선택 입력)</span><input id="pg-frame" class="num" inputmode="numeric" placeholder="0" value="${PG.frame || ''}"></div>
        <div class="est__t"><span>${cur ? `렌즈 ${cur.ix}` : '렌즈'}${optSum ? ` + 옵션 ${PG.opts.size}개` : ''}${PG.frame ? ' + 안경테' : ''}</span><b class="num" id="pg-total">${won(total)}</b></div></div></div></div>`;
  const f = $('#pg-frame'); if (f) f.addEventListener('input', () => { PG.frame = money(f.value); const t = (cur ? cur.sale : 0) + optSum + PG.frame; $('#pg-total').textContent = won(t); });
}
function mediaCard(i) {
  const url = safeUrl(i.url); if (!url) return '';
  if (/prog-simul/.test(url) && S.data.matrices.some(m => m.tabId === i.tabId)) return '';   // 다초점 보드에 시야 지도가 들어와서 예전 시뮬레이터 카드는 숨김
  if (i.cardType === 'iframe') return `<div class="media"><iframe src="${esc(url)}" loading="lazy" scrolling="no" style="height:${Math.max(200, Number(i.height) || 600)}px"></iframe></div>`;
  return `<div class="media"><img src="${esc(url)}" alt="" loading="lazy" decoding="async"></div>`;
}
function renderTray() {
  const el = $('#tray');
  if (!S.cmp.length) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="tray__l">비교 ${S.cmp.length}/3</span><div class="tray__c">${S.cmp.map(k => `<button data-a="cmp" data-k="${esc(k)}">${esc(S.byKey[k].name)}${ICON.x}</button>`).join('')}</div>
    <button class="btn btn--p" data-a="cmp-go" ${S.cmp.length < 2 ? 'disabled style="opacity:.45"' : ''}>${S.cmp.length < 2 ? '2개 이상 담아 주세요' : '비교하기'}</button>`;
}
function renderAll() { renderRail(); renderHead(); renderMain(); renderTray(); }

/* ═════════ 시트(모달) ═════════ */
let onSheetClose = null;
function openSheet(html, cls = '', onClose = null) {
  const sh = $('#sheet'); sh.className = 'sheet ' + cls; sh.innerHTML = html; $('#scrim').hidden = false; onSheetClose = onClose; return sh;
}
function closeSheet() {
  if ($('#scrim').hidden) return;
  $('#scrim').hidden = true; $('#sheet').innerHTML = '';
  if (onSheetClose) { onSheetClose(); onSheetClose = null; }
}
const X_BTN = `<button class="btn btn--x" data-a="close" aria-label="닫기">${ICON.x}</button>`;
function openFrame(title, url, designW) {
  const sh = openSheet(`<div class="sh-h"><h2>${esc(title)}</h2>${X_BTN}</div><div class="sh-b sh-b--f"><iframe src="${esc(url)}" title="${esc(title)}"></iframe></div>`, 'sheet--full', () => removeEventListener('resize', fit));
  const box = $('.sh-b--f', sh), fr = $('iframe', box);
  function fit() {
    if (!designW) return;
    const s = Math.min(1, box.clientWidth / designW);
    fr.style.width = designW + 'px'; fr.style.height = (box.clientHeight / s) + 'px'; fr.style.transform = `scale(${s})`; fr.style.transformOrigin = '0 0';
  }
  fit(); addEventListener('resize', fit);
}

/* ───── 고객 도수 입력 ───── */
const PW = {w: null, field: 'rs', buf: null, neg: true, link: false, age: 'none', issue: 'none'};
const PW_ORDER = ['rs', 'rc', 'ls', 'lc'], PW_LIM = {rs: [-20, 12], ls: [-20, 12], rc: [-8, 0], lc: [-8, 0]};
const isC = f => f === 'rc' || f === 'lc';
function openPower() {
  PW.w = {rs: S.power.rs, rc: S.power.rc, ls: S.power.ls, lc: S.power.lc};
  PW.field = 'rs'; PW.buf = null; PW.neg = PW.w.rs <= 0; PW.link = false; PW.age = S.age; PW.issue = S.issue;
  openSheet(`<div class="sh-h"><h2>고객 정보</h2><small>도수를 입력하면 제작 가능한 렌즈와 권장 두께가 바로 반영됩니다</small>${X_BTN}</div>
    <div class="sh-b" id="pw-body"></div>
    <div class="sh-f"><button class="btn btn--line" data-a="pw-clear">모두 지우기</button><button class="btn btn--p" data-a="pw-apply">적용하기</button></div>`);
  renderPower();
}
function pwText(f) {
  if (PW.field === f && PW.buf !== null) return (isC(f) || PW.neg ? '−' : '+') + (PW.buf || '0');
  return fmtD(PW.w[f]) || '0.00';
}
function renderPower() {
  const fld = (f, lab, sub) => `<div class="fld"><label><b>${lab}</b>${sub}</label>
    <button class="fn2" data-a="pw-nudge" data-f="${f}" data-d="-0.25" aria-label="0.25 감소">−</button>
    <button class="fv num ${PW.field === f ? 'is-on' : ''} ${PW.field === f && PW.buf !== null ? 'is-buf' : ''}" data-a="pw-focus" data-f="${f}">${pwText(f)}</button>
    <button class="fn2" data-a="pw-nudge" data-f="${f}" data-d="0.25" aria-label="0.25 증가">+</button></div>`;
  const fr = [['.00', 0], ['.25', .25], ['.50', .5], ['.75', .75]].map(([t, v]) => `<button class="num" data-a="pw-frac" data-v="${v}">${t}</button>`).join('');
  $('#pw-body').innerHTML = `<div class="pw"><div>
    <div class="pw__eyes"><div class="pw__eye"><h4>R · 오른쪽</h4>${fld('rs', 'S', '구면')}${fld('rc', 'C', '난시')}</div>
      <div class="pw__eye"><h4>L · 왼쪽</h4>${fld('ls', 'S', '구면')}${fld('lc', 'C', '난시')}</div></div>
    <div class="pw__link"><button class="tog" data-a="pw-link" aria-pressed="${PW.link}" aria-label="양안 동일"></button>양안 도수 동일 <span style="font-weight:500;color:var(--muted)">(R 입력을 L에 복사)</span></div>
    <div class="pw__g"><h4>연령대</h4><div class="chips">${AGES.map(a => `<button class="opt ${PW.age === a.id ? 'is-on' : ''}" data-a="pw-age" data-v="${a.id}">${a.n}</button>`).join('')}</div></div>
    <div class="pw__g"><h4>불편 증상</h4><div class="chips">${S.data.issues.map(i => `<button class="opt ${PW.issue === i.id ? 'is-on' : ''}" data-a="pw-issue" data-v="${esc(i.id)}">${esc(i.name)}</button>`).join('')}</div></div></div>
    <div><div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="num" data-a="pw-digit" data-v="${n}">${n}</button>`).join('')}
      <button class="f ${!isC(PW.field) && PW.neg ? 'is-on' : ''}" data-a="pw-sign" ${isC(PW.field) ? 'disabled style="opacity:.35"' : ''}>+ / −</button>
      <button class="num" data-a="pw-digit" data-v="0">0</button><button class="f" data-a="pw-back">지움</button>
      <div class="sp">소수점 선택 → 다음 칸으로 자동 이동</div><div class="fr">${fr}</div></div>
      <p class="pw__n">예) −4.50 → <b>4</b> 누르고 <b>.50</b><br>난시(C)는 마이너스 표기만 사용합니다.</p></div></div>`;
}
function pwSet(f, v) {
  const [lo, hi] = PW_LIM[f]; v = Math.max(lo, Math.min(hi, Math.round(v * 4) / 4)); PW.w[f] = v === 0 ? 0 : v;
  if (PW.link && (f === 'rs' || f === 'rc')) PW.w[{rs: 'ls', rc: 'lc'}[f]] = PW.w[f];
}
function pwFocus(f) { PW.field = f; PW.buf = null; PW.neg = isC(f) ? true : PW.w[f] <= 0; renderPower(); }
function pwAction(a, t) {
  const f = PW.field;
  switch (a) {
    case 'pw-focus': return pwFocus(t.dataset.f);
    case 'pw-nudge': pwSet(t.dataset.f, PW.w[t.dataset.f] + Number(t.dataset.d)); PW.field = t.dataset.f; PW.buf = null; return renderPower();
    case 'pw-digit': { let b = PW.buf ?? ''; if (b.length < 2) b = (b === '0' ? '' : b) + t.dataset.v; PW.buf = b; return renderPower(); }
    case 'pw-sign': if (isC(f)) return; PW.neg = !PW.neg; if (PW.buf === null) pwSet(f, -PW.w[f]); return renderPower();
    case 'pw-back': if (PW.buf) PW.buf = PW.buf.slice(0, -1) || null; else pwSet(f, 0); return renderPower();
    case 'pw-frac': {
      const ip = PW.buf !== null ? parseInt(PW.buf || '0', 10) : Math.trunc(Math.abs(PW.w[f])), mag = ip + Number(t.dataset.v);
      pwSet(f, (isC(f) || PW.neg) ? -mag : mag);
      const order = PW.link ? ['rs', 'rc'] : PW_ORDER;
      return pwFocus(order[Math.min(order.indexOf(f) + 1, order.length - 1)]);
    }
    case 'pw-link': PW.link = !PW.link; if (PW.link) { PW.w.ls = PW.w.rs; PW.w.lc = PW.w.rc; } return renderPower();
    case 'pw-age': PW.age = t.dataset.v; return renderPower();
    case 'pw-issue': PW.issue = t.dataset.v; return renderPower();
    case 'pw-clear': PW.w = {rs: 0, rc: 0, ls: 0, lc: 0}; PW.age = 'none'; PW.issue = 'none'; PW.field = 'rs'; PW.buf = null; PW.neg = true; return renderPower();
    case 'pw-apply':
      S.power = {...PW.w, set: !!(PW.w.rs || PW.w.rc || PW.w.ls || PW.w.lc)}; S.age = PW.age; S.issue = PW.issue;
      if (hasProfile()) S.tab = 'rec'; else if (S.tab === 'rec') S.tab = (visibleTabs()[0] || {}).id;
      store.set('tab', S.tab); closeSheet(); renderAll(); $('#scroll').scrollTop = 0;
  }
}

/* ───── 렌즈 상세 (두께 · 견적) ───── */
const DT = {key: null, idx: null, view: 'tk', eye: 'R', size: 'mid', frame: 0, etc: 0};
function openDetail(key, idx) {
  DT.key = key; DT.idx = idx; DT.view = 'tk'; DT.eye = S.power.set ? worstEye() : 'R';
  openSheet(`<div class="sh-h"><h2 id="dt-title"></h2><small id="dt-sub"></small>${X_BTN}</div><div class="sh-b" id="dt-body"></div>`, 'sheet--w');
  renderDetail();
}
function lensRows(l) {
  return l.items.map(it => ({idx: it.idx, n: parseFloat(it.idx), spec: it.spec, price: money(it.pSale), off: money(it.pOff), st: rowState(it)}))
    .filter(x => x.price > 0 && x.n > 1.4 && x.n < 1.8).sort((a, b) => a.n - b.n);
}
function renderDetail() {
  const l = S.byKey[DT.key]; if (!l) return closeSheet();
  const rows = lensRows(l), cur = rows.find(r => String(r.idx) === String(DT.idx)) || rows[0];
  const ep = eyePw(DT.eye), P = Sim.eff(ep.s, ep.c), r = FRAME[DT.size].r;
  $('#dt-title').textContent = `${l.brandName} ${l.name}`; $('#dt-sub').textContent = l.desc || '';
  const cp = lensCopy(l);
  const left = `<div class="dt__l"><div class="eyebrow">${esc(l.brandName)}</div><h3>${esc(l.name)}</h3>${cp ? `<ul class="pg-feat">${cp.feats.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : l.desc ? `<p>${esc(l.desc)}</p>` : ''}
    <div class="dt__rows">${rows.map(x => {
      const rec = S.power.set && x.st === 'ok' && Math.abs(x.n - recMinIndex()) < .02;
      return `<button class="dr ${cur && x.idx === cur.idx ? 'is-on' : ''} ${x.st === 'out' ? 'is-out' : ''}" ${x.st === 'ok' ? `data-a="dt-idx" data-i="${esc(x.idx)}"` : 'tabindex="-1"'}>
        <span class="row__i num">${esc(x.idx)}</span><span class="row__s">${esc((x.spec || '').replace(/<br\s*\/?>/gi, ' '))}${rec ? '<span class="rec-tag">권장</span>' : ''}</span>
        <div class="price">${x.st === 'ok' ? `<b class="num">${x.price.toLocaleString()}<i>원</i></b>` : '<b>범위 초과</b>'}</div></button>`;
    }).join('')}</div>${optBlock(l)}${rangeFor(l, cur && cur.idx)}</div>`;
  const eyeSeg = S.power.set ? `<div class="seg">${['R', 'L'].map(e => `<button class="${DT.eye === e ? 'is-on' : ''}" data-a="dt-eye" data-v="${e}">${e === 'R' ? '오른쪽 R' : '왼쪽 L'}</button>`).join('')}</div>` : '';
  const views = `<div class="seg">${[['tk', '두께'], ['est', '견적']].map(([k, n]) => `<button class="${DT.view === k ? 'is-on' : ''}" data-a="dt-view" data-v="${k}">${n}</button>`).join('')}</div>`;
  const sum = ep.sample
    ? `<div class="sum sum--w"><b>예시 도수 ${fmtD(ep.s)} 기준</b>입니다. 고객 도수를 입력하면 실제 도수로 계산됩니다. <button class="btn btn--line" style="min-height:2rem;padding:0 .7rem;margin-left:.4rem" data-a="power-from-detail">도수 입력</button></div>`
    : `<div class="sum">${DT.eye} 눈 <b class="num">S ${fmtD(ep.s)} / C ${fmtD(ep.c)}</b>${DT.view === 'tk' ? ` → 가장 두꺼운 방향 <b class="num">${fmtD(P)} D</b> 기준` : ''}</div>`;
  let body = '';
  if (DT.view === 'tk') {
    body = `<div class="dt__bar">${views}${eyeSeg}<div class="seg">${Object.entries(FRAME).map(([k, v]) => `<button class="${DT.size === k ? 'is-on' : ''}" data-a="dt-size" data-v="${k}">${v.label}</button>`).join('')}</div></div>${sum}
      ${Sim.thicknessHTML({P, r, hi: cur && cur.idx, rows: rows.map(x => ({...x}))})}
      <div class="bar-3d"><button class="btn btn--accent btn--s" data-a="tk-3d" data-s="${ep.s}" data-c="${ep.c}" data-i="${cur ? esc(cur.idx) : ''}" data-l="${rows.slice(0, 4).map(x => x.n).join(',')}"><em class="b3d">3D</em>돌려 보기</button></div>
      <p class="tk-foot">단순화한 계산 모델입니다 (중심 ${Sim.CT}mm${P > 0 ? ` / 가장자리 ${Sim.ET}mm` : ''} 기준, 렌즈 반경 ${r}mm). 실제 두께는 프레임 형태·편심·렌즈 설계에 따라 달라지므로 상담 참고용으로 사용하세요.</p>`;
  } else {
    const lensP = cur && cur.st === 'ok' ? cur.price : 0, total = lensP + DT.frame + DT.etc;
    body = `<div class="dt__bar">${views}</div><div class="est">
      <div class="est__r"><span>렌즈 · ${esc(l.name)} ${cur ? esc(cur.idx) : ''}</span><b class="num">${won(lensP)}</b></div>
      <div class="est__r"><span>안경테</span><input id="est-frame" class="num" inputmode="numeric" placeholder="0" value="${DT.frame || ''}"></div>
      <div class="est__r"><span>기타 (착색·코팅 등)</span><input id="est-etc" class="num" inputmode="numeric" placeholder="0" value="${DT.etc || ''}"></div>
      <div class="est__t"><span>예상 금액</span><b class="num" id="est-total">${won(total)}</b></div></div>
      <p class="tk-foot">제품 가격은 가격표 기준이며, 안경테 · 추가 옵션은 직접 입력한 금액입니다. 최종 금액은 상담 시 확정됩니다.</p>`;
  }
  $('#dt-body').innerHTML = `<div class="dt">${left}<div class="dt__r">${body}</div></div>`;
  if (DT.view === 'est') {
    const upd = () => { DT.frame = money($('#est-frame').value); DT.etc = money($('#est-etc').value); $('#est-total').textContent = won((cur && cur.st === 'ok' ? cur.price : 0) + DT.frame + DT.etc); };
    ['#est-frame', '#est-etc'].forEach(s => $(s).addEventListener('input', upd));
  }
}

/* ───── 렌즈 비교: 가격 + 설계 · 특징 · 제작 범위 · 왜곡 경향까지 ───── */
function designOf(l) {                                 // 사양 문구로 설계 단계를 추정 (왜곡 미리보기용)
  const t = l.items.map(i => i.spec || '').join(' ') + ' ' + (l.name || '');
  if (/개인|i\.?scription|맞춤/i.test(t)) return {name: '개인맞춤', g: .26};
  if (/양면/.test(t)) return {name: '양면비구면', g: .36};
  if (/아토릭|atoric/i.test(t)) return {name: '아토릭', g: .45};
  if (/비구면/.test(t)) return {name: '비구면', g: .6};
  if (/구면/.test(t)) return {name: '구면', g: 1};
  return null;
}
const featChips = s => String(s || '').split(/\s*(?:\+|,|·|\/| 및 )\s*/).map(x => x.trim()).filter(x => x && x.length <= 28);
function rangeOf(l) {
  const its = l.items.filter(i => money(i.pSale) > 0), pick = (k, f) => { const v = its.map(i => numOrNull(i[k])).filter(x => x !== null); return v.length ? f(...v) : null; };
  return {sMin: pick('sMin', Math.min), sMax: pick('sMax', Math.max), cMin: pick('cMin', Math.min)};
}
function openCompare() {
  const ls = S.cmp.map(k => S.byKey[k]).filter(Boolean); if (ls.length < 2) return;
  const ep = eyePw(S.power.set ? worstEye() : 'R'), P = Sim.eff(ep.s, ep.c), r = FRAME.mid.r, rec = S.power.set ? recMinIndex() : null;
  const idxs = [...new Set(ls.flatMap(l => lensRows(l).map(x => x.idx)))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const cell = (l, idx) => {
    const x = lensRows(l).find(y => y.idx === idx);
    if (!x) return '<span class="x">—</span>';
    if (x.st === 'out') return '<span class="x">범위 초과</span>';
    return `<b class="num">${won(x.price)}</b>${x.off > x.price ? `<small class="num"><s>${won(x.off)}</s></small>` : ''}`;
  };
  const thick = idx => Math.abs(P) < .5 ? '' : `<small>${P < 0 ? '가장자리' : '중심'} ${(P < 0 ? Sim.thickAt(P, parseFloat(idx), r, r) : Sim.thickAt(P, parseFloat(idx), 0, r)).toFixed(1)}mm</small>`;
  const best = idx => { const v = ls.map(l => { const x = lensRows(l).find(y => y.idx === idx); return x && x.st === 'ok' ? x.price : Infinity; }); const m = Math.min(...v); return v.map(p => p === m && m !== Infinity && v.filter(q => q !== Infinity).length > 1); };
  const pos = v => Math.max(0, Math.min(100, (v + 12) / 20 * 100));    // 제작 범위 막대: −12 ~ +8 공통 눈금
  const rangeBar = l => {
    const g = rangeOf(l), a = g.sMin ?? -12, b = g.sMax ?? 8;
    const marks = S.power.set ? [['R', S.power.rs], ['L', S.power.ls]].map(([e, v]) => `<i class="cp-mk ${v < a || v > b ? 'is-out' : ''}" style="left:${pos(v)}%" title="${e} ${fmtD(v)}">${e}</i>`).join('') : '';
    return `<div class="cp-rg"><div class="cp-rg__bar"><span style="left:${pos(a)}%;right:${100 - pos(b)}%"></span><i class="cp-zero" style="left:${pos(0)}%"></i>${marks}</div>
      <div class="cp-rg__t num">S ${g.sMin === null ? '제한 없음' : fmtD(g.sMin)} ~ ${g.sMax === null ? '제한 없음' : fmtD(g.sMax)}${g.cMin !== null ? ` · 난시 ${fmtD(g.cMin)}까지` : ''}</div></div>`;
  };
  const maxOff = l => Math.max(0, ...l.items.map(i => { const o = money(i.pOff), s = money(i.pSale); return o > s && s ? Math.round((1 - s / o) * 100) : 0; }));
  const recCell = l => { const rows = lensRows(l).filter(x => x.st === 'ok'), x = rows.find(y => y.n >= rec - .001) || rows[rows.length - 1]; return x ? `<b class="num">${won(x.price)}</b><small>굴절률 ${esc(x.idx)}</small>` : '<span class="x">제작 불가</span>'; };
  const recBest = (() => { if (!rec) return []; const v = ls.map(l => { const rows = lensRows(l).filter(x => x.st === 'ok'), x = rows.find(y => y.n >= rec - .001) || rows[rows.length - 1]; return x ? x.price : Infinity; }); const m = Math.min(...v); return v.map(p => p === m && m !== Infinity); })();
  const head = ls.map(l => `<th><span class="cp-sw" style="background:${lensStripe(l.bgColor)}"></span><b>${esc(l.name)}</b><span>${esc(l.brandName)}</span></th>`).join('');
  const badges = l => {
    const d = designOf(l), mo = maxOff(l), av = lensAvail(l);
    return `<div class="cp-bd">${d ? `<span class="chip">${d.name}</span>` : ''}${l.isSale ? '<span class="tag tag--sale">SALE</span>' : ''}${mo ? `<span class="chip chip--w">최대 −${mo}%</span>` : ''}
      ${S.power.set ? (av === 'ok' ? '<span class="chip chip--g">이 도수 제작 가능</span>' : '<span class="chip chip--w">이 도수 제작 어려움</span>') : ''}</div>`;
  };
  const heatCell = l => { const d = designOf(l); return d ? `<img class="cp-heat" src="${Sim.heatThumb(P, ep.c, d.g, 140)}" alt="${d.name} 왜곡 경향"><small>${d.name} 설계</small>` : '<span class="x">설계 정보 없음</span>'; };
  openSheet(`<div class="sh-h"><h2>렌즈 비교</h2><small>${ep.sample ? `예시 도수 ${fmtD(ep.s)} 기준` : `${worstEye()} 눈 ${fmtD(ep.s)} / ${fmtD(ep.c)} 기준`} · 초록색은 가장 낮은 가격</small>${X_BTN}</div>
    <div class="sh-b"><table class="cp"><thead><tr><th></th>${head}</tr></thead><tbody>
      <tr><td>한눈에</td>${ls.map(l => `<td>${badges(l)}</td>`).join('')}</tr>
      <tr><td>주변부 왜곡<small>설계 기준 개념도</small></td>${ls.map(l => `<td>${heatCell(l)}</td>`).join('')}</tr>
      <tr><td>특징</td>${ls.map(l => `<td><div class="cp-ft">${featChips(l.desc).map(f => `<span>${esc(f)}</span>`).join('') || '<span class="x">—</span>'}</div></td>`).join('')}</tr>
      <tr><td>제작 범위<small>−12 ~ +8 눈금${S.power.set ? ' · R/L 고객 도수' : ''}</small></td>${ls.map(l => `<td>${rangeBar(l)}</td>`).join('')}</tr>
      ${rec ? `<tr class="cp-rec"><td>고객 권장<small>굴절률 ${rec.toFixed(2)} 이상</small></td>${ls.map((l, i) => `<td class="${recBest[i] ? 'best' : ''}">${recCell(l)}</td>`).join('')}</tr>` : ''}
      <tr class="cp-sep"><td colspan="${ls.length + 1}">굴절률별 가격</td></tr>
      ${idxs.map(idx => { const b = best(idx); return `<tr><td class="num">굴절률 ${esc(idx)}${thick(idx)}</td>${ls.map((l, i) => `<td class="${b[i] ? 'best' : ''}">${cell(l, idx)}</td>`).join('')}</tr>`; }).join('')}
      </tbody></table>
      <p class="tk-foot">주변부 왜곡은 사양 문구(구면 · 비구면 · 양면비구면 · 아토릭 · 개인맞춤)로 추정한 개념도입니다. 두께는 굴절률에 따른 계산값으로 제품과 관계없이 같습니다.</p></div>
    <div class="sh-f"><button class="btn btn--line" data-a="cmp-clear">비교 목록 비우기</button><button class="btn btn--p" data-a="close">닫기</button></div>`, 'sheet--w');
}

/* ───── 시뮬레이션 랩 ───── */
const LAB_MODES = [
  {id: 'vz', n: '선명도 비교', d: '안경 없이 · 현재 안경 → 새 안경', ctl: true},
  {id: 'tk', n: '렌즈 두께', d: '단면 · 3D로 돌려 보기', ctl: true, has3d: true},
  {id: 'rf', n: '굴절 원리', d: '근시 · 원시 · 난시', ctl: false, hide: true},          // hide: 목록에서만 뺌 (코드는 남겨 둠)
  {id: 'dz', n: '설계별 왜곡', d: '왜곡 지도 · 글자판', ctl: true},
  {id: 'lb', n: '왜곡 글자판', d: '렌즈 너머 글자 보기', ctl: true, hide: true},          // 설계별 왜곡 탭 안으로 합침
  {id: 'gl', n: '빛번짐', d: '코마 · 트레포일 · 구면 수차', ctl: false},
  {id: 'my', n: '근시 억제', d: '성장기 원리', ctl: false, hide: true},                 // 어린이 근시 분류 하단에 있음
  {id: 'tn', n: '선글라스 · 변색', d: '틴트 · 변색 · 편광 비교', ctl: false},
  {id: 'bl', n: '블루라이트', d: '코팅 반사 · 소재 흡수', ctl: false, hide: true},        // 단초점 하단 그림과 중복
  {id: 'an', n: '양안 도수차', d: '좌우 이미지 크기 차이', ctl: false, hide: true},
  {id: 'p3', n: '다초점 렌즈', d: '안경 쓴 시점으로 보기', ctl: false, is3d: true},
  {id: 'of', n: '오피스 렌즈', d: '모니터 · 서류 · 휴대폰', ctl: false, is3d: true}
];
const LAB = {mode: 'vz', dzv: 'map', s: -3, c: -0.75, size: 'mid', split: 50, h: null, tier: 1, hi: null, tok: 0, tk3d: false, vzc: 'bare', os: null, oc: null};
let sim3dLoad = null;                                   // 3D 모듈은 처음 열 때만 불러옴
const load3D = () => sim3dLoad || (sim3dLoad = import('./sim3d.js').catch(e => { sim3dLoad = null; throw e; }));
function openLab(mode, o = {}) {
  if (S.power.set) { const e = eyePw(worstEye()); LAB.s = e.s; LAB.c = e.c; }
  if (o.s !== undefined) { LAB.s = o.s; LAB.c = o.c; }
  LAB.tier = o.tier || LAB.tier; LAB.hi = o.hi || null; LAB.idx = o.idx || null;
  if (o.tk3d !== undefined) LAB.tk3d = o.tk3d;
  LAB.mode = mode || LAB.mode;
  openSheet(`<div class="sh-h"><h2>시뮬레이션</h2><small>눈과 렌즈의 원리를 눈으로 확인합니다</small>${X_BTN}</div><div class="sh-b"><div class="lab">
    <div class="lab__nav" id="lab-nav"></div><div class="lab__main"><div id="lab-ctl"></div><div id="lab-view"></div></div></div></div>`, 'sheet--w', () => { if (LAB.h && LAB.h.destroy) LAB.h.destroy(); LAB.h = null; });
  renderLab();
}
function renderLab() {
  const m = LAB_MODES.find(x => x.id === LAB.mode);
  $('#lab-nav').innerHTML = LAB_MODES.filter(x => !x.hide).map(x =>`<button class="${x.id === LAB.mode ? 'is-on' : ''}" data-a="lab-mode" data-v="${x.id}"><b>${x.n}${x.is3d || x.has3d ? ' <em class="b3d">3D</em>' : ''}</b><span>${x.d}</span></button>`).join('');
  $('#lab-ctl').innerHTML = m.ctl ? `<div class="lab__ctl">
      <div>${S.power.set ? `<div class="seg"><button data-a="lab-load" data-v="R">R 눈 도수</button><button data-a="lab-load" data-v="L">L 눈 도수</button></div>` : '<span class="chip chip--w">고객 도수 없음 · 직접 조절</span>'}</div>
      <div class="sl"><label>${m.id === 'vz' ? '새 안경 · ' : ''}구면 S <b class="num" id="lab-sv"></b></label><input type="range" id="lab-s" min="-12" max="6" step="0.25"></div>
      <div class="sl"><label>${m.id === 'vz' ? '새 안경 · ' : ''}난시 C <b class="num" id="lab-cv"></b></label><input type="range" id="lab-c" min="-4" max="0" step="0.25"></div></div>` : '';
  if (m.ctl) {
    const sl = $('#lab-s'), cl = $('#lab-c'); sl.value = LAB.s; cl.value = LAB.c; labLabels();
    const on = () => { LAB.s = Number(sl.value); LAB.c = Number(cl.value); labLabels(); labUpdate(); };
    sl.addEventListener('input', on); cl.addEventListener('input', on);
  }
  if (LAB.h && LAB.h.destroy) LAB.h.destroy(); LAB.h = null;
  const v = $('#lab-view');
  if (LAB.mode === 'vz') labVision();
  else if (LAB.mode === 'dz') labDesign();
  else if (LAB.mode === 'rf') LAB.h = Sim.mountRefraction(v);
  else if (LAB.mode === 'my') LAB.h = Sim.mountMyopia(v);
  else if (LAB.mode === 'lb') LAB.h = Sim.mountLetterBoard(v, {s: LAB.s, c: LAB.c});
  else if (LAB.mode === 'gl') LAB.h = Sim.mountGlare(v);
  else if (LAB.mode === 'tn') LAB.h = Sim.mountTint(v);
  else if (LAB.mode === 'bl') LAB.h = Sim.mountBlue(v);
  else if (LAB.mode === 'an') LAB.h = Sim.mountAniso(v, S.power.set ? {r: S.power.rs, l: S.power.ls} : {});
  else if (m.is3d) {
    const mode = LAB.mode, tok = ++LAB.tok;
    v.innerHTML = '<div class="sim-note">3D 화면을 불러오는 중…</div>';
    load3D().then(M => {
      if (tok !== LAB.tok || !document.body.contains(v)) return;
      LAB.h = mode === 'p3' ? M.mountProg3D(v, {tier: LAB.tier, add: S.add}) : M.mountOffice(v);
    }).catch(() => { if (tok === LAB.tok) v.innerHTML = FAIL_3D; });
  }
  else labThick();
}
/* 설계별 왜곡: 왜곡 지도 ↔ 렌즈 너머 글자판 (두 탭을 하나로) */
function labDesign() {
  if (LAB.h && LAB.h.destroy) LAB.h.destroy(); LAB.h = null;
  $('#lab-view').innerHTML = `<div class="dt__bar"><div class="seg">${[['map', '왜곡 지도'], ['text', '글자판']].map(([k, n]) => `<button class="${LAB.dzv === k ? 'is-on' : ''}" data-a="lab-dzv" data-v="${k}">${n}</button>`).join('')}</div></div><div id="dz-body"></div>`;
  LAB.h = (LAB.dzv === 'text' ? Sim.mountLetterBoard : Sim.mountDistortion)($('#dz-body'), {s: LAB.s, c: LAB.c});
}
const FAIL_3D ='<div class="sim-note"><b>3D 화면을 불러오지 못했습니다.</b><br>인터넷 연결을 확인해 주세요.</div>';
function labLabels() { $('#lab-sv').textContent = fmtD(LAB.s); $('#lab-cv').textContent = fmtD(LAB.c); }
/* 선명도 비교: 안경 없이 ↔ 새 안경, 또는 현재 안경 ↔ 새 안경 (현재 안경 도수는 이 화면에서만 입력) */
function vzParams() {
  const old = LAB.vzc === 'old', q = v => Math.round(v * 4) / 4;
  if (old && LAB.os === null) { LAB.os = q(LAB.s < 0 ? Math.min(0, LAB.s + .75) : Math.max(0, LAB.s - .75)); LAB.oc = q(Math.min(0, LAB.c + .25)); }   // 처음엔 '조금 덜 맞는 안경'으로 시작
  const rs = old ? LAB.s - LAB.os : LAB.s, rc = old ? LAB.c - LAB.oc : LAB.c, tiny = Math.abs(rs) < .25 && Math.abs(rc) < .25;
  const note = old
    ? `현재 안경 <b class="num">S ${fmtD(LAB.os)} / C ${fmtD(LAB.oc)}</b> → 새 안경 <b class="num">S ${fmtD(LAB.s)} / C ${fmtD(LAB.c)}</b> · 차이 <b class="num">S ${fmtD(rs)} / C ${fmtD(rc)}</b><br>${tiny ? '도수 차이가 거의 없어 바꿔도 큰 변화는 느끼기 어려워요.' : '왼쪽처럼 덜 보이던 것이 새 안경으로 오른쪽처럼 선명해져요.'} <small>가운데 선을 끌어 비교해 보세요. 개념 이미지입니다.</small>`
    : `새 안경 도수 <b class="num">S ${fmtD(LAB.s)} / C ${fmtD(LAB.c)}</b> 기준 · 안경 없이 보던 모습과 새 안경을 쓴 모습입니다. <small>가운데 선을 끌어 비교해 보세요. 개념 이미지입니다.</small>`;
  return {s: rs, c: rc, left: old ? '현재 안경' : '안경 없이', right: '새 안경', note};
}
function labVision() {
  if (LAB.h && LAB.h.destroy) LAB.h.destroy(); LAB.h = null;
  const old = LAB.vzc === 'old', p = vzParams();
  $('#lab-view').innerHTML = `<div class="dt__bar"><div class="seg">${[['bare', '안경 없이 ↔ 새 안경'], ['old', '현재 안경 ↔ 새 안경']].map(([k, n]) => `<button class="${LAB.vzc === k ? 'is-on' : ''}" data-a="lab-vzc" data-v="${k}">${n}</button>`).join('')}</div></div>
    ${old ? `<div class="lab__ctl lab__ctl--old"><div><span class="chip">지금 쓰는 안경</span></div>
      <div class="sl"><label>현재 안경 · 구면 S <b class="num" id="vz-osv"></b></label><input type="range" id="vz-os" min="-12" max="6" step="0.25" value="${LAB.os}"></div>
      <div class="sl"><label>현재 안경 · 난시 C <b class="num" id="vz-ocv"></b></label><input type="range" id="vz-oc" min="-4" max="0" step="0.25" value="${LAB.oc}"></div></div>` : ''}
    <div id="vz-sim"></div>`;
  if (old) {
    const so = $('#vz-os'), co = $('#vz-oc'), lb = () => { $('#vz-osv').textContent = fmtD(LAB.os); $('#vz-ocv').textContent = fmtD(LAB.oc); };
    const on = () => { LAB.os = +so.value; LAB.oc = +co.value; lb(); if (LAB.h) LAB.h.update(vzParams()); };
    lb(); so.addEventListener('input', on); co.addEventListener('input', on);
  }
  LAB.h = Sim.mountVision($('#vz-sim'), {...p, split: LAB.split, onSplit: x => { LAB.split = x; }});
}
/* 렌즈 두께: 2D 단면 ↔ 3D 돌려 보기 전환 (상세창에서 열면 그 제품의 굴절률로) */
function labThick() {
  if (LAB.h && LAB.h.destroy) LAB.h.destroy(); LAB.h = null;
  const P = Sim.eff(LAB.s, LAB.c), r = FRAME[LAB.size].r, tok = ++LAB.tok;
  const idx = LAB.idx || (LAB.tk3d ? [1.50, 1.60, 1.67, 1.74] : [1.50, 1.56, 1.60, 1.67, 1.74]);
  $('#lab-view').innerHTML = `<div class="dt__bar"><div class="seg">${[[false, '2D 단면'], [true, '3D 돌려 보기']].map(([k, n]) => `<button class="${LAB.tk3d === k ? 'is-on' : ''}" data-a="lab-tk3d" data-v="${k ? 1 : 0}">${k ? '<em class="b3d">3D</em>' : ''}${n}</button>`).join('')}</div>
      <div class="seg">${Object.entries(FRAME).map(([k, v]) => `<button class="${LAB.size === k ? 'is-on' : ''}" data-a="lab-size" data-v="${k}">${v.label}</button>`).join('')}</div></div>
    <div class="sum">가장 두꺼운 방향 <b class="num" id="tk-p">${fmtD(P)} D</b> 기준 · 굴절률이 높을수록 같은 도수에서 렌즈가 얇아집니다.</div><div id="tk-body"></div>
    ${LAB.tk3d ? '' : `<p class="tk-foot">단순화한 계산 모델입니다 (렌즈 반경 ${r}mm). 실제 두께는 프레임·설계에 따라 달라집니다.</p>`}`;
  const body = $('#tk-body');
  if (!LAB.tk3d) { body.innerHTML = Sim.thicknessHTML({P, r, hi: LAB.hi, rows: idx.map(n => ({idx: n.toFixed(2), n, st: 'ok'}))}); return; }
  body.innerHTML = '<div class="sim-note">3D 화면을 불러오는 중…</div>';
  load3D().then(M => { if (tok === LAB.tok && document.body.contains(body)) LAB.h = M.mountThick3D(body, {P, r, hi: LAB.hi, idx}); })
    .catch(() => { if (tok === LAB.tok) body.innerHTML = FAIL_3D; });
}
function labUpdate() {
  if (LAB.mode === 'tk' && LAB.tk3d && LAB.h) { LAB.h.update({P: Sim.eff(LAB.s, LAB.c)}); $('#tk-p').textContent = fmtD(Sim.eff(LAB.s, LAB.c)) + ' D'; }
  else if (LAB.mode === 'tk') labThick();
  else if (LAB.mode === 'vz') { if (LAB.h) LAB.h.update(vzParams()); }
  else if (LAB.h && LAB.h.update) LAB.h.update({s: LAB.s, c: LAB.c});
}

/* ═════════ 이벤트 ═════════ */
document.addEventListener('click', e => {
  if (e.target.id === 'scrim') return closeSheet();
  const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
  const a = t.dataset.a;
  if (a.startsWith('pw-')) return pwAction(a, t);
  switch (a) {
    case 'cat': S.tab = t.dataset.v; store.set('tab', S.tab); renderRail(); renderHead(); renderMain(); $('#scroll').scrollTop = 0; return;
    case 'detail': return openDetail(t.dataset.k, t.dataset.i);
    case 'cmp': {
      const k = t.dataset.k, i = S.cmp.indexOf(k);
      if (i >= 0) S.cmp.splice(i, 1); else if (S.cmp.length < 3) S.cmp.push(k); else pill('비교는 최대 3개까지 담을 수 있어요');
      setTimeout(() => { if ($('#pill').textContent.startsWith('비교는')) pill(null); }, 1800);
      renderMain(); renderTray(); return;
    }
    case 'cmp-go': return openCompare();
    case 'cmp-clear': S.cmp = []; closeSheet(); renderMain(); renderTray(); return;
    case 'power': return openPower();
    case 'power-from-detail': closeSheet(); return openPower();
    case 'reset': return resetCustomer();
    case 'lab': return openLab();
    case 'range': return openRange();
    case 'calc': return openFrame('계산기', CALC_URL, 1100);
    case 'full': return toggleFull();
    case 'admin': location.href = ADMIN_URL; return;
    case 'close': return closeSheet();
    case 'pg': return openProg(+t.dataset.m, +t.dataset.c, t.dataset.i);
    case 'pg-3d': return openLab('p3', {tier: +t.dataset.t});
    case 'tk-3d': return openLab('tk', {s: +t.dataset.s, c: +t.dataset.c, hi: t.dataset.i, idx: t.dataset.l ? t.dataset.l.split(',').map(Number) : null, tk3d: true});
    case 'pg-idx': PG.idx = t.dataset.i; return renderProg();
    case 'pg-opt': PG.opts.has(t.dataset.n) ? PG.opts.delete(t.dataset.n) : PG.opts.add(t.dataset.n); return renderProg();
    case 'pg-add': S.add = Number(t.dataset.v); store.set('add', S.add); renderMain(); if (!$('#scrim').hidden && $('#pg-body')) renderProg(); return;
    case 'dt-idx': DT.idx = t.dataset.i; return renderDetail();
    case 'dt-view': DT.view = t.dataset.v; return renderDetail();
    case 'dt-eye': DT.eye = t.dataset.v; return renderDetail();
    case 'dt-size': DT.size = t.dataset.v; return renderDetail();
    case 'lab-mode': LAB.mode = t.dataset.v; return renderLab();
    case 'lab-dzv': LAB.dzv = t.dataset.v; return labDesign();
    case 'mx': MXSEL[S.tab] = +t.dataset.v; renderHead(); renderMain(); $('#scroll').scrollTop = 0; return;
    case 'lab-load': { const e2 = eyePw(t.dataset.v); LAB.s = e2.s; LAB.c = e2.c; $('#lab-s').value = LAB.s; $('#lab-c').value = LAB.c; labLabels(); return labUpdate(); }
    case 'lab-size': LAB.size = t.dataset.v; return labThick();
    case 'lab-tk3d': LAB.tk3d = t.dataset.v === '1'; return labThick();
    case 'lab-vzc': LAB.vzc = t.dataset.v; return labVision();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
// 다초점 보드의 ADD 슬라이더: 끄는 동안은 시야 지도만 바꾸고, 손을 떼면 표 전체를 다시 그림
const isAdd = t => t.classList && t.classList.contains('pg-add');
document.addEventListener('input', e => {
  if (!isAdd(e.target)) return;
  S.add = Number(e.target.value);
  $$('.pg-add').forEach(x => { if (x !== e.target) x.value = S.add; });
  $$('.pg-addv').forEach(x => x.textContent = '+' + S.add.toFixed(2));
  $$('.pg-vsvg').forEach(x => x.innerHTML = Sim.progView({}, S.add, +x.dataset.tier));
});
document.addEventListener('change', e => { if (isAdd(e.target)) { store.set('add', S.add); renderMain(); } });
function resetCustomer() {
  S.power = {rs: 0, rc: 0, ls: 0, lc: 0, set: false}; S.age = 'none'; S.issue = 'none'; S.cmp = [];
  LAB.os = LAB.oc = null; LAB.vzc = 'bare';                // 시뮬레이션에 넣은 현재 안경 도수도 함께 지움
  if (S.tab === 'rec') S.tab = (visibleTabs()[0] || {}).id;
  closeSheet(); renderAll(); $('#scroll').scrollTop = 0;
}
function toggleFull() {
  const d = document, el = d.documentElement;
  if (!d.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if (d.exitFullscreen) d.exitFullscreen();
}
if (!document.documentElement.requestFullscreen) $('#t-full').hidden = true;

/* 매장 공용 단말: 일정 시간 조작이 없으면 이전 고객 정보를 지우고 처음 화면으로 */
let idleTimer = null;
function bumpIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (S.power.set || hasProfile() || S.cmp.length || !$('#scrim').hidden) {
      resetCustomer(); const first = visibleTabs()[0]; if (first) { S.tab = first.id; renderAll(); }
    }
  }, IDLE_MS);
}
['pointerdown', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, bumpIdle, {passive: true, capture: true}));
bumpIdle();
connect();
