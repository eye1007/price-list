/* 아이젠트리 V2 · 3D 시뮬레이션 (필요할 때만 불러오는 모듈)
   three.js는 index.html의 import map으로 CDN에서 불러옵니다. 모두 개념 설명용 모델입니다. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const Sim = window.Sim;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const rand = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);   // 항상 같은 거리 모양이 나오도록 고정 시드
const pick = a => a[Math.floor(rand() * a.length)];
const HANGUL = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후';
const VOC = ['안경','렌즈','시력','검사','상담','예약','고객','도수','맞춤','코팅','근시','원시','난시','누진','다초점','설계','두께','편안한','선명한','자연스러운','시야','착용','관리','점검','조절','추천','제작','수령','방문','피로','건조','운전','독서','휴대폰','모니터','사무실','가족','여행','사진','건강','생활','습관','눈','안구','보호','정기','검진','변화','확인'];
const words = n => Array.from({length: n}, () => pick(VOC)).join(' ');

/* 지붕·창문이 있는 건물 외벽 */
function facadeTex(base, glass) {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 18; y < h - 70; y += 46) for (let x = 14; x < w - 20; x += 40) {
      const gr = g.createLinearGradient(x, y, x + 26, y + 32); gr.addColorStop(0, glass); gr.addColorStop(1, '#e6eef5');
      g.fillStyle = gr; g.fillRect(x, y, 26, 32); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + 32, 26, 3);
    }
    g.fillStyle = 'rgba(20,24,30,.55)'; g.fillRect(0, h - 64, w, 64);
    g.fillStyle = '#cfe0ec'; for (let x = 12; x < w - 20; x += 60) g.fillRect(x, h - 56, 46, 48);
  });
}
function newspaperTex() {
  return canvasTex(1024, 740, (g, w, h) => {
    g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#15171c'; g.font = '900 64px sans-serif'; g.fillText('아이젠트리 신문', 40, 86);
    g.fillRect(40, 104, w - 80, 4); g.font = '800 34px sans-serif'; g.fillText('가까운 글씨도 편안하게 보는 방법', 40, 158);
    g.fillStyle = '#9aa1ad'; g.fillRect(40, 190, 300, 200);
    g.fillStyle = '#2b2f36';
    const col = (x, y, wd, lines, size) => { g.font = `600 ${size}px sans-serif`; for (let i = 0; i < lines; i++) g.fillText(words(Math.floor(wd / (size * 2.6))), x, y + i * size * 1.55); };
    col(40, 420, 300, 12, 18); col(370, 200, 300, 26, 18); col(700, 200, 290, 26, 18);
  });
}
function screenTex() {
  return canvasTex(512, 330, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#0b6b7e'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#fff'; g.font = '800 18px sans-serif'; g.fillText('렌즈 상담 노트', 14, 23);
    g.fillStyle = '#15171c'; g.font = '800 22px sans-serif'; g.fillText('오늘의 일정', 18, 70);
    g.fillStyle = '#4b5563'; g.font = '600 15px sans-serif';
    ['09:30  김서연 님 · 시력검사 및 상담', '10:30  박민준 님 · 누진다초점 맞춤', '11:30  이도윤 님 · 어린이 근시 관리', '13:30  최하은 님 · 블루라이트 렌즈', '14:30  정우진 님 · 안경 수령', '15:30  한지민 님 · 도수 조정', '16:30  오세훈 님 · 변색렌즈 상담', '17:30  신유나 님 · 콘택트렌즈 예약', '18:00  마감 · 재고 확인'].forEach((t, i) => g.fillText(t, 18, 100 + i * 24));
    g.fillStyle = '#cfe4ea'; g.fillRect(360, 54, 130, 110); g.fillStyle = '#0b6b7e'; g.font = '800 13px sans-serif'; g.fillText('오늘 예약 8건', 372, 112);
  });
}function phoneTex() {
  return canvasTex(160, 330, (g, w, h) => {
    g.fillStyle = '#0f1c2e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = '800 30px sans-serif'; g.fillText('10:24', 34, 70);
    for (let i = 0; i < 8; i++) { g.fillStyle = ['#0b6b7e', '#d92d20', '#f2c029', '#19b36b'][i % 4]; g.fillRect(16 + (i % 4) * 34, 110 + Math.floor(i / 4) * 40, 26, 26); }
    g.fillStyle = '#e5e7eb'; g.font = '600 12px sans-serif'; for (let i = 0; i < 6; i++) g.fillText(words(3), 16, 220 + i * 18);
  });
}
function skyTex() {
  return canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb4e3'); gr.addColorStop(.55, '#cfe3f2'); gr.addColorStop(1, '#f2ede2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}

function buildStreet(scene) {
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .9, ...o});
  const add = (geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
  const ground = add(new THREE.PlaneGeometry(300, 300), M(0xd8d2c3), 0, 0, -60, false); ground.rotation.x = -Math.PI / 2;
  const road = add(new THREE.PlaneGeometry(10, 170), M(0x4a4f57), 0, .01, -78, false); road.rotation.x = -Math.PI / 2;
  for (let z = -18; z > -160; z -= 6) { const d = add(new THREE.PlaneGeometry(.18, 2.6), M(0xf3f3ee), 0, .02, z, false); d.rotation.x = -Math.PI / 2; }
  for (let x = -4.5; x <= 4.5; x += 1) { const s = add(new THREE.PlaneGeometry(.55, 3.2), M(0xf6f6f2), x, .02, -11, false); s.rotation.x = -Math.PI / 2; }
  [-1, 1].forEach(side => add(new THREE.BoxGeometry(5, .14, 170), M(0xc9c2b2), side * 7.5, .07, -78, false));
  const facades = [['#d9cbb4', '#9fb8cc'], ['#b9c4cf', '#8fa9c0'], ['#e6e1d6', '#a9c2d6'], ['#9aa7b5', '#c5d6e4'], ['#cdb9a5', '#9cb5c9']].map(([b, gl]) => facadeTex(b, gl));
  [-1, 1].forEach(side => {
    for (let z = -16; z > -150;) {
      const w = 9 + rand() * 6, d = 9 + rand() * 7, h = 9 + rand() * 26, tex = pick(facades).clone();
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, Math.round(d / 7)), Math.max(1, Math.round(h / 9))); tex.needsUpdate = true;
      add(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({map: tex, roughness: .85}), side * (10.5 + w / 2), h / 2, z - d / 2);
      z -= d + .6;
    }
  });
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(18, 20 + rand() * 30, 8), M(0xb8c3cf), -36 + i * 16, 15, -165, false);
  const trunk = M(0x6b4f3a), leaf = new THREE.MeshStandardMaterial({color: 0x5f9a4a, roughness: .8, flatShading: true});
  [-1, 1].forEach(side => { for (let i = 0; i < 12; i++) { const z = -7 - i * 10; add(new THREE.CylinderGeometry(.12, .16, 2.6, 8), trunk, side * 6.3, 1.3, z); const c = add(new THREE.IcosahedronGeometry(1.5 + rand() * .4, 1), leaf, side * 6.3, 3.4 + rand() * .4, z); c.scale.y = 1.1; } });
  add(new THREE.CylinderGeometry(.07, .07, 3.4, 8), M(0x2f3540), 5.4, 1.7, -9.6);
  add(new THREE.BoxGeometry(.32, .8, .28), M(0x1f2329), 5.4, 3.3, -9.6);
  add(new THREE.SphereGeometry(.09, 12, 8), new THREE.MeshStandardMaterial({color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.4}), 5.4, 3.1, -9.45, false);
  const car = (x, z, col) => { add(new THREE.BoxGeometry(1.8, .7, 4.2), M(col, {roughness: .4, metalness: .3}), x, .6, z); add(new THREE.BoxGeometry(1.6, .55, 2.2), M(0x2b3440, {roughness: .2}), x, 1.2, z + .2); [-.85, .85].forEach(dx => [-1.4, 1.4].forEach(dz => { const w = add(new THREE.CylinderGeometry(.33, .33, .25, 14), M(0x15171c), x + dx, .33, z + dz); w.rotation.z = Math.PI / 2; })); };
  car(2.6, -26, 0xd92d20); car(-2.6, -44, 0xe5e7eb); car(2.6, -70, 0x1d4ed8);
  // 앞쪽 카페 테이블: 신문(근거리) · 노트북(중간 거리) · 휴대폰 · 커피
  // 두 렌즈의 중심선(좌우 약 ±19°) 아래에 근거리 물건, 그 위에 중간 거리 화면을 둠
  add(new THREE.BoxGeometry(1.6, .04, 1.0), M(0xb08a63, {roughness: .6}), 0, .74, .98);
  const paper = add(new THREE.PlaneGeometry(.42, .3), new THREE.MeshStandardMaterial({map: newspaperTex(), roughness: .95}), -.31, .763, 1.13, false); paper.rotation.x = -Math.PI / 2; paper.rotation.z = .05;
  const book = add(new THREE.PlaneGeometry(.42, .3), new THREE.MeshStandardMaterial({map: newspaperTex(), roughness: .95}), .31, .763, 1.13, false); book.rotation.x = -Math.PI / 2; book.rotation.z = -.05;
  const screen = (x, tex) => {
    add(new THREE.BoxGeometry(.36, .018, .25), M(0x9ca3af, {roughness: .4, metalness: .5}), x, .77, .62);
    const scr = add(new THREE.BoxGeometry(.36, .24, .012), new THREE.MeshStandardMaterial({color: 0x9ca3af, metalness: .5, roughness: .4}), x, .89, .5); scr.rotation.x = -.22;
    const disp = add(new THREE.PlaneGeometry(.33, .21), new THREE.MeshBasicMaterial({map: tex}), x, .89, .507, false); disp.rotation.x = -.22;
  };
  screen(.46, screenTex()); screen(-.46, screenTex());
  const ph = add(new THREE.BoxGeometry(.075, .009, .155), M(0x15171c, {roughness: .3}), .02, .765, 1.2); ph.rotation.y = -.25;
  const phs = add(new THREE.PlaneGeometry(.068, .145), new THREE.MeshBasicMaterial({map: phoneTex()}), .02, .7705, 1.2, false); phs.rotation.x = -Math.PI / 2; phs.rotation.z = -.25;
  add(new THREE.CylinderGeometry(.085, .085, .01, 24), M(0xffffff, {roughness: .3}), .02, .765, .8);
  add(new THREE.CylinderGeometry(.045, .038, .09, 20), M(0xffffff, {roughness: .3}), .02, .815, .8);
}

/* 안경테 모양 (둥근 사각) 경로: 중심 cx,cy, 폭 w, 높이 h */
function lensPath(cx, cy, w, h) {
  const x0 = cx - w / 2, y0 = cy - h / 2, rx = w * .3, ry = h * .34;
  return `M${x0 + rx},${y0} H${x0 + w - rx} Q${x0 + w},${y0} ${x0 + w},${y0 + ry} V${y0 + h - ry * 1.2} Q${x0 + w},${y0 + h} ${x0 + w - rx * 1.3},${y0 + h} H${x0 + rx * 1.3} Q${x0},${y0 + h} ${x0},${y0 + h - ry * 1.2} V${y0 + ry} Q${x0},${y0} ${x0 + rx},${y0} Z`;
}

/* ═════════ 다초점 3D 착용 시점 ═════════ */
function mountProgFP(el, opt = {}) {
  const TI = Sim.TIERS, st = {tier: opt.tier || 1, add: opt.add || 1.5, yaw: 0, pitch: 0, hold: 0};
  el.innerHTML = `<div class="p3"><canvas class="p3-gl"></canvas><canvas class="p3-blur"></canvas><div class="p3-tint"></div><svg class="p3-frame"></svg><div class="p3-tags"></div>
      <div class="p3-hint">화면을 끌어 둘러보세요</div></div>
    <div class="p3-ctl"><div class="seg" data-k="tier">${TI.map(t => `<button data-v="${t.id}" class="${t.id === st.tier ? 'is-on' : ''}">${t.name}</button>`).join('')}</div>
      <label class="pg-addc">ADD<input type="range" class="p3-add" min="0.75" max="3.5" step="0.25" value="${st.add}" aria-label="ADD"><b class="num pg-addv p3-addv">+${st.add.toFixed(2)}</b></label></div>
    <p class="sim-cap">안경을 쓴 사람의 눈으로 본 모습입니다. 위쪽으로 먼 거리, 가운데로 노트북, 아래쪽으로 신문을 봅니다. <b>붉게 흐린 곳</b>이 렌즈 양옆의 왜곡 영역이고, ADD가 클수록·등급이 낮을수록 넓어집니다. <small>개념 설명용 3D입니다.</small></p>`;
  const box = el.querySelector('.p3'), gl = box.querySelector('.p3-gl'), bc = box.querySelector('.p3-blur'), tint = box.querySelector('.p3-tint'), frame = box.querySelector('.p3-frame'), tags = box.querySelector('.p3-tags');
  const bctx = bc.getContext('2d');
  const renderer = new THREE.WebGLRenderer({canvas: gl, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = skyTex(); scene.fog = new THREE.Fog(0xdde6ee, 45, 170);
  scene.add(new THREE.HemisphereLight(0xe3f0ff, 0xd8cbb0, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4); sun.position.set(-18, 30, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, {left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90}); scene.add(sun);
  buildStreet(scene);
  const cam = new THREE.PerspectiveCamera(62, 1.6, .03, 400); cam.position.set(0, 1.22, 2.02);
  let W = 0, H = 0, raf = 0, L = null, R = null;
  function layout() {
    W = box.clientWidth; H = box.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
    bc.width = Math.round(W / 2); bc.height = Math.round(H / 2);
    const lw = W * .37, lh = H * .66; L = {cx: W * .285, cy: H * .52, w: lw, h: lh}; R = {cx: W * .715, cy: H * .52, w: lw, h: lh};
    const lp = lensPath(L.cx, L.cy, L.w, L.h), rp = lensPath(R.cx, R.cy, R.w, R.h), sw = Math.max(6, W * .014);
    frame.setAttribute('viewBox', `0 0 ${W} ${H}`);
    frame.innerHTML = `<path d="M0,0H${W}V${H}H0Z ${lp} ${rp}" fill="rgba(10,14,22,.32)" fill-rule="evenodd"/>
      <path d="${lp}" fill="none" stroke="#15171c" stroke-width="${sw}"/><path d="${rp}" fill="none" stroke="#15171c" stroke-width="${sw}"/>
      <path d="M${L.cx + L.w / 2},${L.cy - L.h * .3} Q${W / 2},${L.cy - L.h * .42} ${R.cx - R.w / 2},${R.cy - R.h * .3}" fill="none" stroke="#15171c" stroke-width="${sw * 1.1}"/>
      <path d="M${L.cx - L.w / 2},${L.cy - L.h * .32} L0,${L.cy - L.h * .4}" stroke="#15171c" stroke-width="${sw * 1.2}"/><path d="M${R.cx + R.w / 2},${R.cy - R.h * .32} L${W},${R.cy - R.h * .4}" stroke="#15171c" stroke-width="${sw * 1.2}"/>
      <path d="${lp}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5" transform="translate(${sw * .3} ${sw * .3})"/><path d="${rp}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5" transform="translate(${sw * .3} ${sw * .3})"/>`;
    tags.innerHTML = [['원거리', .16], ['중간', .56], ['근거리', .86]].map(([t, f]) => `<span style="left:${R.cx}px;top:${R.cy - R.h / 2 + R.h * f}px">${t}</span>`).join('');
    applyZone();
  }
  function applyZone() {
    if (!L) return;
    const s = Sim.progScores({}, st.tier), zone = Sim.clearZonePath({}, st.add, st.tier);
    const lens = (b, id) => { const lp = lensPath(b.cx, b.cy, b.w, b.h), sx = b.w / 200, sy = b.h / 200;
      return `<clipPath id="${id}"><path d="${lp}"/></clipPath><g clip-path="url(#${id})"><path fill-rule="evenodd" fill="#000" transform="translate(${b.cx - b.w / 2} ${b.cy - b.h / 2}) scale(${sx} ${sy})" d="M-60,-60H260V260H-60Z ${zone}"/></g>`; };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><filter id="f" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${(W * .006).toFixed(1)}"/></filter></defs><g filter="url(#f)">${lens(L, 'a')}${lens(R, 'b')}</g></svg>`;
    const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    [bc, tint].forEach(e => { e.style.webkitMaskImage = url; e.style.maskImage = url; });
    bc.style.filter = `blur(${((2 + st.add * 2.6) * (1.5 - s.side / 100) * W / 1000).toFixed(2)}px)`;
    tint.style.opacity = (.12 + st.add * .05).toFixed(2);
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!W) return;
    const idle = performance.now() > st.hold;
    const yaw = st.yaw + (idle ? Math.sin(t / 4200) * .05 : 0), pitch = st.pitch + (idle ? Math.sin(t / 5600) * .02 : 0);
    cam.rotation.set(-.16 + pitch, yaw, 0, 'YXZ');
    renderer.render(scene, cam);
    bctx.drawImage(gl, 0, 0, bc.width, bc.height);
  }
  let drag = null;
  const down = e => { drag = {x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch}; box.setPointerCapture(e.pointerId); box.classList.add('is-drag'); };
  const move = e => { if (!drag) return; st.yaw = clamp(drag.yaw + (e.clientX - drag.x) * .003, -.5, .5); st.pitch = clamp(drag.pitch + (e.clientY - drag.y) * .002, -.22, .22); st.hold = performance.now() + 5000; };
  const up = () => { drag = null; box.classList.remove('is-drag'); };
  box.addEventListener('pointerdown', down); box.addEventListener('pointermove', move); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  el.querySelector('[data-k=tier]').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.tier = opt.tier = +b.dataset.v; el.querySelectorAll('[data-k=tier] button').forEach(x => x.classList.toggle('is-on', x === b)); applyZone(); });
  const addIn = el.querySelector('.p3-add'); addIn.addEventListener('input', () => { st.add = opt.add = +addIn.value; el.querySelector('.p3-addv').textContent = '+' + st.add.toFixed(2); applyZone(); });
  const ro = new ResizeObserver(layout); ro.observe(box); layout(); raf = requestAnimationFrame(loop);
  return {
    update() {},
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
  };
}

/* ═════════ 오피스 렌즈: 책상 앞 3D 인물 · 시선 · 렌즈 영역 ═════════ */
function docTex() {
  return canvasTex(420, 594, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#15171c'; g.font = '900 30px sans-serif'; g.fillText('상담 기록지', 30, 56);
    g.fillStyle = '#0b6b7e'; g.fillRect(30, 72, 120, 6);
    const L = [['', '고객명   김서연 (만 34세)'], ['', '방문일   2026. 11. 04'], ['h', '시력 검사'], ['', 'R   S -2.25   C -0.75   AX 180'], ['', 'L   S -2.00   C -0.50   AX 175'], ['', 'PD 62 mm      ADD +1.50'],
      ['h', '상담 내용'], ['', '· 하루 8시간 이상 모니터 작업'], ['', '· 저녁 운전 시 빛번짐이 불편'], ['', '· 눈의 피로와 건조감 호소'], ['h', '추천 렌즈'], ['', '· 오피스 렌즈 (중간~근거리 중심)'], ['', '· 블루라이트 차단 코팅'], ['', '· 반사 방지(AR) 코팅'], ['h', '메모'], ['', '· 제작 5일 소요, 11/09 수령 예정'], ['', '· 수령 시 착용감 · 도수 재확인']];
    let y = 112; L.forEach(([k, t]) => { if (k === 'h') { y += 8; g.fillStyle = '#0b6b7e'; g.font = '800 17px sans-serif'; g.fillText(t, 30, y); y += 24; } else { g.fillStyle = '#374151'; g.font = '600 16px sans-serif'; g.fillText(t, 30, y); y += 26; } });
  });
}function clockTex() {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#1f2937'; g.stroke();
    g.fillStyle = '#1f2937'; g.font = '800 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(String(i), 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); }
    g.lineCap = 'round'; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 48, 128 - 30); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 20, 128 - 76); g.stroke();
  });
}
function mapTex() {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#f4f7fb'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b7bb9';
    [[60, 62, 34, 24], [96, 56, 26, 30], [140, 52, 44, 20], [182, 66, 30, 22], [78, 104, 18, 22], [150, 100, 22, 16]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, .3, 0, 7); g.fill(); });
    g.fillStyle = '#0f2238'; g.font = '800 15px sans-serif'; g.fillText('GLOBAL SIGHT', 14, 24); g.fillStyle = '#9fb3cc'; g.fillRect(14, 30, 70, 3);
  });
}
function buildOffice(scene, root = scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dee6, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2.5, 4, 2.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 12}); scene.add(key);
  const white = new THREE.MeshStandardMaterial({color: 0xf4f5f7, roughness: .75}), grey = new THREE.MeshStandardMaterial({color: 0x9aa3af, roughness: .5, metalness: .3});
  const dark = new THREE.MeshStandardMaterial({color: 0x1f2329, roughness: .4}), wood = new THREE.MeshStandardMaterial({color: 0xc99a66, roughness: .65}), teal = new THREE.MeshStandardMaterial({color: 0x2a6f7c, roughness: .6}), leaf = new THREE.MeshStandardMaterial({color: 0x3f9a5a, roughness: .8, flatShading: true});
  const add = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const limb = (a, b, r, mat = white, parent = root) => { const d = V().subVectors(b, a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), mat);
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m; };
  const floor = add(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({color: 0xcdb48f, roughness: .9}), 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  const rug = add(new THREE.PlaneGeometry(2.6, 1.9), new THREE.MeshStandardMaterial({color: 0x8fb3bf, roughness: 1}), 0, .004, .35); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
  {
  add(new THREE.PlaneGeometry(10, 3.4), new THREE.MeshStandardMaterial({color: 0xd5e4e9, roughness: 1}), 0, 1.7, -2.8);
  add(new THREE.BoxGeometry(10, .12, .05), new THREE.MeshStandardMaterial({color: 0x4f6b75, roughness: .8}), 0, .06, -2.78);
  add(new THREE.CircleGeometry(.36, 48), new THREE.MeshBasicMaterial({map: clockTex()}), .38, 2.15, -2.78);
  add(new THREE.BoxGeometry(1.24, .84, .03), dark, -1.25, 1.95, -2.79); add(new THREE.PlaneGeometry(1.16, .76), new THREE.MeshBasicMaterial({map: mapTex()}), -1.25, 1.95, -2.77);   // 세계 지도 포스터
  add(new THREE.BoxGeometry(1.3, .04, .24), wood, 1.7, 1.25, -2.66);                                                                                                            // 벽 선반 + 책 · 화분
  [[1.2, .26, 0xd9534f], [1.27, .3, 0x2d9bb5], [1.34, .24, 0xf2c14e], [1.41, .29, 0x3f9a5a], [1.48, .25, 0x7a6ad8]].forEach(([x, hgt, c]) => add(new THREE.BoxGeometry(.055, hgt, .17), new THREE.MeshStandardMaterial({color: c, roughness: .8}), x + .3, 1.27 + hgt / 2, -2.66));
  add(new THREE.CylinderGeometry(.06, .05, .09, 14), new THREE.MeshStandardMaterial({color: 0xc4694a, roughness: .8}), 2.2, 1.32, -2.66); add(new THREE.IcosahedronGeometry(.09, 1), leaf, 2.2, 1.45, -2.66);
  [[-1.6, -2.3], [1.9, -2.15]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.17, .13, .32, 16), new THREE.MeshStandardMaterial({color: 0xc4694a, roughness: .8}), x, .16, z); [[0, .62, 0, .3], [-.1, .5, .05, .22], [.1, .46, -.04, .2]].forEach(([dx, y, dz, r]) => { const l = add(new THREE.IcosahedronGeometry(r, 1), leaf, x + dx, y, z + dz); l.scale.y = 1.25; }); });
  }
  // 책상 · 모니터 2대 · 키보드 · 서류 · 휴대폰
  add(new THREE.BoxGeometry(1.6, .04, .8), wood, 0, .74, -.05);
  [[-.75, -.4], [.75, -.4], [-.75, .3], [.75, .3]].forEach(([x, z]) => add(new THREE.BoxGeometry(.04, .72, .04), dark, x, .36, z));
  const monitor = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    add(new THREE.BoxGeometry(.22, .015, .16), grey, 0, .768, 0, g); add(new THREE.BoxGeometry(.04, .3, .03), grey, 0, .9, -.01, g);
    add(new THREE.BoxGeometry(.62, .38, .025), dark, 0, 1.11, 0, g); add(new THREE.PlaneGeometry(.58, .34), new THREE.MeshBasicMaterial({map: screenTex()}), 0, 1.11, .0135, g); };
  monitor(0, -.3, 0); monitor(.66, -.18, -.55);
  add(new THREE.BoxGeometry(.44, .02, .14), white, 0, .77, .14);
  const paper = add(new THREE.PlaneGeometry(.21, .297), new THREE.MeshStandardMaterial({map: docTex(), roughness: .9}), 0, .762, -.07); paper.rotation.x = -Math.PI / 2; paper.rotation.z = .04;
  add(new THREE.BoxGeometry(.075, .009, .155), dark, .27, .765, .13);
  add(new THREE.CylinderGeometry(.032, .028, .085, 16), new THREE.MeshStandardMaterial({color: 0x2d9bb5, roughness: .4}), .46, .79, .1);                                       // 머그컵
  add(new THREE.CylinderGeometry(.05, .055, .02, 16), dark, -.62, .76, -.3); add(new THREE.CylinderGeometry(.008, .008, .3, 8), dark, -.62, .91, -.3); add(new THREE.ConeGeometry(.08, .1, 16), teal, -.62, 1.07, -.3).rotation.x = Math.PI;   // 스탠드
  // 의자 · 앉은 사람 (흰색 마네킹)
  add(new THREE.BoxGeometry(.48, .06, .46), teal, 0, .46, .64); add(new THREE.BoxGeometry(.46, .5, .05), teal, 0, .8, .88);
  add(new THREE.CylinderGeometry(.03, .03, .42, 10), grey, 0, .23, .64);
  limb(V(0, .56, .64), V(0, .98, .58), .14);
  limb(V(0, 1.04, .57), V(0, 1.12, .54), .045);
  [-1, 1].forEach(s => {
    limb(V(s * .19, 1.0, .58), V(s * .22, .81, .44), .046); limb(V(s * .22, .81, .44), V(s * .15, .79, .2), .04);
    add(new THREE.SphereGeometry(.045, 16, 12), white, s * .14, .79, .17);
    limb(V(s * .1, .52, .64), V(s * .11, .53, .22), .075); limb(V(s * .11, .53, .22), V(s * .11, .08, .16), .058);
    add(new THREE.BoxGeometry(.09, .06, .22), white, s * .11, .03, .1);
  });
  const neck = new THREE.Group(); neck.position.set(0, 1.12, .54); root.add(neck);
  const hd = add(new THREE.SphereGeometry(.105, 28, 20), white, 0, .1, -.01, neck); hd.scale.set(.86, 1, .96);
  const gl = new THREE.MeshStandardMaterial({color: 0x15171c, roughness: .3});
  [-1, 1].forEach(s => { const ring = add(new THREE.TorusGeometry(.03, .0045, 8, 28), gl, s * .039, .1, -.104, neck); ring.scale.y = .8; add(new THREE.BoxGeometry(.004, .004, .1), gl, s * .07, .11, -.055, neck); });
  add(new THREE.BoxGeometry(.018, .004, .004), gl, 0, .108, -.104, neck);
  return {neck, V, key};
}

function signTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0f2238'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2d9bb5'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#fff'; g.font = '900 74px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EYEGENTRY', w / 2, 104);
    g.fillStyle = '#9fb3cc'; g.font = '700 34px sans-serif'; g.fillText('아이젠트리 안경원', w / 2, 184);
  });
}
/* 야외 거리: 인도 · 길 · 건물 · 가로수 · 차 · 간판(원거리 목표) */
function buildStreetSet(root) {
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({color: c, roughness: .9, ...o});
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
  const flat = (w, d, c, x, y, z) => { const m = add(new THREE.PlaneGeometry(w, d), M(c), x, y, z); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; };
  flat(300, 300, 0xd3dccb, 0, -.02, -60); flat(9, 220, 0x6b7078, -5, .01, -90); flat(8, 220, 0xe4dfd3, 3.4, .012, -90);
  add(new THREE.BoxGeometry(.2, .12, 220), M(0xc9c2b2), -.6, .06, -90);
  for (let z = 4; z > -120; z -= 6) flat(.16, 2.6, 0xf3f3ee, -5, .02, z);
  [0xcfd6de, 0xb9c3ce, 0xe3e0d6, 0xa9b6c4, 0xd8cdbd, 0xc6ced8].forEach((c, i) => [-1, 1].forEach(s => { const h = 8 + ((i * 7 + (s > 0 ? 3 : 0)) % 5) * 5; add(new THREE.BoxGeometry(11, h, 13), M(c), s < 0 ? -15 : 13.5, h / 2, 4 - i * 15); }));
  const trunk = M(0x6b4f3a), leaf = new THREE.MeshStandardMaterial({color: 0x5f9a4a, roughness: .8, flatShading: true});
  for (let i = 0; i < 9; i++) { const z = 2 - i * 9; add(new THREE.CylinderGeometry(.1, .14, 2.4, 8), trunk, 5.6, 1.2, z); const c = add(new THREE.IcosahedronGeometry(1.3, 1), leaf, 5.6, 3.2, z); c.scale.y = 1.1; }
  const car = (x, z, c) => { add(new THREE.BoxGeometry(1.8, .7, 4.2), M(c, {roughness: .4, metalness: .3}), x, .6, z); add(new THREE.BoxGeometry(1.6, .55, 2.2), M(0x2b3440, {roughness: .2}), x, 1.2, z + .2); [-.85, .85].forEach(dx => [-1.4, 1.4].forEach(dz => { const w = add(new THREE.CylinderGeometry(.33, .33, .25, 14), M(0x15171c), x + dx, .33, z + dz); w.rotation.z = Math.PI / 2; })); };
  car(-6.4, -13, 0xd92d20); car(-3.6, -24, 0xe5e7eb); car(-6.4, -40, 0x1d4ed8);
  add(new THREE.CylinderGeometry(.06, .06, 2.6, 10), M(0x2f3540), 3.4, 1.3, -12.06);
  add(new THREE.BoxGeometry(2.4, 1.2, .1), new THREE.MeshStandardMaterial({map: signTex(), roughness: .6}), 3.4, 2.6, -12);
}
/* 서 있는 마네킹: 팔 내린 자세 / 핸드폰을 들고 사진을 보는 자세 */
function photoTex() {
  return canvasTex(160, 330, (g, w, h) => {
    const sk = g.createLinearGradient(0, 0, 0, 190); sk.addColorStop(0, '#ff9f66'); sk.addColorStop(1, '#ffe9b8'); g.fillStyle = sk; g.fillRect(0, 0, w, 200);
    g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(112, 100, 24, 0, 7); g.fill();
    g.fillStyle = '#7a86c0'; g.beginPath(); g.moveTo(0, 170); g.lineTo(40, 110); g.lineTo(78, 160); g.lineTo(118, 96); g.lineTo(160, 170); g.closePath(); g.fill();
    g.fillStyle = '#4e5d94'; g.beginPath(); g.moveTo(0, 190); g.lineTo(58, 140); g.lineTo(110, 190); g.closePath(); g.fill();
    g.fillStyle = '#6fb7d8'; g.fillRect(0, 190, w, 70); g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 22, 200 + (i % 3) * 16, 14, 2);
    g.fillStyle = '#2b2f45'; [[62, 232, 10, 24], [80, 228, 11, 28], [99, 234, 8, 20]].forEach(([x, y, r, hh]) => { g.beginPath(); g.arc(x, y - hh / 2 - r / 2, r / 2 + 2, 0, 7); g.fill(); g.fillRect(x - r / 2, y - hh / 2, r, hh); });
    g.fillStyle = '#fff'; g.fillRect(0, 262, w, 68); g.fillStyle = '#15171c'; g.font = '800 17px sans-serif'; g.textAlign = 'center'; g.fillText('가족 여행 · 제주', w / 2, 290); g.fillStyle = '#6b7280'; g.font = '600 12px sans-serif'; g.fillText('2026.10.24 · 사진 128장', w / 2, 312);
  });
}
function buildStander(scene, x, z) {
  const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
  const white = new THREE.MeshStandardMaterial({color: 0xf4f5f7, roughness: .75}), dark = new THREE.MeshStandardMaterial({color: 0x1f2329, roughness: .4}), gl = new THREE.MeshStandardMaterial({color: 0x15171c, roughness: .3});
  const V = (a, b, c) => new THREE.Vector3(a, b, c);
  const add = (geo, mat, px, py, pz, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const limb = (a, b, r, mat = white, parent = root) => { const d = V(0, 0, 0).subVectors(b, a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), mat);
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m; };
  [-1, 1].forEach(s => { limb(V(s * .1, .95, 0), V(s * .105, .5, .01), .066); limb(V(s * .105, .5, .01), V(s * .1, .08, 0), .05); add(new THREE.BoxGeometry(.09, .06, .24), white, s * .1, .03, -.04); add(new THREE.SphereGeometry(.058, 14, 10), white, s * .19, 1.38, 0); });
  limb(V(0, .98, 0), V(0, 1.38, 0), .15); limb(V(0, 1.44, 0), V(0, 1.52, 0), .045);
  const neck = new THREE.Group(); neck.position.set(0, 1.52, 0); root.add(neck);
  const hd = add(new THREE.SphereGeometry(.105, 28, 20), white, 0, .1, -.01, neck); hd.scale.set(.86, 1, .96);
  [-1, 1].forEach(s => { const ring = add(new THREE.TorusGeometry(.03, .0045, 8, 28), gl, s * .039, .1, -.104, neck); ring.scale.y = .8; add(new THREE.BoxGeometry(.004, .004, .1), gl, s * .07, .11, -.055, neck); });
  add(new THREE.BoxGeometry(.018, .004, .004), gl, 0, .108, -.104, neck);
  // 왼팔은 내린 채로 둠
  limb(V(-.2, 1.38, 0), V(-.24, 1.12, .01), .045); limb(V(-.24, 1.12, .01), V(-.22, .88, .04), .04); add(new THREE.SphereGeometry(.04, 14, 10), white, -.22, .86, .05);
  // 오른팔: 내린 자세(u=0) ↔ 핸드폰을 눈앞으로 든 자세(u=1) 사이를 부드럽게 움직임
  const SH = V(.2, 1.38, 0), E0 = V(.24, 1.12, .01), E1 = V(.27, 1.15, -.1), H0 = V(.22, .88, .04), H1 = V(.1, 1.35, -.35);
  const upper = new THREE.Mesh(new THREE.BufferGeometry(), white), fore = new THREE.Mesh(new THREE.BufferGeometry(), white), handM = add(new THREE.SphereGeometry(.042, 14, 10), white, 0, 0, 0);
  [upper, fore].forEach(m => { m.castShadow = true; root.add(m); });
  const phone = new THREE.Group(); root.add(phone);
  add(new THREE.BoxGeometry(.075, .155, .009), dark, 0, 0, 0, phone);
  const scr = add(new THREE.PlaneGeometry(.068, .145), new THREE.MeshBasicMaterial({map: photoTex()}), 0, 0, .0052, phone); scr.castShadow = false;
  const q0 = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(-.35, .1, .9).normalize()), q1 = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(-.09, .24, .26).normalize());
  const seg = (m, p, q, r) => { const d = V(0, 0, 0).subVectors(q, p); m.geometry.dispose(); m.geometry = new THREE.CapsuleGeometry(r, d.length(), 6, 14); m.position.copy(p).add(q).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };
  function setArm(u) {
    const e = V(0, 0, 0).lerpVectors(E0, E1, u), h = V(0, 0, 0).lerpVectors(H0, H1, u);
    seg(upper, SH, e, .045); seg(fore, e, h, .04); handM.position.copy(h);
    phone.position.set(h.x - .01 * u, h.y + .05 * u, h.z + .03 - .05 * u); phone.quaternion.slerpQuaternions(q0, q1, u);
  }
  setArm(0);  return {root, neck, setArm};
}
const OFFICE = {                                                 // dot: 렌즈 위 시선 위치(0~200 좌표)
  mon:  {n: '모니터 보기', head: [-.06, 0], target: [0, 1.11, -.285], dot: [100, 70], blur: 0, ok: true, title: '모니터는 렌즈 위쪽으로 편하게', msg: '고개를 들지 않아도 렌즈 위쪽의 넓은 중간 거리 영역으로 모니터가 또렷하게 보여요.'},
  near: {n: '서류 · 휴대폰', head: [-.34, 0], target: [0, .766, -.07], dot: [100, 152], blur: 0, ok: true, title: '휴대폰 · 서류는 눈만 내려서', msg: '렌즈 아래쪽 근거리 영역이 넓어서 고개를 크게 숙이지 않아도 글씨가 또렷해요.'},
  dual: {n: '듀얼 모니터', head: [-.06, -.6], target: [.66, 1.11, -.165], dot: [100, 76], blur: 0, ok: true, title: '고개를 돌리면 또렷하게', msg: '옆 모니터는 눈만 돌리기보다 고개를 살짝 돌려 렌즈 가운데로 보면 가장 편하고 선명해요.'},
  clock: {n: '벽 시계 (2m형)', head: [.22, -.1], target: [.38, 2.15, -2.77], dot: [100, 40], blur: 1.1, ok: true, st: '시계는 알아볼 수 있어요', cam: {az: -.28, el: .1, dist: 4.7, tgt: [.3, 1.75, -1.75]}, title: '벽 시계 정도는 보여요', msg: '2m형 오피스 렌즈는 방 안 거리까지 넓게 보이도록 만든 설계라 벽에 걸린 시계 정도는 볼 수 있어요. 숫자는 살짝 부드럽게 보이고, 운전 · 보행처럼 먼 거리는 일반 안경이나 누진다초점을 사용하세요.'}
};
const OT = [{id: 1, n: '기본형', m: 46, kk: .85}, {id: 2, n: '보급형', m: 34, kk: .6}, {id: 3, n: '최고급형', m: 22, kk: .4}];   // m: 렌즈 가운데에서 또렷한 폭(왼쪽 경계, 0~100) — 클수록 가장자리 수차(흐림)가 넓음
function officeZone(m) {                                          // 오피스 렌즈에서 또렷한 영역: 가운데가 세로로 넓고 양옆 가장자리만 흐림 (제조사 시야 이미지 참고)
  const L = [m - 9, m + 1, m, m - 1, m - 11, m - 14], R = L.map(v => 200 - v);
  return `M${L[0]},-6 C${m - 5},40 ${L[1]},80 ${L[2]},100 C${L[3]},130 ${L[4]},170 ${L[5]},206 L${R[5]},206 C${R[4]},170 ${R[3]},130 ${R[2]},100 C${R[1]},80 ${200 - (m - 5)},40 ${R[0]},-6 Z`;
}export function mountOffice(el) {
  const uidn = 'of' + Math.floor(Math.random() * 1e6), LENS = lensPath(100, 100, 190, 190), CAM0 = {az: -.95, el: .3, dist: 2.35, tgt: [.12, .96, -.08]};
  let cur = 'mon', tier = 2, head = OFFICE.mon.head.slice(), goal = null, settle = false, prevT = 0, W = 0, H = 0, raf = 0;
  const lbl = (x, y, t, c, cls = '') => `<text class="${cls}" x="${x}" y="${y}" font-size="9" font-weight="800" fill="#fff" stroke="${c}" stroke-width="2.4" paint-order="stroke" text-anchor="middle">${t}</text>`;
  el.innerHTML = `<div class="of of--prog"><div class="of-3d"><canvas></canvas><div class="t3-labels"></div><div class="p3-hint">끌어서 돌려 보세요</div></div>
      <div class="of-side"><div class="of-card"><h5>렌즈 너머로 보이는 모습 <em>1인칭</em><span class="of-st"></span></h5>
        <div class="pm-fp"><canvas width="520" height="520"></canvas>
          <svg viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="${uidn}c"><path d="${LENS}"/></clipPath></defs>
            <g clip-path="url(#${uidn}c)"><path class="oz1" fill="transparent" stroke="#fff" stroke-width="3.4" stroke-opacity=".85"/><path class="oz2" fill="none" stroke="#0b7a91" stroke-width="1.4"/>
              ${lbl(100, 14, '먼 거리 △', '#0f2238')}${lbl(100, 108, '중간', '#0f2238')}${lbl(100, 183, '근거리', '#0f2238')}${lbl(24, 104, '흐림', '#9a3412', 'obl')}${lbl(176, 104, '흐림', '#9a3412', 'obr')}</g>
            <path d="${LENS}" fill="none" stroke="#334155" stroke-width="3"/>
            <g class="of-dot"><circle r="13" fill="#0b6b7e" opacity=".22"/><circle r="5.5" fill="none" stroke="#fff" stroke-width="2.4"/><circle r="1.8" fill="#fff"/></g></svg></div>
        <small>밝은 선 안쪽이 또렷한 영역이에요. 오피스 렌즈는 중간~근거리가 넓고, 아래 양옆과 초점에서 먼 쪽은 서서히 흐려져요</small></div></div></div>
    <div class="p3-ctl p3-ctl--l"><div class="seg" data-k="sc">${Object.entries(OFFICE).map(([k, s]) => `<button data-v="${k}" class="${k === cur ? 'is-on' : ''}">${s.n}</button>`).join('')}</div>
      <div class="seg" data-k="tier">${OT.map(t => `<button data-v="${t.id}" class="${t.id === tier ? 'is-on' : ''}">${t.n}</button>`).join('')}</div></div>
    <p class="sim-cap" data-k="cap"></p>`;
  const box = el.querySelector('.of-3d'), cv = box.querySelector('canvas'), labels = box.querySelector('.t3-labels'), cap = el.querySelector('[data-k=cap]');
  const dot = el.querySelector('.of-dot'), stTag = el.querySelector('.of-st'), fpc = el.querySelector('.pm-fp canvas'), fpx = fpc.getContext('2d'), lensP2D = new Path2D(LENS); let zoneP2D = new Path2D(officeZone(34));
  const mkc = () => { const c = document.createElement('canvas'); c.width = c.height = fpc.width; return c; }, gA = mkc(), gB = mkc();
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), {neck, V} = buildOffice(scene), fpBg = new THREE.Color(0xe8ecf1);
  /* 눈에서 목표까지 이어지는 시선: 굵은 점선 */
  const DASH_MAX = 420, dashes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.01, .01, 1, 6), new THREE.MeshBasicMaterial({color: 0x0b7a91}), DASH_MAX); dashes.frustumCulled = false; scene.add(dashes);
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), ds = V(1, 1, 1), dp = V(0, 0, 0), dd = V(0, 0, 0), UP = V(0, 1, 0);
  const mark = new THREE.Mesh(new THREE.SphereGeometry(.025, 16, 12), new THREE.MeshBasicMaterial({color: 0x0e8aa2})); scene.add(mark);
  const cam = new THREE.PerspectiveCamera(36, 1.4, .05, 50), fpCam = new THREE.PerspectiveCamera(66, 1, .03, 50), tgt = V(...CAM0.tgt);
  const orbit = {az: CAM0.az, el: CAM0.el, dist: CAM0.dist, hold: 0}, tvGoal = V(...OFFICE.mon.target);
  const eye = V(0, 0, 0), tv = V(...OFFICE.mon.target), pv = V(0, 0, 0), qS = {}, qCur = new THREE.Quaternion(), dotCur = OFFICE.mon.dot.slice(); let fovCur = 66;
  function layout() { W = box.clientWidth; H = box.clientHeight; if (!W) return; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
  function updateSight() {
    dd.subVectors(tv, eye); const len = dd.length(); dd.normalize();
    const r = .005 + cam.position.distanceTo(eye) * .0012, step = Math.max(.055, r * 7), n = Math.min(DASH_MAX, Math.floor(len / step));
    dq.setFromUnitVectors(UP, dd);
    for (let i = 0; i < n; i++) { dp.copy(eye).addScaledVector(dd, (i + .5) * step); ds.set(r / .01, step * .6, r / .01); dm.compose(dp, dq, ds); dashes.setMatrixAt(i, dm); }
    dashes.count = n; dashes.instanceMatrix.needsUpdate = true;
  }
  function apply() {
    const s = OFFICE[cur], T = OT.find(t => t.id === tier), zd = officeZone(T.m); el.querySelectorAll('.oz1, .oz2').forEach(z => z.setAttribute('d', zd)); zoneP2D = new Path2D(zd);
    el.querySelector('.obl').setAttribute('x', Math.max(12, T.m / 2 + 2)); el.querySelector('.obr').setAttribute('x', 200 - Math.max(12, T.m / 2 + 2));
    el.querySelectorAll('[data-k=tier] button').forEach(b => b.classList.toggle('is-on', +b.dataset.v === tier));
    dot.style.transform = `translate(${s.dot[0]}px,${s.dot[1]}px)`; dot.classList.toggle('is-bad', !s.ok);
    stTag.textContent = s.st || (s.ok ? '선명하게 보여요' : '흐리게 보여요'); stTag.className = 'of-st ' + (s.ok ? 'is-ok' : 'is-bad');
    cap.innerHTML = `<b>${s.title}</b> — ${s.msg} <small>개념 설명용 3D입니다. 영역의 넓이는 제품마다 다릅니다.</small>`;
    mark.material.color.set(s.ok ? 0x0e8aa2 : 0xd92d20); dashes.material.color.set(s.ok ? 0x0b7a91 : 0xd92d20);
    el.querySelectorAll('[data-k=sc] button').forEach(b => b.classList.toggle('is-on', b.dataset.v === cur));
  }
  function setScene(k, first) {
    const s = OFFICE[k], c = s.cam || CAM0; cur = k; tvGoal.set(...s.target);
    if (first) { head = s.head.slice(); tv.copy(tvGoal); }
    else { goal = {head: s.head.slice(), cam: c}; settle = true; }   // 목표만 정해 두고 매 프레임 부드럽게 따라감
    apply();
  }
  const TAGS = [['mon', '모니터 · 중간 거리', V(0, 1.34, -.3)], ['dual', '듀얼 모니터', V(.66, 1.34, -.18)], ['near', '서류 · 근거리', V(0, .84, -.07)], ['clock', '벽 시계 · 2m형', V(.38, 2.62, -2.78)]];
  function drawFP() {                                               // 캐릭터의 눈 위치에서 본 장면을 렌즈 모양 안에 그림 (선명 영역 밖 + 초점에서 먼 쪽은 서서히 흐리게)
    const S = Math.min(512, W, H), pr = renderer.getPixelRatio(), s = OFFICE[cur], fov = s.fov || 66, th = Math.tan(fov * Math.PI / 360);
    fpCam.fov = fovCur; fpCam.updateProjectionMatrix(); fpCam.position.copy(eye); fpCam.quaternion.copy(qCur);
    dashes.visible = false; mark.visible = false; scene.background = fpBg;
    renderer.setViewport(0, 0, S, S); renderer.setScissor(0, 0, S, S); renderer.setScissorTest(true); renderer.render(scene, fpCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    dashes.visible = true; mark.visible = true; scene.background = null;
    const N = fpc.width, k = N / 200, sy = cv.height - S * pr, kk = OT.find(t => t.id === tier).kk, gpx = s.blur * .8;
    const layer = (g, blurPx, a0, a1) => {                           // 초점에서 먼 쪽으로 갈수록 진해지는 흐림 층
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, N, N); g.filter = `blur(${(blurPx * k).toFixed(1)}px)`; g.drawImage(cv, 0, sy, S * pr, S * pr, -8, -8, N + 16, N + 16); g.filter = 'none';
      g.globalCompositeOperation = 'destination-in'; const far = cur === 'clock', gr = g.createLinearGradient(0, far ? .5 * N : .4 * N, 0, far ? N : 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(a0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a1})`); g.fillStyle = gr; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
    };
    layer(gA.getContext('2d'), 3.2 * kk, .25, .75); layer(gB.getContext('2d'), 7.5 * kk, .55, .7);
    fpx.clearRect(0, 0, N, N); fpx.save(); fpx.scale(k, k); fpx.clip(lensP2D);
    fpx.filter = 'blur(5px)'; fpx.drawImage(cv, 0, sy, S * pr, S * pr, -6, -6, 212, 212);
    fpx.save(); fpx.clip(zoneP2D); fpx.filter = gpx ? `blur(${gpx.toFixed(1)}px)` : 'none'; fpx.drawImage(cv, 0, sy, S * pr, S * pr, 0, 0, 200, 200); fpx.restore(); fpx.filter = 'none';
    fpx.drawImage(gA, 0, 0, 200, 200); fpx.drawImage(gB, 0, 0, 200, 200); fpx.restore();
  }
  function loop(t) {
    raf = requestAnimationFrame(loop); if (!W) return;
    const dt = Math.min(.05, Math.max(0, (t - (prevT || t)) / 1000)); prevT = t;
    const f = 1 - Math.exp(-dt * 4.2); qCur.slerp(qS[cur], f); fovCur += ((OFFICE[cur].fov || 66) - fovCur) * f;
    if (goal) {                                                       // 고개 · 시선 목표 · 카메라가 목표로 부드럽게 수렴 (지수 감쇠)
      head = [head[0] + (goal.head[0] - head[0]) * f, head[1] + (goal.head[1] - head[1]) * f];
      if (settle) { const c = goal.cam; orbit.az += (c.az - orbit.az) * f; orbit.el += (c.el - orbit.el) * f; orbit.dist += (c.dist - orbit.dist) * f; tgt.x += (c.tgt[0] - tgt.x) * f; tgt.y += (c.tgt[1] - tgt.y) * f; tgt.z += (c.tgt[2] - tgt.z) * f;
        if (Math.abs(c.dist - orbit.dist) < .01 && Math.abs(c.az - orbit.az) < .004 && Math.abs(c.tgt[0] - tgt.x) < .01) settle = false; }
    }
    tv.lerp(tvGoal, f);
    const idle = performance.now() > orbit.hold, az = orbit.az + (idle ? Math.sin(t / 5200) * .12 : 0);
    cam.position.set(tgt.x + orbit.dist * Math.cos(orbit.el) * Math.sin(az), tgt.y + orbit.dist * Math.sin(orbit.el), tgt.z + orbit.dist * Math.cos(orbit.el) * Math.cos(az)); cam.lookAt(tgt);
    neck.rotation.set(head[0], head[1], 0, 'YXZ'); scene.updateMatrixWorld(true);
    neck.localToWorld(eye.set(0, .1, -.11));
    updateSight(); mark.position.copy(tv); mark.scale.setScalar(1 + Math.sin(t / 260) * .25);
    drawFP();
    renderer.render(scene, cam);
    labels.innerHTML = TAGS.map(([k, n, p]) => { pv.copy(p).project(cam); if (pv.z > 1) return ''; return `<div class="of-tag ${k === cur ? 'is-on' : ''} ${k === cur && !OFFICE[k].ok ? 'is-bad' : ''}" style="left:${(pv.x * .5 + .5) * W}px;top:${(-pv.y * .5 + .5) * H}px">${n}</div>`; }).join('');
  }
  let drag = null;
  box.addEventListener('pointerdown', e => { settle = false; drag = {x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el}; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', e => { if (!drag) return; orbit.az = drag.az - (e.clientX - drag.x) * .006; orbit.el = clamp(drag.el + (e.clientY - drag.y) * .004, .05, .9); orbit.hold = performance.now() + 6000; });
  ['pointerup', 'pointercancel'].forEach(k => box.addEventListener(k, () => { drag = null; }));
  el.querySelector('[data-k=sc]').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.v !== cur) setScene(b.dataset.v); });
  el.querySelector('[data-k=tier]').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tier = +b.dataset.v; apply(); } });
  function computeQ() {                                             // 장면마다 (그 장면의 고개 각도에서) 목표를 렌즈 위 점에 놓는 카메라 방향을 미리 구해 둠
    const tmp = new THREE.PerspectiveCamera(66, 1, .03, 50), e = V(0, 0, 0);
    Object.keys(OFFICE).forEach(k => { const s = OFFICE[k], th = Math.tan((s.fov || 66) * Math.PI / 360); neck.rotation.set(s.head[0], s.head[1], 0, 'YXZ'); scene.updateMatrixWorld(true); neck.localToWorld(e.set(0, .1, -.11));
      tmp.position.copy(e); tmp.lookAt(V(...s.target)); tmp.rotateY(Math.atan((s.dot[0] - 100) / 100 * th)); tmp.rotateX(-Math.atan((100 - s.dot[1]) / 100 * th)); qS[k] = tmp.quaternion.clone(); });
    qCur.copy(qS.mon); fovCur = OFFICE.mon.fov || 66;
  }
  const ro = new ResizeObserver(layout); ro.observe(box); layout(); computeQ(); setScene('mon', true); raf = requestAnimationFrame(loop);
  return {
    update() {},
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
  };
}
/* ═════════ 다초점 3D: 장소를 바꿔 가며 먼 곳(야외 간판) · 가까운 곳(핸드폰 사진)을 볼 때 렌즈의 어디를 쓰는지, 그때 캐릭터의 1인칭 시야 ═════════ */
const SX = 2, SZ = -2;                                           // 야외 인물 위치(인도)
const PM = {
  far:  {n: '원거리 · 야외', pose: 0, head: [.09, -.14], target: [3.4, 2.6, -12], dot: [100, 66], mk: 5, cam: {az: -.4, el: .13, dist: 7, tgt: [2.4, 1.5, -5]}, title: '멀리 볼 때는 렌즈 위쪽', msg: '야외에서 고개를 살짝 들면 렌즈 위쪽의 원거리 영역으로 길 끝의 간판까지 또렷하게 보여요. 가까운 쪽(아래)은 서서히 흐려져요.'},
  near: {n: '근거리 · 핸드폰', pose: 1, head: [-.45, -.15], target: [SX + .09, 1.4, SZ - .37], dot: [100, 150], cam: {az: -.95, el: .36, dist: 1.75, tgt: [SX + .04, 1.36, SZ - .24]}, title: '핸드폰 사진은 렌즈 아래쪽', msg: '눈을 내려 렌즈 아래쪽 근거리 영역으로 핸드폰 속 사진과 글씨를 또렷하게 봐요. 멀리(위쪽)는 서서히 흐려져요.'}
};
function mountProgOffice(el, opt) {
  const TI = Sim.TIERS, st = opt, uidn = 'pm' + Math.floor(Math.random() * 1e6), LENS = lensPath(100, 100, 190, 190);
  let cur = 'far', head = PM.far.head.slice(), armU = 0, anim = 0, okNow = true, zoneD = '';
  el.innerHTML = `<div class="of of--prog"><div class="of-3d"><canvas></canvas><div class="t3-labels"></div><div class="p3-hint">끌어서 돌려 보세요</div></div>
      <div class="of-side"><div class="of-card"><h5>렌즈 너머로 보이는 모습 <em>1인칭</em><span class="of-st"></span></h5>
        <div class="pm-fp"><canvas width="520" height="520"></canvas>
          <svg viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="${uidn}c"><path d="${LENS}"/></clipPath></defs>
            <g clip-path="url(#${uidn}c)"><path class="pm-zone" fill="transparent" stroke="#fff" stroke-width="3.4" stroke-opacity=".85"/><path class="pm-zone2" fill="none" stroke="#0b7a91" stroke-width="1.4"/>
              <text x="100" y="22" font-size="9" font-weight="800" fill="#fff" stroke="#0f2238" stroke-width="2.4" paint-order="stroke" text-anchor="middle">원거리</text><text x="100" y="183" font-size="9" font-weight="800" fill="#fff" stroke="#0f2238" stroke-width="2.4" paint-order="stroke" text-anchor="middle">근거리</text>
              <text x="26" y="104" font-size="9" font-weight="800" fill="#fff" stroke="#9a3412" stroke-width="2.4" paint-order="stroke" text-anchor="middle">흐림</text><text x="174" y="104" font-size="9" font-weight="800" fill="#fff" stroke="#9a3412" stroke-width="2.4" paint-order="stroke" text-anchor="middle">흐림</text></g>
            <path d="${LENS}" fill="none" stroke="#334155" stroke-width="3"/>
            <g class="of-dot"><circle r="13" fill="#0b6b7e" opacity=".22"/><circle r="5.5" fill="none" stroke="#fff" stroke-width="2.4"/><circle r="1.8" fill="#fff"/></g></svg></div>
        <small>밝은 선 안쪽이 또렷한 영역이에요. 바깥과 초점이 먼 쪽은 서서히 흐려져요 (등급 · ADD에 따라 달라져요)</small></div></div></div>
    <div class="p3-ctl p3-ctl--l"><div class="seg" data-k="sc">${Object.entries(PM).map(([k, s]) => `<button data-v="${k}" class="${k === cur ? 'is-on' : ''}">${s.n}</button>`).join('')}</div>
      <div class="seg" data-k="tier">${TI.map(t => `<button data-v="${t.id}" class="${t.id === st.tier ? 'is-on' : ''}">${t.name}</button>`).join('')}</div>
      <label class="pg-addc">ADD<input type="range" class="p3-add" min="0.75" max="3.5" step="0.25" value="${st.add}" aria-label="ADD"><b class="num pg-addv p3-addv">+${st.add.toFixed(2)}</b></label></div>
    <p class="sim-cap" data-k="cap"></p>`;
  const box = el.querySelector('.of-3d'), cv = box.querySelector('canvas'), labels = box.querySelector('.t3-labels'), cap = el.querySelector('[data-k=cap]');
  const dot = el.querySelector('.of-dot'), stTag = el.querySelector('.of-st'), zones = el.querySelectorAll('.pm-zone, .pm-zone2'), zone = el.querySelector('.pm-zone');
  const fpc = el.querySelector('.pm-fp canvas'), fpx = fpc.getContext('2d'), lensP2D = new Path2D(LENS);
  const mkc = () => { const c = document.createElement('canvas'); c.width = c.height = fpc.width; return c; }, gA = mkc(), gB = mkc();
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = skyTex(); scene.fog = new THREE.Fog(0xdde6ee, 14, 110);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dee6, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-9, 15, 7); key.target.position.set(2, 0, -5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50}); scene.add(key, key.target);
  const streetRoot = new THREE.Group(); scene.add(streetRoot); buildStreetSet(streetRoot);
  const man = buildStander(scene, SX, SZ), V = (x, y, z) => new THREE.Vector3(x, y, z);
  /* 눈에서 목표까지 이어지는 시선: 굵은 점선(작은 막대를 줄지어 세움) */
  const DASH_MAX = 420, dashes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.01, .01, 1, 6), new THREE.MeshBasicMaterial({color: 0x0b7a91}), DASH_MAX); dashes.frustumCulled = false; scene.add(dashes);
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), ds = V(1, 1, 1), dp = V(0, 0, 0), dd = V(0, 0, 0), UP = V(0, 1, 0);
  const mark = new THREE.Mesh(new THREE.SphereGeometry(.025, 16, 12), new THREE.MeshBasicMaterial({color: 0x0e8aa2})); scene.add(mark);
  const cam = new THREE.PerspectiveCamera(36, 1.4, .05, 400), tgt = V(...PM.far.cam.tgt), fpCam = new THREE.PerspectiveCamera(66, 1, .03, 400);
  const orbit = {az: PM.far.cam.az, el: PM.far.cam.el, dist: PM.far.cam.dist, hold: 0};
  let W = 0, H = 0, raf = 0, lastU = -1, goal = null, settle = false, prevT = 0;
  const eye = V(0, 0, 0), tv = V(0, 0, 0), pv = V(0, 0, 0), qS = {}, qCur = new THREE.Quaternion(), dotCur = PM.far.dot.slice();                // dotCur: 1인칭 카메라가 쓰는 시선 위치(렌즈 좌표) — 장면이 바뀔 때 부드럽게 이동
  function layout() { W = box.clientWidth; H = box.clientHeight; if (!W) return; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
  function updateSight() {
    dd.subVectors(tv, eye); const len = dd.length(); dd.normalize();
    const r = .005 + cam.position.distanceTo(eye) * .0012, step = Math.max(.055, r * 7), n = Math.min(DASH_MAX, Math.floor(len / step));
    dq.setFromUnitVectors(UP, dd);
    for (let i = 0; i < n; i++) { dp.copy(eye).addScaledVector(dd, (i + .5) * step); ds.set(r / .01, step * .6, r / .01); dm.compose(dp, dq, ds); dashes.setMatrixAt(i, dm); }
    dashes.count = n; dashes.instanceMatrix.needsUpdate = true;
  }
  function apply() {                                              // 등급 · ADD · 장면에 따라 선명 영역 안에 시선이 있는지 판정
    const s = PM[cur]; zoneD = Sim.clearZonePath({}, st.add, st.tier); zones.forEach(z => z.setAttribute('d', zoneD));
    okNow = zone.isPointInFill(new DOMPoint(s.dot[0], s.dot[1]));
    dot.style.transform = `translate(${s.dot[0]}px,${s.dot[1]}px)`; dot.classList.toggle('is-bad', !okNow);
    stTag.textContent = okNow ? '선명하게 보여요' : '흐리게 보여요'; stTag.className = 'of-st ' + (okNow ? 'is-ok' : 'is-bad');
    cap.innerHTML = `<b>${s.title}</b> — ${s.msg} <small>개념 설명용 3D이며 영역의 넓이는 제품마다 다릅니다.</small>`;
    mark.material.color.set(okNow ? 0x0e8aa2 : 0xd92d20); dashes.material.color.set(okNow ? 0x0b7a91 : 0xd92d20);
  }
  function setScene(k, first) {
    const s = PM[k]; cur = k; anim = performance.now();
    el.querySelectorAll('[data-k=sc] button').forEach(b => b.classList.toggle('is-on', b.dataset.v === k));
    if (first) { head = s.head.slice(); armU = s.pose; }
    else { goal = {head: s.head.slice(), u: s.pose, cam: s.cam}; settle = true; }   // 목표만 정해 두고 매 프레임 부드럽게 따라감 (급가속 없이)
    apply();
  }
  const TAGS = [['far', '야외 · 먼 간판', V(3.4, 3.4, -12)], ['near', '핸드폰 · 사진', V(SX + .09, 1.62, SZ - .37)]];
  function drawFP() {                                               // 캐릭터의 눈 위치에서 본 장면을 렌즈 모양 안에 그림 (선명 영역 밖 + 초점에서 먼 쪽은 서서히 흐리게)
    const S = Math.min(380, W, H), pr = renderer.getPixelRatio(), s = PM[cur], th = Math.tan(66 * Math.PI / 360);
    fpCam.position.copy(eye); fpCam.quaternion.copy(qCur);
    dashes.visible = false; mark.visible = false;
    renderer.setViewport(0, 0, S, S); renderer.setScissor(0, 0, S, S); renderer.setScissorTest(true); renderer.render(scene, fpCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    dashes.visible = true; mark.visible = true;
    const N = fpc.width, k = N / 200, sy = cv.height - S * pr, sc = Sim.progScores({}, st.tier);
    const px = Math.min(7, Math.max(2, (2 + st.add * 1.3) * (1.9 - sc.side / 60))), kk = Math.max(.3, 1.4 - sc.side / 100);   // kk: 등급이 낮을수록 그라데이션 흐림이 큼
    const layer = (g, blurPx, a0, a1) => {                           // 초점에서 먼 쪽으로 갈수록 진해지는 흐림 층
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, N, N); g.filter = `blur(${(blurPx * k).toFixed(1)}px)`; g.drawImage(cv, 0, sy, S * pr, S * pr, -8, -8, N + 16, N + 16); g.filter = 'none';
      g.globalCompositeOperation = 'destination-in'; const far = cur === 'clock', gr = g.createLinearGradient(0, far ? .5 * N : .4 * N, 0, far ? N : 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(a0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a1})`); g.fillStyle = gr; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
    };
    layer(gA.getContext('2d'), 3.2 * kk, .25, Math.min(.9, .55 + kk * .4)); layer(gB.getContext('2d'), 7.5 * kk, .55, Math.min(1, kk * 1.15));
    fpx.clearRect(0, 0, N, N); fpx.save(); fpx.scale(k, k); fpx.clip(lensP2D);
    fpx.filter = `blur(${px.toFixed(1)}px)`; fpx.drawImage(cv, 0, sy, S * pr, S * pr, -6, -6, 212, 212); fpx.filter = 'none';
    fpx.save(); fpx.clip(new Path2D(zoneD)); fpx.drawImage(cv, 0, sy, S * pr, S * pr, 0, 0, 200, 200); fpx.restore();
    fpx.drawImage(gA, 0, 0, 200, 200); fpx.drawImage(gB, 0, 0, 200, 200); fpx.restore();
  }
  function loop(t) {
    raf = requestAnimationFrame(loop); if (!W) return;
    const dt = Math.min(.05, Math.max(0, (t - (prevT || t)) / 1000)); prevT = t;
    qCur.slerp(qS[cur], 1 - Math.exp(-dt * 4.2));                       // 1인칭 시선 방향: 장면별로 미리 구한 방향으로 한 번에 부드럽게 회전 (튀지 않음)
    if (goal) {                                                       // 고개 · 팔 · 카메라가 목표로 부드럽게 수렴 (지수 감쇠)
      const f = 1 - Math.exp(-dt * 4.2), g = goal;
      head = [head[0] + (g.head[0] - head[0]) * f, head[1] + (g.head[1] - head[1]) * f]; armU += (g.u - armU) * f;
      if (settle) { orbit.az += (g.cam.az - orbit.az) * f; orbit.el += (g.cam.el - orbit.el) * f; orbit.dist += (g.cam.dist - orbit.dist) * f; tgt.x += (g.cam.tgt[0] - tgt.x) * f; tgt.y += (g.cam.tgt[1] - tgt.y) * f; tgt.z += (g.cam.tgt[2] - tgt.z) * f;
        if (Math.abs(g.cam.dist - orbit.dist) < .01 && Math.abs(g.cam.az - orbit.az) < .004 && Math.abs(g.cam.tgt[0] - tgt.x) < .01) settle = false; }
    }
    const idle = performance.now() > orbit.hold, az = orbit.az + (idle ? Math.sin(t / 5200) * .1 : 0);
cam.position.set(tgt.x + orbit.dist * Math.cos(orbit.el) * Math.sin(az), tgt.y + orbit.dist * Math.sin(orbit.el), tgt.z + orbit.dist * Math.cos(orbit.el) * Math.cos(az)); cam.lookAt(tgt);
    if (Math.abs(armU - lastU) > 1e-3) { man.setArm(armU); lastU = armU; }
    man.neck.rotation.set(head[0], head[1], 0, 'YXZ'); scene.updateMatrixWorld(true);
    man.neck.localToWorld(eye.set(0, .1, -.11));
    const u = clamp(armU, 0, 1), s0 = PM.far.target, s1 = PM.near.target; tv.set(s0[0] + (s1[0] - s0[0]) * u, s0[1] + (s1[1] - s0[1]) * u, s0[2] + (s1[2] - s0[2]) * u);   // 시선 목표도 부드럽게 이동
    updateSight(); mark.position.copy(tv); mark.scale.setScalar((PM.far.mk + (1 - PM.far.mk) * u) * (1 + Math.sin(t / 260) * .25));
    drawFP();
    renderer.render(scene, cam);
    labels.innerHTML = TAGS.map(([k, n, p]) => { pv.copy(p).project(cam); if (pv.z > 1) return ''; return `<div class="of-tag ${k === cur ? 'is-on' : ''} ${k === cur && !okNow ? 'is-bad' : ''}" style="left:${(pv.x * .5 + .5) * W}px;top:${(-pv.y * .5 + .5) * H}px">${n}</div>`; }).join('');
  }
  let drag = null;
  box.addEventListener('pointerdown', e => { settle = false; drag = {x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el}; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', e => { if (!drag) return; orbit.az = drag.az - (e.clientX - drag.x) * .006; orbit.el = clamp(drag.el + (e.clientY - drag.y) * .004, .05, .9); orbit.hold = performance.now() + 6000; });
  ['pointerup', 'pointercancel'].forEach(k => box.addEventListener(k, () => { drag = null; }));
  el.querySelector('[data-k=sc]').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.v !== cur) setScene(b.dataset.v); });
  el.querySelector('[data-k=tier]').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.tier = +b.dataset.v; el.querySelectorAll('[data-k=tier] button').forEach(x => x.classList.toggle('is-on', x === b)); apply(); });
  const addIn = el.querySelector('.p3-add'); addIn.addEventListener('input', () => { st.add = +addIn.value; el.querySelector('.p3-addv').textContent = '+' + st.add.toFixed(2); apply(); });
  function computeQ() {                                             // 장면마다 (그 장면의 고개 각도에서) 목표를 렌즈 위 점에 놓는 카메라 방향을 미리 구해 둠
    const tmp = new THREE.PerspectiveCamera(66, 1, .03, 400), th = Math.tan(66 * Math.PI / 360), e = V(0, 0, 0);
    Object.keys(PM).forEach(k => { const s = PM[k]; man.neck.rotation.set(s.head[0], s.head[1], 0, 'YXZ'); scene.updateMatrixWorld(true); man.neck.localToWorld(e.set(0, .1, -.11));
      tmp.position.copy(e); tmp.lookAt(V(...s.target)); tmp.rotateY(Math.atan((s.dot[0] - 100) / 100 * th)); tmp.rotateX(-Math.atan((100 - s.dot[1]) / 100 * th)); qS[k] = tmp.quaternion.clone(); });
    qCur.copy(qS.far);
  }
  const ro = new ResizeObserver(layout); ro.observe(box); layout(); computeQ(); setScene('far', true); raf = requestAnimationFrame(loop);
  return {
    update() {},
    destroy() { anim = -1; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
  };
}
/* 다초점 3D: 인물 시점(기본) ↔ 안경 쓴 시점 */
export function mountProg3D(el, opt = {}) {
  const sh = {tier: opt.tier || 3, add: opt.add || 1.5}; let h = null, view = 'person';
  el.innerHTML = `<div class="p3w-bar"><div class="seg" data-k="view"><button data-v="person" class="is-on">인물 시점</button><button data-v="fp">안경 쓴 시점</button></div></div><div class="p3w-b"></div>`;
  const body = el.querySelector('.p3w-b');
  const mount = v => { if (h && h.destroy) h.destroy(); view = v; el.querySelectorAll('[data-k=view] button').forEach(b => b.classList.toggle('is-on', b.dataset.v === v)); body.innerHTML = ''; h = v === 'person' ? mountProgOffice(body, sh) : mountProgFP(body, sh); };
  el.querySelector('[data-k=view]').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.v !== view) mount(b.dataset.v); });
  mount('person');
  return {update() {}, destroy() { if (h && h.destroy) h.destroy(); h = null; }};
}
/* ═════════ 렌즈 두께 3D (돌려 보는 메니스커스 렌즈) ═════════ */
export function mountThick3D(el, opt) {
  let st = {P: opt.P, r: opt.r || 31, hi: opt.hi || null, idx: opt.idx || [1.50, 1.60, 1.67, 1.74], ry: 1.0, rx: .12, hold: 0};
  el.innerHTML = `<div class="t3"><canvas></canvas><div class="t3-labels"></div><div class="p3-hint">끌어서 돌려 보세요</div></div><p class="sim-cap" data-k="cap"></p>`;
  const box = el.querySelector('.t3'), cv = box.querySelector('canvas'), labels = box.querySelector('.t3-labels'), cap = el.querySelector('[data-k=cap]');
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 8); scene.add(key, new THREE.AmbientLight(0xffffff, .5));
  const cam = new THREE.PerspectiveCamera(32, 2, .1, 200); cam.position.set(0, 1.4, 33); cam.lookAt(0, .4, 0);
  const group = new THREE.Group(); scene.add(group);
  const glass = new THREE.MeshPhysicalMaterial({color: 0xcfe2f6, metalness: 0, roughness: .06, transparent: true, opacity: .5, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false});
  const edgeMat = new THREE.MeshStandardMaterial({color: 0xf4f7fb, roughness: .55, metalness: 0, side: THREE.DoubleSide});
  const edgeHi = new THREE.MeshStandardMaterial({color: 0x7fd3e5, roughness: .45, metalness: 0, side: THREE.DoubleSide});
  let items = [];
  function build() {
    group.clear(); items = [];
    const P = st.P, r = st.r, bc = P < 0 ? clamp(6 + P / 2, 1, 6) : clamp(6 + P * .8, 4, 12), R1 = 530 / bc;
    const sag = y => R1 - Math.sqrt(Math.max(0, R1 * R1 - y * y)), S = .1, gap = 7.1, n0 = st.idx[0];
    const base = Math.abs(P) < .25 ? Sim.CT : (P < 0 ? Sim.thickAt(P, n0, r, r) : Sim.thickAt(P, n0, 0, r));
    st.idx.forEach((n, i) => {
      const pts = [], N = 36;
      for (let k = 0; k <= N; k++) { const y = r * k / N; pts.push(new THREE.Vector2(y * S, -sag(y) * S)); }
      for (let k = N; k >= 0; k--) { const y = r * k / N; pts.push(new THREE.Vector2(y * S, -(sag(y) + Sim.thickAt(P, n, y, r)) * S)); }
      const lens = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), glass);
      const ef = -sag(r) * S, eb = -(sag(r) + Sim.thickAt(P, n, r, r)) * S;
      const on = st.hi && Math.abs(parseFloat(st.hi) - n) < .005;
      const edge = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(r * S, ef), new THREE.Vector2(r * S, eb)], 72), on ? edgeHi : edgeMat);
      const g = new THREE.Group(); g.add(lens, edge); g.rotation.x = Math.PI / 2;
      const pivot = new THREE.Group(); pivot.add(g); pivot.position.x = (i - (st.idx.length - 1) / 2) * gap; group.add(pivot);   // 렌즈마다 제자리에서 돌아감
      const edgeT = P < 0 ? Sim.thickAt(P, n, r, r) : Sim.thickAt(P, n, 0, r);
      items.push({g: pivot, n, edgeT, diff: i ? Math.round((1 - edgeT / base) * 100) : 0, on});
    });
    cap.innerHTML = `<b class="num">${fmt(P)} D</b> 기준 · 렌즈 반경 ${r}mm · 하얗게 보이는 띠가 렌즈 <b>${P < 0 ? '가장자리' : '중심'} 두께</b>입니다. 단순화한 계산 모델로 실제 두께는 프레임과 설계에 따라 달라집니다.`;
  }
  let W = 0, H = 0, raf = 0;
  function layout() { W = box.clientWidth; H = box.clientHeight; if (!W) return; renderer.setSize(W, H, false); cam.aspect = W / H; cam.fov = W / H < 1.55 ? 38 : 32; cam.updateProjectionMatrix(); }
  const v = new THREE.Vector3();
  function loop(t) {
    raf = requestAnimationFrame(loop); if (!W) return;
    const idle = performance.now() > st.hold;
    const ry = st.ry + (idle ? Math.sin(t / 2600) * .28 : 0);
    items.forEach(it => { it.g.rotation.y = ry; it.g.rotation.x = st.rx; });
    renderer.render(scene, cam);
    labels.innerHTML = items.map(it => { it.g.getWorldPosition(v); v.y -= 4.0; v.project(cam);
      return `<div class="t3-l ${it.on ? 'is-on' : ''}" style="left:${(v.x * .5 + .5) * W}px;top:${(-v.y * .5 + .5) * H}px"><b class="num">${it.n.toFixed(2)}</b><span class="num">${it.edgeT.toFixed(1)}mm</span>${it.diff > 0 ? `<i>−${it.diff}%</i>` : '<i class="b">기준</i>'}</div>`; }).join('');
  }
  let drag = null;
  box.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx}; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', e => { if (!drag) return; st.ry = drag.ry + (e.clientX - drag.x) * .008; st.rx = clamp(drag.rx + (e.clientY - drag.y) * .006, -.9, .9); st.hold = performance.now() + 6000; });
  ['pointerup', 'pointercancel'].forEach(k => box.addEventListener(k, () => { drag = null; }));
  const ro = new ResizeObserver(layout); ro.observe(box); layout(); build(); raf = requestAnimationFrame(loop);
  return {
    update(o) { Object.assign(st, o); build(); },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); pm.dispose(); renderer.dispose(); }
  };
}
