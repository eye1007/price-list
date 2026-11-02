/* 아이젠트리 V2 · 관리자 */
'use strict';
const FB_CONFIG = {apiKey:"AIzaSyBV128h-2uzJUjGsazgK0XXn6f0uVnMyV8",authDomain:"eyegentry-5c7de.firebaseapp.com",databaseURL:"https://eyegentry-5c7de-default-rtdb.firebaseio.com",projectId:"eyegentry-5c7de",storageBucket:"eyegentry-5c7de.firebasestorage.app",messagingSenderId:"772851251300",appId:"1:772851251300:web:330b44914302a6b0048771"};
const DATA_PATH = 'price_list/lensData';
const DRY = /[?&]dry\b/.test(location.search);          // ?dry → 서버에 저장하지 않는 테스트 모드
const PIN_HASH = '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';   // 비밀번호의 SHA-256 (화면 잠금용)
const DRAFT_KEY = 'gentry.adminDraft.v1', SNAP_KEY = 'gentry.lastServer.v1', OK_KEY = 'gentry.adm.ok';
const AGES = [{id: 'student', n: '학생'}, {id: 'adult', n: '성인'}, {id: 'senior', n: '시니어'}];
const IDX_SEQ = ['1.56', '1.60', '1.67', '1.74'];
const KNOWN = ['categories', 'brands', 'issues', 'matrices', 'images'];

/* ═════════ 유틸 ═════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const toArr = x => Array.isArray(x) ? x.filter(v => v != null) : (x && typeof x === 'object' ? Object.values(x) : []);
const uid = () => '_' + Math.random().toString(36).slice(2, 10);
const digits = v => String(v ?? '').replace(/\D/g, '');
const money = v => { const d = digits(v); return d ? Number(d).toLocaleString() : ''; };
const hex6 = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#2c3e50';
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const ICO = {
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>'
};
function toast(t, ms = 2200) { const p = $('#pill'); p.textContent = t; p.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => p.hidden = true, ms); }

/* ═════════ 데이터 모델 ═════════ */
let D = null, extra = {}, baseline = '', db = null;
function norm(raw) {
  raw = raw || {};
  const ex = {}; Object.keys(raw).forEach(k => { if (!KNOWN.includes(k)) ex[k] = raw[k]; });
  const tg = o => { o.targetAges = toArr(o.targetAges); o.targetIssues = toArr(o.targetIssues); return o; };
  const d = {
    categories: toArr(raw.categories).map(c => ({...c})),
    brands: toArr(raw.brands).map(b => ({...b, lenses: toArr(b.lenses).map(l => tg({...l, _id: uid(), items: toArr(l.items).map(i => ({...i}))}))})),
    issues: toArr(raw.issues).map(i => ({...i})),
    matrices: toArr(raw.matrices).map(m => tg({...m, _id: uid(), cols: toArr(m.cols).map(c => ({...c, prices: {...(c.prices || {})}}))})),
    images: toArr(raw.images).map(i => tg({...i, _id: uid()}))
  };
  if (!d.issues.find(i => i.id === 'none')) d.issues.unshift({id: 'none', name: '없음'});
  return {d, ex};
}
const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));
const cleanObj = () => ({...extra, ...strip(D)});
const cleanJson = () => JSON.stringify(strip(D));
const isDirty = () => cleanJson() !== baseline;
function setData(raw) { const r = norm(raw); D = r.d; extra = r.ex; baseline = cleanJson(); }
const lensById = id => { for (const b of D.brands) { const l = b.lenses.find(x => x._id === id); if (l) return {l, b}; } return null; };
const matById = id => D.matrices.find(m => m._id === id);
const imgById = id => D.images.find(i => i._id === id);
const realTabs = () => D.categories.filter(c => c.id !== 'ai').sort(byOrder);
const tabName = id => (D.categories.find(c => c.id === id) || {}).name || '미지정';
const allLenses = () => D.brands.flatMap(b => b.lenses.map(l => ({l, b})));
const nextOrder = tabId => 10 + Math.max(0, ...[...allLenses().map(x => x.l), ...D.matrices, ...D.images].filter(o => o.tabId === tabId).map(o => Number(o.order) || 0));

/* ═════════ 상태 ═════════ */
const A = {view: 'products', tab: 'all', q: '', sel: null, mode: 'edit', selTab: null, xl: null};
const VIEWS = [
  ['products', '제품 가격', () => allLenses().length],
  ['matrix', '다초점 매트릭스', () => D.matrices.length],
  ['tabs', '분류 · 노출 순서', () => realTabs().length],
  ['issues', '불편 증상', () => D.issues.length - 1],
  ['media', '배너 · 미디어', () => D.images.length],
  ['tools', '도구 · 백업', null]
];

/* ═════════ 다이얼로그 ═════════ */
function dialog(html) {
  return new Promise(res => {
    const sc = $('#scrim2'), sh = $('#sheet2');
    sh.innerHTML = `<div class="dlg">${html}</div>`; sc.hidden = false;
    const done = v => { sc.hidden = true; sh.innerHTML = ''; sc.removeEventListener('click', onc); res(v); };
    const onc = e => {
      const b = e.target.closest('[data-d]');
      if (b) { if (b.dataset.d === 'ok') { const o = {}; $$('[name]', sh).forEach(el => o[el.name] = el.value); done(o); } else done(null); }
      else if (e.target === sc) done(null);
    };
    sc.addEventListener('click', onc);
    const f = $('input,select', sh); if (f) f.focus();
  });
}
const confirmBox = (msg, ok = '확인', danger = false, title = '확인') =>
  dialog(`<h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="row2"><button class="btn btn--line" data-d="no">취소</button><button class="btn ${danger ? 'btn--d' : 'btn--p'}" data-d="ok">${esc(ok)}</button></div>`).then(v => !!v);
function openSheet(html) { $('#sheet').innerHTML = html; $('#scrim').hidden = false; }
function closeSheet() { $('#scrim').hidden = true; $('#sheet').innerHTML = ''; }

/* ═════════ 잠금 화면 ═════════ */
async function sha(s) {
  if (!(window.crypto && crypto.subtle)) return null;
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
let fails = 0, lockUntil = 0;
function initGate() {
  if (sessionStorage.getItem(OK_KEY) === '1') return start();
  $('#gate').hidden = false; $('#gate-pin').focus();
  $('#gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#gate-err');
    if (Date.now() < lockUntil) { err.textContent = `잠시 후 다시 시도하세요 (${Math.ceil((lockUntil - Date.now()) / 1000)}초)`; return; }
    const h = await sha($('#gate-pin').value);
    if (h === null) { err.textContent = 'https 주소 또는 localhost에서 열어 주세요.'; return; }
    if (h === PIN_HASH) { sessionStorage.setItem(OK_KEY, '1'); $('#gate').hidden = true; start(); }
    else { fails++; $('#gate-pin').value = ''; err.textContent = '비밀번호가 맞지 않습니다.'; if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; } }
  });
}

/* ═════════ 서버 ═════════ */
function initFirebase() { if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG); db = firebase.database(); }
async function loadServer() {
  const snap = await db.ref(DATA_PATH).once('value');
  return snap.val() || {};
}
async function start() {
  $('#app').hidden = false;
  try { initFirebase(); setData(await loadServer()); }
  catch (e) { toast('서버에서 데이터를 불러오지 못했습니다'); setData({}); }
  try {                                                          // 저장하지 못하고 닫은 편집본 복구
    const dr = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (dr && dr.data) {
      const r = norm(dr.data);
      if (JSON.stringify(strip(r.d)) !== baseline) {
        const when = new Date(dr.t).toLocaleString('ko-KR');
        if (await confirmBox(`저장하지 않은 편집본이 있습니다.\n(${when})\n\n이어서 편집할까요?`, '이어서 편집', false, '임시 저장본')) { D = r.d; } else localStorage.removeItem(DRAFT_KEY);
      }
    }
  } catch (e) {}
  renderAll();
}
async function save() {
  if (!isDirty()) return toast('변경된 내용이 없습니다');
  const nL = allLenses().length;
  if (!(await confirmBox(`서버에 저장할까요?\n\n제품 ${nL}개 · 매트릭스 ${D.matrices.length}개 · 분류 ${realTabs().length}개\n저장하면 매장 가격표에 바로 반영됩니다.`, DRY ? '테스트 저장' : '저장', false, '서버에 저장'))) return;
  try {
    const cur = await loadServer();                                  // 다른 기기에서 먼저 고쳤는지 확인
    if (JSON.stringify(strip(norm(cur).d)) !== baseline) {
      if (!(await confirmBox('이 화면을 연 뒤에 다른 기기에서 가격표가 수정되었습니다.\n그대로 저장하면 그 수정 내용이 사라집니다.', '덮어쓰기', true, '충돌 감지'))) return;
    }
    localStorage.setItem(SNAP_KEY, JSON.stringify({t: Date.now(), data: cur}));   // 저장 직전 상태 보관
    if (DRY) { toast('테스트 모드: 서버에는 저장하지 않았습니다'); return; }
    await db.ref(DATA_PATH).set(cleanObj());
    baseline = cleanJson(); localStorage.removeItem(DRAFT_KEY); updateHead(); toast('저장했습니다 · 가격표에 반영되었습니다');
  } catch (e) {
    if (/permission/i.test((e.code || '') + (e.message || ''))) { if (await openLogin()) save(); }
    else toast('저장 실패: ' + (e.message || e));
  }
}
async function openLogin() {
  const r = await dialog(`<h3>관리자 로그인</h3><p>서버가 쓰기 권한을 요구합니다. Firebase 관리자 계정으로 로그인해 주세요.</p>
    <div class="fd"><label>이메일</label><input class="in" name="e" type="email" autocomplete="username"></div>
    <div class="fd"><label>비밀번호</label><input class="in" name="p" type="password" autocomplete="current-password"></div>
    <div class="row2"><button class="btn btn--line" data-d="no">취소</button><button class="btn btn--p" data-d="ok">로그인</button></div>`);
  if (!r) return false;
  try { await firebase.auth().signInWithEmailAndPassword(r.e, r.p); toast('로그인했습니다'); return true; }
  catch (e) { toast('로그인 실패: ' + (e.message || e)); return false; }
}
async function revert() {
  if (isDirty() && !(await confirmBox('저장하지 않은 변경을 모두 버리고 서버의 최신 가격표를 다시 불러올까요?', '변경 버리기', true))) return;
  try { setData(await loadServer()); localStorage.removeItem(DRAFT_KEY); A.sel = null; renderAll(); toast('서버 최신본을 불러왔습니다'); }
  catch (e) { toast('불러오기 실패'); }
}
let draftT = null;
function touch() {
  updateHead();
  clearTimeout(draftT);
  draftT = setTimeout(() => { try { if (isDirty()) localStorage.setItem(DRAFT_KEY, JSON.stringify({t: Date.now(), data: cleanObj()})); else localStorage.removeItem(DRAFT_KEY); } catch (e) {} }, 600);
}
addEventListener('beforeunload', e => { if (D && isDirty() && !DRY) { e.preventDefault(); e.returnValue = ''; } });

/* ═════════ 공통 렌더 ═════════ */
function renderAll() { renderNav(); updateHead(); renderView(); }
function renderNav() {
  $('#nav').innerHTML = VIEWS.map(([id, n, c]) => `<button class="cat ${A.view === id ? 'is-on' : ''}" data-a="nav" data-v="${id}"><span>${n}</span>${c ? `<em>${c()}</em>` : ''}</button>`).join('');
}
function updateHead() {
  if (!D) return;
  const v = VIEWS.find(x => x[0] === A.view), dirty = isDirty();
  $('#head').innerHTML = `<h1>${v[1]}</h1>
    <div class="sv">${DRY ? '<span class="st st--dry">테스트 모드 · 서버 저장 안 됨</span>' : ''}
      <span class="st ${dirty ? 'st--dirty' : ''}">${dirty ? '저장하지 않은 변경 있음' : '서버와 동일'}</span>
      ${dirty ? '<button class="btn btn--line" data-a="revert">변경 버리기</button>' : ''}
      <button class="btn btn--p" data-a="save" ${dirty ? '' : 'disabled style="opacity:.45"'}>서버에 저장</button></div>`;
  renderNavCounts();
}
function renderNavCounts() { $$('#nav .cat').forEach((b, i) => { const c = VIEWS[i][2]; const em = $('em', b); if (c && em) em.textContent = c(); }); }
function renderView() {
  const view = $('#view');
  ({products: viewProducts, matrix: viewMatrix, tabs: viewTabs, issues: viewIssues, media: viewMedia, tools: viewTools})[A.view](view);
}
function refreshSide() { if ($('#plist')) renderPList(); if ($('#mlist')) renderMList(); if ($('#tlist')) renderTList(); }

/* 입력 위젯 */
const fdiv = (label, inner, cls = '') => `<div class="fd ${cls}"><label>${label}</label>${inner}</div>`;
const inp = (s, f, v, extra = '') => `<input class="in" data-s="${s}" data-f="${f}" value="${esc(v)}" ${extra}>`;
const tabSelect = (s, f, v, withNone) => `<select class="in" data-s="${s}" data-f="${f}" data-ty="sel">${withNone ? '<option value="">미지정</option>' : ''}${realTabs().map(c => `<option value="${esc(c.id)}" ${c.id === v ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
const colorField = (s, f, v, attrs = '') => `<div class="colorf"><input type="color" value="${hex6(v)}" data-s="${s}" data-f="${f}" data-ty="color" ${attrs}><input class="in" value="${esc(v || '')}" data-s="${s}" data-f="${f}" data-ty="color" ${attrs} maxlength="9"></div>`;
const chipSet = (o, kind) => {
  const list = kind === 'age' ? AGES : D.issues.filter(i => i.id !== 'none').map(i => ({id: i.id, n: i.name}));
  const key = kind === 'age' ? 'targetAges' : 'targetIssues';
  if (!list.length) return '<span class="hint2">등록된 증상이 없습니다 (불편 증상 메뉴에서 추가)</span>';
  return `<div class="chips">${list.map(x => `<button class="opt ${toArr(o[key]).includes(x.id) ? 'is-on' : ''}" data-a="tog" data-k="${key}" data-v="${esc(x.id)}">${esc(x.n)}</button>`).join('')}</div>`;
};

/* ═════════ 제품 가격 ═════════ */
function viewProducts(view) {
  view.innerHTML = `<div class="adm-split ${A.sel ? 'has-sel' : ''}"><aside class="adm-list"><div class="adm-list__head">
      <select class="in" id="f-tab"><option value="all">모든 분류</option>${realTabs().map(c => `<option value="${esc(c.id)}" ${A.tab === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <div class="adm-list__row"><input class="in" id="f-q" placeholder="제품 · 브랜드 검색" value="${esc(A.q)}"><button class="btn btn--p btn--s" data-a="lens-new">${ICO.plus}새 제품</button></div>
      <button class="btn btn--line btn--s" data-a="brands">브랜드 관리</button></div>
    <div class="adm-list__body" id="plist"></div></aside><section class="adm-ed" id="ped"></section></div>`;
  renderPList(); renderPEd();
}
function renderPList() {
  const q = A.q.trim().toLowerCase(), tabs = realTabs(), rank = id => { const i = tabs.findIndex(t => t.id === id); return i < 0 ? 99 : i; };
  let ls = allLenses().filter(({l, b}) => (A.tab === 'all' || l.tabId === A.tab) && (!q || (b.name + ' ' + l.name).toLowerCase().includes(q)));
  ls.sort((x, y) => rank(x.l.tabId) - rank(y.l.tabId) || byOrder(x.l, y.l));
  let html = '', last = null;
  ls.forEach(({l, b}) => {
    if (A.tab === 'all' && l.tabId !== last) { last = l.tabId; html += `<div class="lh">${esc(tabName(l.tabId))}</div>`; }
    const sw = /^#[0-9a-f]{3,8}$/i.test(l.bgColor || '') ? l.bgColor : '#9aa1ad';
    html += `<button class="li ${A.sel === l._id ? 'is-on' : ''}" data-a="sel" data-id="${l._id}"><i style="--sw:${sw}"></i><div><b>${esc(l.name || '(이름 없음)')}</b><small>${esc(b.name)} · ${l.items.length}행</small></div>${l.isSale ? '<span class="tag tag--sale">SALE</span>' : ''}</button>`;
  });
  $('#plist').innerHTML = html || '<div class="ed-empty"><div><b>제품이 없습니다</b>조건을 바꾸거나 새 제품을 추가하세요.</div></div>';
}
function renderPEd() {
  const el = $('#ped'), f = A.sel && lensById(A.sel);
  if (!f) { el.innerHTML = `<div class="ed-empty"><div><b>제품을 선택하세요</b>왼쪽 목록에서 제품을 누르면 가격과 제작 범위를 수정할 수 있어요.</div></div>`; return; }
  const {l, b} = f, keep = $('.ed-b', el) ? $('.ed-b', el).scrollTop : 0;
  const head = `<div class="ed-h"><button class="btn btn--line btn--s back" data-a="unsel">${ICO.back}목록</button><div><div class="eyebrow">${esc(b.name)}</div><h2>${esc(l.name || '(이름 없음)')}</h2></div>
    <div class="sp"><div class="seg"><button class="${A.mode === 'edit' ? 'is-on' : ''}" data-a="mode" data-v="edit">편집</button><button class="${A.mode === 'prev' ? 'is-on' : ''}" data-a="mode" data-v="prev">미리보기</button></div>
    <button class="btn btn--line btn--s" data-a="lens-dup">복제</button><button class="btn btn--d btn--s" data-a="lens-del">삭제</button></div></div>`;
  let body;
  if (A.mode === 'prev') body = `<p class="hint2" style="margin:0 0 .8rem">매장 가격표에 보이는 모습입니다 (고객 도수를 입력하지 않은 상태).</p><div class="grid" style="grid-template-columns:minmax(0,24rem)">${previewCard(l, b)}</div>`;
  else body = `<div class="box"><h3>기본 정보</h3><div class="fm">
      ${fdiv('브랜드', `<select class="in" data-a-change="lens-brand">${D.brands.map((x, i) => `<option value="${i}" ${x === b ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`)}
      ${fdiv('제품명', inp('lens', 'name', l.name), 'w2')}
      ${fdiv('분류', tabSelect('lens', 'tabId', l.tabId, true))}
      ${fdiv('대표 색', colorField('lens', 'bgColor', l.bgColor))}
      ${fdiv('SALE 표시', `<button class="sw-row ${l.isSale ? 'is-sale' : ''}" data-a="tog-sale"><span>${l.isSale ? 'SALE 배지 표시 중' : 'SALE 배지 없음'}</span><span class="tog" aria-pressed="${!!l.isSale}"></span></button>`)}
      ${fdiv('한 줄 설명', `<textarea class="in" data-s="lens" data-f="desc" rows="2">${esc(l.desc || '')}</textarea>`, 'wf')}</div></div>
    <div class="box"><h3>맞춤 추천 대상 <em>선택한 조건의 고객에게 "맞춤 추천"으로 보여줍니다</em></h3>
      <div class="fm"><div class="fd"><label>연령대</label>${chipSet(l, 'age')}</div><div class="fd"><label>불편 증상</label>${chipSet(l, 'issue')}</div></div></div>
    <div class="box"><h3>굴절률별 가격 · 제작 범위 <em>제작 범위를 비우면 제한 없음</em></h3>
      <div class="its">${l.items.map((it, i) => itemRow(it, i)).join('')}</div>
      <div class="bar-r"><button class="btn btn--accent btn--s" data-a="item-add">${ICO.plus}굴절률 행 추가</button><button class="btn btn--line btn--s" data-a="item-sort">굴절률순 정렬</button></div>
      <p class="hint2">S = 구면 도수 범위, C 최소 = 가능한 최대 난시(예: −4), 합도수 최대 = 원시 합도수 상한(비우면 제한 없음).</p></div>`;
  el.innerHTML = head + `<div class="ed-b">${body}</div>`;
  $('.ed-b', el).scrollTop = keep;
}
function itemRow(it, i) {
  const off = Number(digits(it.pOff)), sale = Number(digits(it.pSale)), pct = off > sale && sale > 0 ? Math.round((1 - sale / off) * 100) : 0;
  const n = (f, ph = '') => `<input class="in" type="number" step="0.25" inputmode="decimal" data-s="item" data-it="${i}" data-f="${f}" data-ty="num" value="${it[f] ?? ''}" placeholder="${ph}">`;
  return `<div class="it"><div class="it__m">
      ${fdiv('굴절률', `<input class="in" data-s="item" data-it="${i}" data-f="idx" value="${esc(it.idx)}">`)}
      ${fdiv('설계 / 사양', `<input class="in" data-s="item" data-it="${i}" data-f="spec" value="${esc(it.spec)}" placeholder="예: 비구면">`)}
      ${fdiv('정가', `<div class="pw-in"><input class="in in--n" inputmode="numeric" data-s="item" data-it="${i}" data-f="pOff" data-ty="money" value="${money(it.pOff)}"></div>`)}
      ${fdiv('판매가', `<div class="pw-in"><input class="in in--n" inputmode="numeric" data-s="item" data-it="${i}" data-f="pSale" data-ty="money" value="${money(it.pSale)}" style="padding-right:2.6rem"><span class="it__pct">${pct ? '−' + pct + '%' : ''}</span></div>`)}
      <button class="xbtn" data-a="item-del" data-i="${i}" aria-label="행 삭제">${ICO.x}</button></div>
    <div class="it__r"><b>제작 범위</b><label>S 최소 ${n('sMin')}</label><label>S 최대 ${n('sMax')}</label><label>C 최소 ${n('cMin')}</label><label>합도수 최대 ${n('sumMax')}</label></div></div>`;
}
function previewCard(l, b) {
  const rows = l.items.filter(it => /\d/.test(it.idx || '')).map(it => {
    const sale = Number(digits(it.pSale)), off = Number(digits(it.pOff)), pct = off > sale && sale > 0 ? Math.round((1 - sale / off) * 100) : 0;
    return `<div class="row"><span class="row__i num">${esc(it.idx)}</span><span class="row__s">${esc(it.spec)}</span><div class="price">${sale ? `${off > sale ? `<s>${off.toLocaleString()}원<em>−${pct}%</em></s>` : ''}<b class="num">${sale.toLocaleString()}<i>원</i></b>` : '<b>—</b>'}</div></div>`;
  }).join('');
  const sw = /^#[0-9a-f]{3,8}$/i.test(l.bgColor || '') ? l.bgColor : '#9aa1ad';
  return `<article class="card ${l.isSale ? 'card--sale' : ''}" style="--sw:${sw}"><div class="card__top"><div class="card__id"><div class="eyebrow"><i></i>${esc(b.name)}</div><h3>${esc(l.name)}</h3></div>${l.isSale ? '<span class="tag tag--sale">SALE</span>' : ''}</div>${l.desc ? `<p class="card__desc">${esc(l.desc)}</p>` : ''}<div class="rows">${rows}</div></article>`;
}

/* ═════════ 다초점 매트릭스 ═════════ */
const newCol = () => ({name: '새 열', desc: '', addInfo: '', corridor: '', bgColor: '#fdfdfd', isSale: false, prices: {}});
function viewMatrix(view) {
  view.innerHTML = `<div class="adm-split ${A.sel ? 'has-sel' : ''}"><aside class="adm-list"><div class="adm-list__head"><button class="btn btn--p btn--s" data-a="mat-new">${ICO.plus}새 매트릭스</button></div><div class="adm-list__body" id="mlist"></div></aside><section class="adm-ed" id="med"></section></div>`;
  renderMList(); renderMEd();
}
function renderMList() {
  $('#mlist').innerHTML = D.matrices.slice().sort(byOrder).map(m => `<button class="li ${A.sel === m._id ? 'is-on' : ''}" data-a="sel" data-id="${m._id}"><i style="--sw:${/^#[0-9a-f]{3,8}$/i.test(m.brandColor || '') ? m.brandColor : '#9aa1ad'}"></i><div><b>${esc([m.brand, m.name].filter(Boolean).join(' · ') || '(이름 없음)')}</b><small>${esc(tabName(m.tabId))} · ${m.cols.length}열</small></div></button>`).join('')
    || '<div class="ed-empty"><div><b>매트릭스가 없습니다</b>다초점처럼 열별로 가격을 비교하는 표입니다.</div></div>';
}
function renderMEd() {
  const el = $('#med'), m = A.sel && matById(A.sel);
  if (!m) { el.innerHTML = `<div class="ed-empty"><div><b>매트릭스를 선택하세요</b>다초점 가격표처럼 열(제품)별로 굴절률 4단계 가격을 입력합니다.</div></div>`; return; }
  const keep = $('.ed-b', el) ? $('.ed-b', el).scrollTop : 0, keepX = $('.cols', el) ? $('.cols', el).scrollLeft : 0;
  el.innerHTML = `<div class="ed-h"><button class="btn btn--line btn--s back" data-a="unsel">${ICO.back}목록</button><div><div class="eyebrow">${esc(m.brand || '')}</div><h2>${esc(m.name || '(이름 없음)')}</h2></div>
    <div class="sp"><button class="btn btn--line btn--s" data-a="mat-dup">복제</button><button class="btn btn--d btn--s" data-a="mat-del">삭제</button></div></div>
    <div class="ed-b"><div class="box"><h3>표 정보</h3><div class="fm">${fdiv('브랜드 / 제목', inp('mat', 'brand', m.brand))}${fdiv('이름', inp('mat', 'name', m.name))}${fdiv('분류', tabSelect('mat', 'tabId', m.tabId, true))}${fdiv('제목 색', colorField('mat', 'brandColor', m.brandColor))}</div></div>
    <div class="box"><h3>공통 옵션 추가 금액 <em>모든 열에 같은 금액으로 표시됩니다 (열에서 같은 이름을 따로 넣으면 그 값이 우선)</em></h3>
      ${toArr(m.opts).map((o, oi) => `<div class="col__o" style="max-width:34rem"><input class="in" data-s="mopt" data-oi="${oi}" data-f="n" value="${esc(o.n)}" placeholder="옵션명 (예: 착색)"><input class="in in--n" inputmode="numeric" data-s="mopt" data-oi="${oi}" data-f="p" data-ty="money" value="${money(o.p)}" placeholder="금액"><button class="xbtn" data-a="mopt-del" data-oi="${oi}" aria-label="삭제">${ICO.x}</button></div>`).join('')}
      <div class="bar-r"><button class="btn btn--accent btn--s" data-a="mopt-add">${ICO.plus}공통 옵션 추가</button>${!toArr(m.opts).length && deriveOpts(m).length ? `<button class="btn btn--line btn--s" data-a="mopt-derive">제목의 "${esc(deriveOpts(m)[0].n)} +${deriveOpts(m)[0].p.toLocaleString()}원"을 옵션으로 변환</button>` : ''}</div></div>
    <div class="box"><h3>열(제품)별 가격 <em>왼쪽에서 오른쪽 순서로 표시됩니다</em>
      <span class="seg" style="margin-left:auto"><button class="${A.mgrid ? '' : 'is-on'}" data-a="mgrid" data-v="0">카드</button><button class="${A.mgrid ? 'is-on' : ''}" data-a="mgrid" data-v="1">표로 한눈에</button></span></h3>
      ${A.mgrid ? matGrid(m) : `<div class="cols">${m.cols.map((c, i) => colCard(c, i, m.cols.length)).join('')}<button class="col col--add" data-a="col-add">${ICO.plus}<br>열 추가</button></div>`}</div>
    <details class="box"><summary><b>일괄 도구</b> <em>가격 한꺼번에 조정 · 엑셀에서 붙여넣기</em></summary>
      <div class="fm" style="margin-top:.8rem"><div class="fd"><label>대상</label><select class="in" id="bk-t"><option value="sale">판매가</option><option value="off">정가</option><option value="both">판매가 + 정가</option></select></div>
        <div class="fd"><label>방식</label><select class="in" id="bk-m"><option value="pct">비율(%)</option><option value="amt">금액(원)</option></select></div>
        <div class="fd"><label>값 (인상 +, 인하 −)</label><input class="in in--n" id="bk-v" type="number" step="any" placeholder="예: 5 또는 -10000"></div>
        <div class="fd"><label>반올림</label><select class="in" id="bk-r"><option value="1000">천원 단위</option><option value="10000">만원 단위</option><option value="1">하지 않음</option></select></div></div>
      <div class="bar-r"><button class="btn btn--p btn--s" data-a="bulk-apply">전체 열에 적용</button></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:1rem 0">
      <div class="fd"><label>엑셀 붙여넣기 · 제품명, 1.56 정가, 1.56 판매가, 1.60 정가, 1.60 판매가, 1.67 정가, 1.67 판매가, 1.74 정가, 1.74 판매가 (판매가만이면 제품명 + 4칸)</label>
        <textarea class="in xl" id="mx-xl" placeholder="엑셀에서 복사해 붙여넣기 (탭 구분). 제품명이 같으면 가격을 덮어쓰고, 없으면 새 열로 추가합니다."></textarea></div>
      <div class="bar-r"><button class="btn btn--accent btn--s" data-a="mx-paste">붙여넣은 내용 적용</button></div></details></div>`;
  $('.ed-b', el).scrollTop = keep; const cl = $('.cols', el); if (cl) cl.scrollLeft = keepX;
}
function deriveOpts(m) {                              // 예전 제목 "옵션 : 착색 +15,000원" → 옵션 목록
  const r = String(m.name || '').match(/^[^:：]*[:：]\s*(.+?)\s*\+\s*([\d,]+)\s*원/);
  return r ? [{n: r[1].trim(), p: Number(r[2].replace(/,/g, ''))}] : [];
}
const IDXK = ['1.56', '1.60', '1.67', '1.74'].map(ix => ['idx_' + ix.replace('.', ''), ix]);
function matGrid(m) {                                  // 제품 × 굴절률 4단계를 표 하나로 편집
  const p = (c, k, f) => ((c.prices || {})[k] || {})[f];
  return `<div class="mg-wrap"><table class="mg"><thead><tr><th>제품</th>${IDXK.map(([, ix]) => `<th>${ix}<small>정가 · 판매가</small></th>`).join('')}<th></th></tr></thead><tbody>${m.cols.map((c, i) => `<tr>
    <td><input class="in" data-s="col" data-col="${i}" data-f="name" value="${esc(c.name)}"></td>
    ${IDXK.map(([k]) => `<td><div class="mg-p"><input class="in in--n" inputmode="numeric" data-s="colp" data-col="${i}" data-pk="${k}" data-f="off" data-ty="money" value="${money(p(c, k, 'off'))}" placeholder="정가"><input class="in in--n" inputmode="numeric" data-s="colp" data-col="${i}" data-pk="${k}" data-f="sale" data-ty="money" value="${money(p(c, k, 'sale'))}" placeholder="판매가"></div></td>`).join('')}
    <td><button class="xbtn" data-a="col-del" data-i="${i}" aria-label="열 삭제">${ICO.x}</button></td></tr>`).join('')}</tbody></table></div>
    <div class="bar-r"><button class="btn btn--accent btn--s" data-a="col-add">${ICO.plus}열 추가</button></div>`;
}
function bulkApply() {
  const m = matById(A.sel); if (!m) return;
  const t = $('#bk-t').value, mode = $('#bk-m').value, v = Number($('#bk-v').value), rd = Number($('#bk-r').value) || 1;
  if (!v || isNaN(v)) return toast('조정할 값을 입력하세요');
  let n = 0;
  const adj = x => { const cur = Number(digits(x)); if (!cur) return x; const nv = mode === 'pct' ? cur * (1 + v / 100) : cur + v; n++; return String(Math.max(0, Math.round(nv / rd) * rd)); };
  m.cols.forEach(c => IDXK.forEach(([k]) => { const pr = (c.prices || {})[k]; if (!pr) return; if (t !== 'off') pr.sale = adj(pr.sale); if (t !== 'sale') pr.off = adj(pr.off); }));
  touch(); renderMEd(); toast(`${n}개 가격을 조정했습니다 · 저장 전 내용을 확인하세요`);
}
function mxPaste() {
  const m = matById(A.sel), text = ($('#mx-xl').value || '').trim(); if (!m || !text) return toast('붙여넣을 내용이 없습니다');
  const plain = s => String(s || '').replace(/<br\s*\/?>/gi, '').replace(/\s+/g, '').toLowerCase();
  let upd = 0, add = 0;
  text.split(/\r?\n/).map(l => l.split('\t').map(x => x.trim())).filter(r => r.length >= 5 && r[0]).forEach(r => {
    const two = r.length >= 9, vals = r.slice(1), c0 = m.cols.find(c => plain(c.name) === plain(r[0]));
    const c = c0 || Object.assign(newCol(), {name: r[0]}); if (!c0) { m.cols.push(c); add++; } else upd++;
    c.prices = c.prices || {};
    IDXK.forEach(([k], i) => { const off = two ? vals[i * 2] : '', sale = two ? vals[i * 2 + 1] : vals[i]; c.prices[k] = {off: digits(off) || (c.prices[k] || {}).off || '', sale: digits(sale)}; });
  });
  touch(); renderMEd(); toast(`기존 ${upd}개 수정 · 새 열 ${add}개 추가했습니다`);
}
function colCard(c, i, n) {
  const p = k => (c.prices && c.prices[k]) || {};
  return `<div class="col"><div class="col__h"><span>${i + 1}열</span><div><button data-a="col-mv" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'}>◀</button><button data-a="col-mv" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'}>▶</button><button data-a="col-dup" data-i="${i}">복제</button><button data-a="col-del" data-i="${i}">${ICO.x}</button></div></div>
    <div class="col__b">
      ${fdiv('브랜드 (제품명 위 작은 글씨, 선택)', `<input class="in" data-s="col" data-col="${i}" data-f="brand" value="${esc(c.brand || '')}" placeholder="예: ZEISS">`)}
      ${fdiv('제품명 (줄바꿈은 &lt;br&gt;)', `<input class="in" data-s="col" data-col="${i}" data-f="name" value="${esc(c.name)}">`)}
      ${fdiv('특징 (예: 넓은 근거리 시야)', `<input class="in" data-s="col" data-col="${i}" data-f="desc" value="${esc(c.desc)}">`)}
      <div class="fm" style="grid-template-columns:1fr 1fr;gap:.5rem">${fdiv('ADD 범위', `<input class="in" data-s="col" data-col="${i}" data-f="addInfo" value="${esc(c.addInfo)}">`)}${fdiv('누진대 길이', `<input class="in" data-s="col" data-col="${i}" data-f="corridor" value="${esc(c.corridor)}">`)}</div>
      ${fdiv('열 배경색', colorField('col', 'bgColor', c.bgColor, `data-col="${i}"`))}
      <button class="sw-row ${c.isSale ? 'is-sale' : ''}" data-a="col-sale" data-i="${i}"><span>SALE 표시</span><span class="tog" aria-pressed="${!!c.isSale}"></span></button>
      ${fdiv('시야 등급 (시야 지도 · 등급 표시)', `<select class="in" data-s="col" data-col="${i}" data-f="tier" data-ty="sel"><option value="" ${[1, 2, 3, 4].includes(Number(c.tier)) ? '' : 'selected'}>자동 (같은 표 안 가격 순위)</option>${['최고급형', '고급형', '보급형', '기본형'].map((n, k) => `<option value="${k + 1}" ${Number(c.tier) === k + 1 ? 'selected' : ''}>${n}</option>`).join('')}</select>`)}
      ${fdiv('상세 설명 (제품을 눌렀을 때 보임)', `<textarea class="in" rows="3" data-s="col" data-col="${i}" data-f="detail">${esc(c.detail || '')}</textarea>`)}
      <div class="fd"><label>옵션 추가 금액 <em style="font-style:normal;font-weight:600">(이 제품만)</em></label>
        ${toArr(c.opts).map((o, oi) => `<div class="col__o"><input class="in" data-s="colo" data-col="${i}" data-oi="${oi}" data-f="n" value="${esc(o.n)}" placeholder="옵션명"><input class="in in--n" inputmode="numeric" data-s="colo" data-col="${i}" data-oi="${oi}" data-f="p" data-ty="money" value="${money(o.p)}" placeholder="금액"><button class="xbtn" data-a="col-opt-del" data-i="${i}" data-oi="${oi}" aria-label="옵션 삭제">${ICO.x}</button></div>`).join('')}
        <button class="btn btn--line btn--s" data-a="col-opt-add" data-i="${i}">${ICO.plus}옵션 추가</button></div>
      <div class="fd"><label>시야 점수 0~100 <em style="font-style:normal;font-weight:600">(비우면 등급 기준 자동)</em></label>
        <div class="col__v">${[['far', '원거리'], ['mid', '중간'], ['near', '근거리'], ['side', '주변 안정']].map(([k, n]) => `<label>${n}<input class="in in--n" type="number" min="0" max="100" data-s="colv" data-col="${i}" data-f="${k}" data-ty="num" value="${(c.view || {})[k] ?? ''}"></label>`).join('')}</div></div>
      <div class="col__p"><span></span><span class="t">정가</span><span class="t">판매가</span></div>
      ${['1.56', '1.60', '1.67', '1.74'].map(ix => { const k = 'idx_' + ix.replace('.', ''), pr = p(k);
        return `<div class="col__p"><span>${ix}</span><input class="in in--n" inputmode="numeric" data-s="colp" data-col="${i}" data-pk="${k}" data-f="off" data-ty="money" value="${money(pr.off)}"><input class="in in--n" inputmode="numeric" data-s="colp" data-col="${i}" data-pk="${k}" data-f="sale" data-ty="money" value="${money(pr.sale)}"></div>`; }).join('')}
    </div></div>`;
}

/* ═════════ 분류 · 노출 순서 ═════════ */
function viewTabs(view) {
  if (!A.selTab || !realTabs().find(t => t.id === A.selTab)) A.selTab = (realTabs()[0] || {}).id || null;
  view.innerHTML = `<div class="adm-split ${A.sel ? 'has-sel' : ''}"><aside class="adm-list"><div class="adm-list__head"><button class="btn btn--p btn--s" data-a="tab-new">${ICO.plus}새 분류</button><p class="hint2" style="margin:0">위에서부터 왼쪽 메뉴 순서대로 보입니다.</p></div><div class="adm-list__body" id="tlist"></div></aside><section class="adm-ed" id="ted"></section></div>`;
  renderTList(); renderTEd();
}
function tabCount(id) { return allLenses().filter(x => x.l.tabId === id).length + D.matrices.filter(m => m.tabId === id).length + D.images.filter(i => i.tabId === id).length; }
function renderTList() {
  $('#tlist').innerHTML = realTabs().map(t => `<button class="li ${A.selTab === t.id ? 'is-on' : ''}" data-a="tab-sel" data-id="${esc(t.id)}"><div><b>${esc(t.name || '(이름 없음)')}</b><small>제품 ${tabCount(t.id)}개${t.img ? ' · 배너 있음' : ''}</small></div></button>`).join('');
}
function renderTEd() {
  const el = $('#ted'), tabs = realTabs(), t = tabs.find(x => x.id === A.selTab);
  if (!t) { el.innerHTML = '<div class="ed-empty"><div><b>분류가 없습니다</b></div></div>'; return; }
  const i = tabs.indexOf(t), keep = $('.ed-b', el) ? $('.ed-b', el).scrollTop : 0;
  const pool = [...allLenses().filter(x => x.l.tabId === t.id).map(x => ({o: x.l, kind: '제품', title: x.l.name, sub: x.b.name})),
    ...D.matrices.filter(m => m.tabId === t.id).map(m => ({o: m, kind: '다초점표', title: m.name || m.brand, sub: m.brand})),
    ...D.images.filter(m => m.tabId === t.id).map(m => ({o: m, kind: m.cardType === 'iframe' ? '시뮬레이터' : '이미지', title: m.name, sub: ''}))].sort((a, b) => byOrder(a.o, b.o));
  el.innerHTML = `<div class="ed-h"><button class="btn btn--line btn--s back" data-a="unsel">${ICO.back}목록</button><div><div class="eyebrow">분류</div><h2>${esc(t.name || '(이름 없음)')}</h2></div>
    <div class="sp"><button class="btn btn--line btn--s" data-a="tab-mv" data-d="-1" ${i ? '' : 'disabled'}>▲ 위로</button><button class="btn btn--line btn--s" data-a="tab-mv" data-d="1" ${i < tabs.length - 1 ? '' : 'disabled'}>▼ 아래로</button><button class="btn btn--d btn--s" data-a="tab-del">삭제</button></div></div>
    <div class="ed-b"><div class="box"><h3>분류 정보</h3><div class="tabrow"><div class="fm" style="grid-template-columns:1fr">${fdiv('분류 이름', `<input class="in" data-s="tab" data-tid="${esc(t.id)}" data-f="name" value="${esc(t.name)}">`)}${fdiv('아래쪽 배너 이미지 주소', `<input class="in" data-s="tab" data-tid="${esc(t.id)}" data-f="img" value="${esc(t.img || '')}" placeholder="https://...">`)}</div>${t.img ? `<img class="thumb" src="${esc(t.img)}" alt="" onerror="this.style.visibility='hidden'">` : ''}</div></div>
    <div class="box"><h3>이 분류의 노출 순서 <em>제품 · 다초점표 · 배너가 아래 순서대로 보입니다</em></h3><div class="ord">${pool.map((p, k) => `<div class="ordr"><div class="mv"><button data-a="ord-mv" data-id="${p.o._id}" data-d="-1" ${k ? '' : 'disabled'}>▲</button><button data-a="ord-mv" data-id="${p.o._id}" data-d="1" ${k < pool.length - 1 ? '' : 'disabled'}>▼</button></div><span class="kind">${p.kind}</span><div class="t">${esc(p.title || '(이름 없음)')}<small>${esc(p.sub)}</small></div></div>`).join('') || '<p class="hint2">이 분류에 등록된 항목이 없습니다.</p>'}</div></div></div>`;
  $('.ed-b', el).scrollTop = keep;
}
function moveInTab(id, d) {
  const o = lensById(id)?.l || matById(id) || imgById(id); if (!o) return;
  const all = [...allLenses().map(x => x.l), ...D.matrices, ...D.images].filter(x => x.tabId === o.tabId).sort(byOrder);
  const i = all.indexOf(o), j = i + d; if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]]; all.forEach((x, k) => x.order = (k + 1) * 10);
}

/* ═════════ 불편 증상 ═════════ */
function viewIssues(view) {
  view.innerHTML = `<div class="adm-scroll"><div class="box" style="max-width:40rem"><h3>불편 증상 <em>고객 상담에서 "불편 증상"으로 고르는 항목입니다</em></h3><div class="ord">
    ${D.issues.filter(i => i.id !== 'none').map(i => `<div class="ordr"><div class="t"><input class="in" data-s="issue" data-iid="${esc(i.id)}" data-f="name" value="${esc(i.name)}"></div><button class="xbtn" data-a="issue-del" data-id="${esc(i.id)}" aria-label="삭제">${ICO.x}</button></div>`).join('') || '<p class="hint2">등록된 증상이 없습니다.</p>'}</div>
    <div class="bar-r"><input class="in" id="new-issue" placeholder="새 증상 이름 (예: 빛번짐)" style="max-width:20rem"><button class="btn btn--p btn--s" data-a="issue-new">${ICO.plus}추가</button></div></div></div>`;
}

/* ═════════ 배너 · 미디어 ═════════ */
function viewMedia(view) {
  view.innerHTML = `<div class="adm-scroll">${D.images.slice().sort(byOrder).map(m => {
    const id = m._id, isF = m.cardType === 'iframe';
    return `<div class="box"><h3>${isF ? '시뮬레이터(iframe)' : '이미지'}<span style="margin-left:auto"><button class="btn btn--d btn--s" data-a="img-del" data-id="${id}">삭제</button></span></h3><div class="tabrow"><div class="fm">
      ${fdiv('이름 (관리용)', `<input class="in" data-s="img" data-mid="${id}" data-f="name" value="${esc(m.name || '')}">`, 'w2')}
      ${fdiv('유형', `<select class="in" data-s="img" data-mid="${id}" data-f="cardType" data-ty="sel-r"><option value="image" ${!isF ? 'selected' : ''}>이미지</option><option value="iframe" ${isF ? 'selected' : ''}>시뮬레이터(iframe)</option></select>`)}
      ${fdiv('표시할 분류', tabSelect('img', 'tabId', m.tabId, true).replace('data-s="img"', `data-s="img" data-mid="${id}"`))}
      ${isF ? fdiv('세로 길이(px)', `<input class="in in--n" type="number" data-s="img" data-mid="${id}" data-f="height" data-ty="num" value="${m.height || 600}">`) : ''}
      ${fdiv('주소(URL)', `<input class="in" data-s="img" data-mid="${id}" data-f="url" value="${esc(m.url || '')}" placeholder="https://...">`, 'wf')}</div>
      ${!isF && m.url ? `<img class="thumb" style="width:9rem;height:5rem" src="${esc(m.url)}" alt="" onerror="this.style.visibility='hidden'">` : ''}</div></div>`;
  }).join('') || '<div class="ed-empty"><div><b>등록된 배너가 없습니다</b></div></div>'}
    <button class="btn btn--p" data-a="img-new">${ICO.plus}배너 · 시뮬레이터 카드 추가</button></div>`;
}

/* ═════════ 도구 · 백업 ═════════ */
function viewTools(view) {
  let snap = null, draft = null;
  try { snap = JSON.parse(localStorage.getItem(SNAP_KEY)); draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) {}
  const user = (window.firebase && firebase.apps.length && firebase.auth().currentUser) ? firebase.auth().currentUser.email : null;
  view.innerHTML = `<div class="adm-scroll" style="max-width:62rem">
    <div class="box"><h3>엑셀에서 붙여넣기 <em>열 순서: 브랜드 · 제품명 · 굴절률 · 설계 · 정가 · 판매가 · S최소 · S최대 · C최소 · 합도수최대(선택)</em></h3>
      <textarea class="in xl" id="xl" placeholder="엑셀에서 복사한 표를 여기에 붙여넣으세요 (탭으로 구분)">${esc(A.xl?.text || '')}</textarea>
      <div class="fm" style="margin-top:.7rem">${fdiv('새 제품이 들어갈 분류', `<select class="in" id="xl-tab">${realTabs().map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>`)}</div>
      <div class="bar-r"><button class="btn btn--accent" data-a="xl-parse">미리보기</button></div><div id="xl-out"></div></div>
    <div class="box"><h3>백업 · 복원</h3><div class="bar-r" style="margin-top:0"><button class="btn btn--line" data-a="backup-dl">백업 파일 내려받기</button><button class="btn btn--line" data-a="backup-up">백업 파일 불러오기</button><input type="file" id="backup-file" accept=".json,application/json" hidden></div>
      <p class="hint2">백업에는 제품 · 분류 · 증상 · 다초점표 · 배너가 모두 들어 있습니다. 불러오면 화면에만 적용되고, "서버에 저장"을 눌러야 가격표에 반영됩니다.</p></div>
    <div class="box"><h3>되돌리기</h3><div class="bar-r" style="margin-top:0">
      <button class="btn btn--line" data-a="snap-restore" ${snap ? '' : 'disabled style="opacity:.45"'}>마지막 저장 직전 상태로 되돌리기</button>
      <button class="btn btn--line" data-a="revert">서버 최신본 다시 불러오기</button></div>
      <p class="hint2">${snap ? `마지막 저장 직전 상태: ${new Date(snap.t).toLocaleString('ko-KR')} (이 기기에 보관)` : '아직 이 기기에서 저장한 기록이 없습니다.'}${draft ? `<br>임시 저장본: ${new Date(draft.t).toLocaleString('ko-KR')}` : ''}</p></div>
    <div class="box"><h3>서버 쓰기 권한</h3><p class="hint2" style="margin:0 0 .6rem">${user ? `로그인됨: ${esc(user)}` : '로그인하지 않은 상태입니다.'} 이 화면의 비밀번호는 화면 잠금용입니다. 서버 규칙을 "로그인한 계정만 쓰기"로 바꾸면 비밀번호를 알아도 서버 데이터를 고칠 수 없게 되고, 저장할 때 위 로그인 창이 나옵니다.</p>
      <div class="bar-r" style="margin-top:0"><button class="btn btn--line" data-a="login">관리자 계정 로그인</button></div></div></div>`;
}
function parseXl(text) {
  const rows = text.split(/\r?\n/).map(l => l.split('\t').map(c => c.trim())).filter(c => c.length >= 6 && c[0] !== '브랜드' && c[1]);
  return rows.map(c => ({brand: c[0], lens: c[1], idx: c[2], spec: c[3], pOff: digits(c[4]), pSale: digits(c[5]), sMin: c[6], sMax: c[7], cMin: c[8], sumMax: c[9]}));
}
function xlPreview() {
  const text = $('#xl').value, rows = parseXl(text); A.xl = {text, rows};
  if (!rows.length) { $('#xl-out').innerHTML = '<p class="hint2">인식된 행이 없습니다. 탭으로 구분된 6열 이상이어야 합니다.</p>'; return; }
  const exist = new Set(allLenses().map(x => x.b.name + '|' + x.l.name)), lenses = new Set(rows.map(r => r.brand + '|' + r.lens));
  const nNew = [...lenses].filter(k => !exist.has(k)).length;
  $('#xl-out').innerHTML = `<p class="hint2" style="color:var(--ink)"><b>${rows.length}행</b> · 제품 ${lenses.size}개 (새 제품 ${nNew}개, 기존 제품 ${lenses.size - nNew}개). 같은 굴절률 행은 덮어씁니다.</p>
    <div class="pv-wrap"><table class="pv"><thead><tr><th>브랜드</th><th>제품명</th><th>굴절률</th><th>설계</th><th>정가</th><th>판매가</th><th>S최소</th><th>S최대</th><th>C최소</th></tr></thead><tbody>${rows.slice(0, 40).map(r => `<tr><td>${esc(r.brand)}</td><td>${esc(r.lens)}</td><td>${esc(r.idx)}</td><td>${esc(r.spec)}</td><td>${money(r.pOff)}</td><td>${money(r.pSale)}</td><td>${esc(r.sMin)}</td><td>${esc(r.sMax)}</td><td>${esc(r.cMin)}</td></tr>`).join('')}</tbody></table></div>
    <div class="bar-r"><button class="btn btn--p" data-a="xl-apply">이 내용 적용하기</button></div>`;
}
function xlApply() {
  const rows = A.xl && A.xl.rows; if (!rows || !rows.length) return;
  const tabId = $('#xl-tab').value, num = v => (v === undefined || v === '' || isNaN(Number(v))) ? undefined : Number(v);
  rows.forEach(r => {
    let b = D.brands.find(x => x.name === r.brand); if (!b) { b = {name: r.brand, lenses: []}; D.brands.push(b); }
    let l = b.lenses.find(x => x.name === r.lens);
    if (!l) { l = {_id: uid(), name: r.lens, tabId, bgColor: '#205e9d', desc: '', isSale: false, items: [], targetAges: ['adult'], targetIssues: [], order: nextOrder(tabId)}; b.lenses.push(l); }
    const item = {idx: r.idx, spec: r.spec, pOff: r.pOff, pSale: r.pSale}, put = (k, v) => { if (v !== undefined) item[k] = v; };
    put('sMin', num(r.sMin)); put('sMax', num(r.sMax)); put('cMin', num(r.cMin)); put('sumMax', num(r.sumMax));
    const at = l.items.findIndex(x => x.idx === r.idx); if (at >= 0) l.items[at] = item; else l.items.push(item);
  });
  A.xl = null; touch(); renderAll(); toast(`${rows.length}행을 적용했습니다 · 저장 전 내용을 확인하세요`);
}
function downloadBackup() {
  const a = document.createElement('a'), d = new Date(), p = n => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(cleanObj(), null, 1)], {type: 'application/json'}));
  a.download = `eyegentry_backup_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.json`; a.click();
}
function importBackup(file) {
  const rd = new FileReader();
  rd.onload = async () => {
    try {
      const raw = JSON.parse(rd.result); if (!raw || !Array.isArray(toArr(raw.brands)) || !raw.brands) throw new Error('형식 오류');
      const r = norm(raw), n = r.d.brands.reduce((s, b) => s + b.lenses.length, 0);
      if (!(await confirmBox(`백업 파일을 불러올까요?\n제품 ${n}개 · 매트릭스 ${r.d.matrices.length}개 · 분류 ${r.d.categories.filter(c => c.id !== 'ai').length}개\n\n현재 화면의 편집 내용은 대체됩니다. (서버에는 저장 전까지 영향 없음)`, '불러오기', true))) return;
      D = r.d; A.sel = null; touch(); renderAll(); toast('백업을 불러왔습니다 · 저장 전 내용을 확인하세요');
    } catch (e) { toast('올바른 백업 파일이 아닙니다'); }
  };
  rd.readAsText(file);
}

/* ═════════ 입력 반영 ═════════ */
function targetObj(t) {
  const d = t.dataset;
  switch (d.s) {
    case 'lens': return (lensById(A.sel) || {}).l;
    case 'item': return (lensById(A.sel) || {l: {items: []}}).l.items[+d.it];
    case 'mat': return matById(A.sel);
    case 'col': return (matById(A.sel) || {cols: []}).cols[+d.col];
    case 'colp': { const c = (matById(A.sel) || {cols: []}).cols[+d.col]; if (!c) return null; c.prices = c.prices || {}; c.prices[d.pk] = c.prices[d.pk] || {}; return c.prices[d.pk]; }
    case 'colo': { const c = (matById(A.sel) || {cols: []}).cols[+d.col]; return c && toArr(c.opts)[+d.oi] ? (c.opts = toArr(c.opts))[+d.oi] : null; }
    case 'colv': { const c = (matById(A.sel) || {cols: []}).cols[+d.col]; if (!c) return null; c.view = c.view || {}; return c.view; }
    case 'mopt': { const m = matById(A.sel); return m && toArr(m.opts)[+d.oi] ? (m.opts = toArr(m.opts))[+d.oi] : null; }
    case 'tab': return D.categories.find(c => c.id === d.tid);
    case 'issue': return D.issues.find(i => i.id === d.iid);
    case 'img': return imgById(d.mid);
    case 'brand': return D.brands[+d.bi];
  }
}
function applyField(t) {
  const o = targetObj(t); if (!o) return;
  const f = t.dataset.f, ty = t.dataset.ty || 'str';
  if (ty === 'money') { const dg = digits(t.value); o[f] = dg; t.value = dg ? Number(dg).toLocaleString() : ''; if (t.dataset.s === 'item') updatePct(t); }
  else if (ty === 'num') { if (t.value === '' || isNaN(Number(t.value))) delete o[f]; else o[f] = Number(t.value); }
  else if (ty === 'color') { if (t.type === 'text' && !/^#[0-9a-f]{3,8}$/i.test(t.value)) return; o[f] = t.value; const pair = $$('[data-ty="color"]', t.parentElement).find(x => x !== t); if (pair && (pair.type === 'text' || /^#[0-9a-f]{6}$/i.test(t.value))) pair.value = pair.type === 'color' ? hex6(t.value) : t.value; }
  else o[f] = t.value;
  touch(); refreshSide();
}
function updatePct(t) {
  const row = t.closest('.it'); if (!row) return;
  const off = Number(digits($('[data-f="pOff"]', row).value)), sale = Number(digits($('[data-f="pSale"]', row).value));
  $('.it__pct', row).textContent = off > sale && sale > 0 ? '−' + Math.round((1 - sale / off) * 100) + '%' : '';
}
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'f-q') { A.q = t.value; renderPList(); return; }
  if (t.dataset && t.dataset.f && t.dataset.s) {
    if (t.dataset.ty === 'sel' || t.dataset.ty === 'sel-r') return;     // select는 change에서 처리
    applyField(t);
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-tab') { A.tab = t.value; renderPList(); return; }
  if (t.dataset.aChange === 'lens-brand') {
    const f = lensById(A.sel); if (!f) return; const nb = D.brands[+t.value];
    if (nb && nb !== f.b) { f.b.lenses.splice(f.b.lenses.indexOf(f.l), 1); nb.lenses.push(f.l); touch(); renderPList(); renderPEd(); }
    return;
  }
  if (t.dataset.s && (t.dataset.ty === 'sel' || t.dataset.ty === 'sel-r')) {
    const o = targetObj(t); if (!o) return; o[t.dataset.f] = t.value; touch(); refreshSide();
    if (t.dataset.ty === 'sel-r') renderView(); else if (A.view === 'products') renderPEd(); else if (A.view === 'matrix') renderMEd();
  }
});

/* ═════════ 동작 ═════════ */
function newBrandOptions(sel) { return D.brands.map((b, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(b.name)}</option>`).join(''); }
async function newLens() {
  const r = await dialog(`<h3>새 제품</h3><div class="fd"><label>브랜드</label><select class="in" name="b">${newBrandOptions(0)}<option value="new">+ 새 브랜드…</option></select></div>
    <div class="fd"><label>새 브랜드 이름 (위에서 "새 브랜드" 선택 시)</label><input class="in" name="bn"></div>
    <div class="fd"><label>제품명</label><input class="in" name="n" placeholder="예: 클리어뷰 블루가드"></div>
    <div class="fd"><label>분류</label><select class="in" name="t">${realTabs().map(c => `<option value="${esc(c.id)}" ${c.id === (A.tab !== 'all' ? A.tab : '') ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="row2"><button class="btn btn--line" data-d="no">취소</button><button class="btn btn--p" data-d="ok">만들기</button></div>`);
  if (!r) return;
  let b = r.b === 'new' ? null : D.brands[+r.b];
  if (!b) { const nm = (r.bn || '').trim(); if (!nm) return toast('브랜드 이름을 입력하세요'); b = D.brands.find(x => x.name === nm) || (D.brands.push({name: nm, lenses: []}), D.brands[D.brands.length - 1]); }
  const l = {_id: uid(), name: (r.n || '').trim() || '새 제품', tabId: r.t, bgColor: '#205e9d', desc: '', isSale: false, targetAges: ['adult'], targetIssues: [], order: nextOrder(r.t),
    items: IDX_SEQ.map(ix => ({idx: ix, spec: '', pOff: '', pSale: '', sMin: -10, sMax: 6, cMin: -4}))};
  b.lenses.push(l); A.sel = l._id; A.mode = 'edit'; if (A.tab !== 'all') A.tab = r.t; touch(); renderAll();
}
async function manageBrands() {
  const draw = () => {
    openSheet(`<div class="sh-h"><h2>브랜드 관리</h2><button class="btn btn--x" data-a="close-sheet">${ICO.x}</button></div><div class="sh-b"><div class="ord">${D.brands.map((b, i) =>
      `<div class="ordr"><div class="t"><input class="in" data-s="brand" data-bi="${i}" data-f="name" value="${esc(b.name)}"><small>제품 ${b.lenses.length}개</small></div><button class="xbtn" data-a="brand-del" data-i="${i}" aria-label="삭제">${ICO.x}</button></div>`).join('')}</div>
      <div class="bar-r"><input class="in" id="new-brand" placeholder="새 브랜드 이름" style="max-width:18rem"><button class="btn btn--p btn--s" data-a="brand-new">${ICO.plus}추가</button></div></div>`);
  };
  manageBrands.draw = draw; draw();
}
async function onAction(a, t) {
  const d = t.dataset;
  switch (a) {
    case 'nav': A.view = d.v; A.sel = null; A.mode = 'edit'; renderAll(); return;
    case 'save': return save();
    case 'revert': return revert();
    case 'sel': A.sel = d.id; A.mode = 'edit'; if (A.view === 'products') { renderPList(); renderPEd(); $('.adm-split').classList.add('has-sel'); } else { renderMList(); renderMEd(); $('.adm-split').classList.add('has-sel'); } return;
    case 'unsel': A.sel = null; if (A.view === 'tabs') { $('.adm-split').classList.remove('has-sel'); return; } renderView(); return;
    case 'mode': A.mode = d.v; renderPEd(); return;
    case 'lens-new': return newLens();
    case 'lens-dup': { const f = lensById(A.sel); if (!f) return; const c = JSON.parse(JSON.stringify(f.l, (k, v) => k === '_id' ? undefined : v)); c._id = uid(); c.name += ' (복사)'; c.order = nextOrder(c.tabId); f.b.lenses.push(c); A.sel = c._id; touch(); renderAll(); return; }
    case 'lens-del': { const f = lensById(A.sel); if (!f || !(await confirmBox(`"${f.b.name} ${f.l.name}" 제품을 삭제할까요?\n서버에 저장하기 전에는 되돌릴 수 있습니다.`, '삭제', true))) return; f.b.lenses.splice(f.b.lenses.indexOf(f.l), 1); A.sel = null; touch(); renderAll(); return; }
    case 'tog': { const o = lensById(A.sel)?.l || matById(A.sel) || imgById(A.sel); if (!o) return; const arr = toArr(o[d.k]), i = arr.indexOf(d.v); i >= 0 ? arr.splice(i, 1) : arr.push(d.v); o[d.k] = arr; touch(); (A.view === 'products' ? renderPEd : A.view === 'matrix' ? renderMEd : renderView)(); return; }
    case 'tog-sale': { const f = lensById(A.sel); if (!f) return; f.l.isSale = !f.l.isSale; touch(); renderPList(); renderPEd(); return; }
    case 'item-add': { const f = lensById(A.sel); if (!f) return; const its = f.l.items, last = its[its.length - 1] || {}, ni = IDX_SEQ[(IDX_SEQ.indexOf(last.idx) + 1) % IDX_SEQ.length];
      its.push({idx: ni, spec: last.spec || '', pOff: '', pSale: '', ...(last.sMin !== undefined && {sMin: last.sMin}), ...(last.sMax !== undefined && {sMax: last.sMax}), ...(last.cMin !== undefined && {cMin: last.cMin})}); touch(); renderPEd(); renderPList(); return; }
    case 'item-del': { const f = lensById(A.sel); if (!f) return; f.l.items.splice(+d.i, 1); touch(); renderPEd(); renderPList(); return; }
    case 'item-sort': { const f = lensById(A.sel); if (!f) return; f.l.items.sort((x, y) => parseFloat(x.idx) - parseFloat(y.idx)); touch(); renderPEd(); return; }
    case 'brands': return manageBrands();
    case 'close-sheet': closeSheet(); renderAll(); return;
    case 'brand-new': { const v = $('#new-brand').value.trim(); if (!v) return; D.brands.push({name: v, lenses: []}); touch(); manageBrands.draw(); return; }
    case 'brand-del': { const b = D.brands[+d.i]; if (!b) return; if (b.lenses.length) return toast('제품이 남아 있는 브랜드는 삭제할 수 없습니다. 제품을 옮기거나 삭제해 주세요.'); D.brands.splice(+d.i, 1); touch(); manageBrands.draw(); return; }
    case 'mat-new': { const m = {_id: uid(), brand: '', name: '새 매트릭스', brandColor: '#f5faff', tabId: (realTabs().find(c => c.name.includes('다초점')) || realTabs()[0] || {}).id || '', targetAges: ['adult'], targetIssues: [], order: 0, cols: [newCol()]}; m.order = nextOrder(m.tabId); D.matrices.push(m); A.sel = m._id; touch(); renderAll(); return; }
    case 'mat-dup': { const m = matById(A.sel); if (!m) return; const c = JSON.parse(JSON.stringify(m, (k, v) => k === '_id' ? undefined : v)); c._id = uid(); c.name += ' (복사)'; c.order = nextOrder(c.tabId); D.matrices.push(c); A.sel = c._id; touch(); renderAll(); return; }
    case 'mat-del': { const m = matById(A.sel); if (!m || !(await confirmBox(`"${m.name}" 매트릭스를 삭제할까요?`, '삭제', true))) return; D.matrices.splice(D.matrices.indexOf(m), 1); A.sel = null; touch(); renderAll(); return; }
    case 'col-add': { const m = matById(A.sel); if (!m) return; m.cols.push(newCol()); touch(); renderMEd(); return; }
    case 'col-del': { const m = matById(A.sel); if (!m) return; if (m.cols.length > 1 || await confirmBox('마지막 열입니다. 삭제할까요?', '삭제', true)) { m.cols.splice(+d.i, 1); touch(); renderMEd(); } return; }
    case 'col-dup': { const m = matById(A.sel); if (!m) return; m.cols.splice(+d.i + 1, 0, JSON.parse(JSON.stringify(m.cols[+d.i]))); touch(); renderMEd(); return; }
    case 'col-mv': { const m = matById(A.sel), i = +d.i, j = i + Number(d.d); if (!m || j < 0 || j >= m.cols.length) return; [m.cols[i], m.cols[j]] = [m.cols[j], m.cols[i]]; touch(); renderMEd(); return; }
    case 'mgrid': A.mgrid = d.v === '1'; renderMEd(); return;
    case 'mopt-add': { const m = matById(A.sel); if (!m) return; m.opts = toArr(m.opts); m.opts.push({n: '', p: ''}); touch(); renderMEd(); return; }
    case 'mopt-del': { const m = matById(A.sel); if (!m) return; m.opts = toArr(m.opts); m.opts.splice(+d.oi, 1); touch(); renderMEd(); return; }
    case 'mopt-derive': { const m = matById(A.sel); if (!m) return; m.opts = deriveOpts(m).map(o => ({n: o.n, p: String(o.p)})); touch(); renderMEd(); toast('공통 옵션으로 변환했습니다'); return; }
    case 'col-opt-add': { const m = matById(A.sel); if (!m) return; const c = m.cols[+d.i]; c.opts = toArr(c.opts); c.opts.push({n: '', p: ''}); touch(); renderMEd(); return; }
    case 'col-opt-del': { const m = matById(A.sel); if (!m) return; const c = m.cols[+d.i]; c.opts = toArr(c.opts); c.opts.splice(+d.oi, 1); touch(); renderMEd(); return; }
    case 'bulk-apply': return bulkApply();
    case 'mx-paste': return mxPaste();
    case 'col-sale': { const m = matById(A.sel); if (!m) return; const c = m.cols[+d.i]; c.isSale = !c.isSale; touch(); renderMEd(); return; }
    case 'tab-new': { const id = 't' + Date.now(); D.categories.push({id, name: '새 분류', img: '', order: (realTabs().length + 1) * 10}); A.selTab = id; touch(); renderView(); $('.adm-split').classList.add('has-sel'); return; }
    case 'tab-sel': A.selTab = d.id; renderTList(); renderTEd(); $('.adm-split').classList.add('has-sel'); return;
    case 'tab-mv': { const tabs = realTabs(), i = tabs.findIndex(x => x.id === A.selTab), j = i + Number(d.d); if (j < 0 || j >= tabs.length) return; [tabs[i], tabs[j]] = [tabs[j], tabs[i]]; tabs.forEach((x, k) => x.order = (k + 1) * 10); touch(); renderTList(); renderTEd(); return; }
    case 'tab-del': { const t = D.categories.find(c => c.id === A.selTab), n = tabCount(A.selTab); if (!t) return;
      if (!(await confirmBox(`"${t.name}" 분류를 삭제할까요?${n ? `\n이 분류의 항목 ${n}개는 "미지정"이 되어 가격표에 보이지 않게 됩니다.` : ''}`, '삭제', true))) return;
      allLenses().forEach(x => { if (x.l.tabId === t.id) x.l.tabId = ''; }); D.matrices.forEach(m => { if (m.tabId === t.id) m.tabId = ''; }); D.images.forEach(m => { if (m.tabId === t.id) m.tabId = ''; });
      D.categories.splice(D.categories.indexOf(t), 1); A.selTab = null; touch(); renderView(); return; }
    case 'ord-mv': moveInTab(d.id, Number(d.d)); touch(); renderTEd(); return;
    case 'issue-new': { const v = $('#new-issue').value.trim(); if (!v) return; D.issues.push({id: 'is' + Date.now(), name: v}); touch(); renderView(); return; }
    case 'issue-del': { const i = D.issues.find(x => x.id === d.id); if (!i || !(await confirmBox(`"${i.name}" 증상을 삭제할까요?`, '삭제', true))) return; D.issues.splice(D.issues.indexOf(i), 1); allLenses().forEach(x => { x.l.targetIssues = toArr(x.l.targetIssues).filter(v => v !== d.id); }); touch(); renderView(); return; }
    case 'img-new': { const m = {_id: uid(), name: '새 카드', url: '', tabId: (realTabs()[0] || {}).id || '', cardType: 'image', height: 600, targetAges: AGES.map(a => a.id), targetIssues: [], order: 0}; m.order = nextOrder(m.tabId); D.images.push(m); touch(); renderView(); return; }
    case 'img-del': { const m = imgById(d.id); if (!m || !(await confirmBox(`"${m.name}" 카드를 삭제할까요?`, '삭제', true))) return; D.images.splice(D.images.indexOf(m), 1); touch(); renderView(); return; }
    case 'xl-parse': return xlPreview();
    case 'xl-apply': return xlApply();
    case 'backup-dl': return downloadBackup();
    case 'backup-up': return $('#backup-file').click();
    case 'snap-restore': { const s = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null'); if (!s || !(await confirmBox('마지막 저장 직전의 가격표로 화면을 되돌릴까요?\n되돌린 뒤 "서버에 저장"을 눌러야 가격표에 반영됩니다.', '되돌리기', true))) return; D = norm(s.data).d; A.sel = null; touch(); renderAll(); return; }
    case 'login': return openLogin().then(() => renderView());
  }
}
document.addEventListener('click', e => {
  if (e.target.id === 'scrim') { closeSheet(); renderAll(); return; }
  const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
  onAction(t.dataset.a, t);
});
document.addEventListener('change', e => { if (e.target.id === 'backup-file' && e.target.files[0]) { importBackup(e.target.files[0]); e.target.value = ''; } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#scrim').hidden) { closeSheet(); renderAll(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && D) { e.preventDefault(); save(); }
});
$('#btn-logout').addEventListener('click', () => { sessionStorage.removeItem(OK_KEY); location.reload(); });
initGate();
