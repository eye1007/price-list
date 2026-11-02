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
const words = n => Array.from({length: n}, () => Array.from({length: 2 + Math.floor(rand() * 3)}, () => pick(HANGUL)).join('')).join(' ');

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
    g.fillStyle = '#4b5563'; g.font = '600 15px sans-serif'; for (let i = 0; i < 9; i++) g.fillText(words(6), 18, 100 + i * 24);
    g.fillStyle = '#cfe4ea'; g.fillRect(360, 54, 130, 110);
  });
}
function phoneTex() {
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
export function mountProg3D(el, opt = {}) {
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
  el.querySelector('[data-k=tier]').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.tier = +b.dataset.v; el.querySelectorAll('[data-k=tier] button').forEach(x => x.classList.toggle('is-on', x === b)); applyZone(); });
  const addIn = el.querySelector('.p3-add'); addIn.addEventListener('input', () => { st.add = +addIn.value; el.querySelector('.p3-addv').textContent = '+' + st.add.toFixed(2); applyZone(); });
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
    g.fillStyle = '#0b6b7e'; g.fillRect(30, 72, 120, 6); g.fillStyle = '#374151'; g.font = '600 16px sans-serif';
    for (let i = 0; i < 22; i++) g.fillText(words(5), 30, 112 + i * 21);
  });
}
function clockTex() {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#1f2937'; g.stroke();
    g.fillStyle = '#1f2937'; g.font = '800 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(String(i), 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); }
    g.lineCap = 'round'; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 48, 128 - 30); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 20, 128 - 76); g.stroke();
  });
}
const OFFICE = {
  mon:  {n: '모니터 보기', head: [-.06, 0], target: [0, 1.11, -.285], zone: [100, 52], blur: 0, ok: true, title: '모니터는 렌즈 위쪽으로 편하게', msg: '고개를 들지 않아도 렌즈 위쪽의 넓은 중간 거리 영역으로 모니터가 또렷하게 보여요.'},
  near: {n: '서류 · 휴대폰', head: [-.34, 0], target: [-.2, .766, .12], zone: [100, 128], blur: 0, ok: true, title: '휴대폰 · 서류는 눈만 내려서', msg: '렌즈 아래쪽 근거리 영역이 넓어서 고개를 크게 숙이지 않아도 글씨가 또렷해요.'},
  dual: {n: '듀얼 모니터', head: [-.06, -.6], target: [.66, 1.11, -.165], zone: [100, 58], blur: 0, ok: true, title: '고개를 돌리면 또렷하게', msg: '옆 모니터는 눈만 돌리기보다 고개를 살짝 돌려 렌즈 가운데로 보면 가장 편하고 선명해요.'},
  clock: {n: '벽 시계 (2m형)', head: [.07, -.1], target: [.38, 1.6, -2.77], zone: [100, 30], blur: 1.1, ok: true, st: '시계는 알아볼 수 있어요', cam: {az: -.28, el: .1, dist: 4.7, tgt: [.3, 1.35, -1.75]}, title: '벽 시계 정도는 보여요', msg: '2m형 오피스 렌즈는 방 안 거리까지 넓게 보이도록 만든 설계라 벽에 걸린 시계 정도는 볼 수 있어요. 숫자는 살짝 부드럽게 보이고, 운전 · 보행처럼 먼 거리는 일반 안경이나 누진다초점을 사용하세요.'}
};
export function mountOffice(el) {
  let cur = 'mon', head = OFFICE.mon.head.slice(), anim = 0;
  el.innerHTML = `<div class="of"><div class="of-3d"><canvas></canvas><div class="t3-labels"></div><div class="p3-hint">끌어서 돌려 보세요</div></div>
      <div class="of-side"><div class="of-card"><h5>오피스 렌즈</h5>
        <svg viewBox="0 0 200 176" class="of-map" aria-hidden="true"><defs><clipPath id="ofc"><path d="M40,8 H160 Q194,8 194,46 V128 Q194,170 152,170 H48 Q6,170 6,128 V46 Q6,8 40,8 Z"/></clipPath></defs>
          <g clip-path="url(#ofc)"><rect width="200" height="176" fill="#f8fafc"/>
            <rect y="0" width="200" height="22" fill="url(#ofh)"/><path d="M0,22 H200 V98 C150,104 130,104 100,104 C70,104 50,104 0,98 Z" fill="#dbeafe"/>
            <path d="M24,176 C30,132 62,112 100,112 C138,112 170,132 176,176 Z" fill="#dcfce7"/>
            <path d="M0,98 C26,104 34,128 20,176 H0 Z" fill="#fde2dc"/><path d="M200,98 C174,104 166,128 180,176 H200 Z" fill="#fde2dc"/></g>
          <defs><pattern id="ofh" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#eef1f5"/><rect width="3" height="8" fill="#dfe3ea"/></pattern></defs>
          <path d="M40,8 H160 Q194,8 194,46 V128 Q194,170 152,170 H48 Q6,170 6,128 V46 Q6,8 40,8 Z" fill="none" stroke="#475569" stroke-width="2.5"/>
          <text x="100" y="17" font-size="9" font-weight="800" fill="#94a3b8" text-anchor="middle">먼 거리 △ (시계 정도)</text>
          <text x="100" y="66" font-size="11" font-weight="800" fill="#1d4ed8" text-anchor="middle">중간 · 모니터</text>
          <text x="100" y="146" font-size="11" font-weight="800" fill="#15803d" text-anchor="middle">근거리 · 서류</text>
          <g class="of-dot"><circle r="12" fill="#0b6b7e" opacity=".18"/><circle r="6" fill="#0b6b7e" stroke="#fff" stroke-width="2"/></g></svg>
        <small>점은 지금 시선이 지나가는 렌즈 위치예요</small></div>
        <div class="of-card"><h5>보이는 글자</h5><div class="of-read"><b>가나다라마바사</b><span>아자차카타파하</span></div><span class="of-st"></span></div></div></div>
    <div class="p3-ctl"><div class="seg" data-k="sc">${Object.entries(OFFICE).map(([k, s]) => `<button data-v="${k}" class="${k === cur ? 'is-on' : ''}">${s.n}</button>`).join('')}</div></div>
    <p class="sim-cap" data-k="cap"></p>`;
  const box = el.querySelector('.of-3d'), cv = box.querySelector('canvas'), labels = box.querySelector('.t3-labels'), cap = el.querySelector('[data-k=cap]');
  const dot = el.querySelector('.of-dot'), read = el.querySelector('.of-read'), stTag = el.querySelector('.of-st');
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dee6, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2.5, 4, 2.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 12}); scene.add(key);
  const white = new THREE.MeshStandardMaterial({color: 0xf4f5f7, roughness: .75}), grey = new THREE.MeshStandardMaterial({color: 0x9aa3af, roughness: .5, metalness: .3});
  const dark = new THREE.MeshStandardMaterial({color: 0x1f2329, roughness: .4}), wood = new THREE.MeshStandardMaterial({color: 0xe7e2d8, roughness: .7});
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const limb = (a, b, r, mat = white, parent = scene) => { const d = V().subVectors(b, a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), mat);
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m; };
  const floor = add(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({color: 0xe9ebef, roughness: 1}), 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  add(new THREE.PlaneGeometry(10, 3.4), new THREE.MeshStandardMaterial({color: 0xf3f4f6, roughness: 1}), 0, 1.7, -2.8);
  add(new THREE.CircleGeometry(.28, 40), new THREE.MeshBasicMaterial({map: clockTex()}), .38, 1.6, -2.78);
  // 책상 · 모니터 2대 · 키보드 · 서류 · 휴대폰
  add(new THREE.BoxGeometry(1.6, .04, .8), wood, 0, .74, -.05);
  [[-.75, -.4], [.75, -.4], [-.75, .3], [.75, .3]].forEach(([x, z]) => add(new THREE.BoxGeometry(.04, .72, .04), grey, x, .36, z));
  const monitor = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    add(new THREE.BoxGeometry(.22, .015, .16), grey, 0, .768, 0, g); add(new THREE.BoxGeometry(.04, .3, .03), grey, 0, .9, -.01, g);
    add(new THREE.BoxGeometry(.62, .38, .025), dark, 0, 1.11, 0, g); add(new THREE.PlaneGeometry(.58, .34), new THREE.MeshBasicMaterial({map: screenTex()}), 0, 1.11, .0135, g); };
  monitor(0, -.3, 0); monitor(.66, -.18, -.55);
  add(new THREE.BoxGeometry(.44, .02, .14), white, 0, .77, .14);
  const paper = add(new THREE.PlaneGeometry(.21, .297), new THREE.MeshStandardMaterial({map: docTex(), roughness: .9}), -.2, .762, .12); paper.rotation.x = -Math.PI / 2; paper.rotation.z = .12;
  add(new THREE.BoxGeometry(.075, .009, .155), dark, .27, .765, .13);
  // 의자 · 앉은 사람 (흰색 마네킹)
  add(new THREE.BoxGeometry(.48, .06, .46), dark, 0, .46, .64); add(new THREE.BoxGeometry(.46, .5, .05), dark, 0, .8, .88);
  add(new THREE.CylinderGeometry(.03, .03, .42, 10), grey, 0, .23, .64);
  limb(V(0, .56, .64), V(0, .98, .58), .14);
  limb(V(0, 1.04, .57), V(0, 1.12, .54), .045);
  [-1, 1].forEach(s => {
    limb(V(s * .19, 1.0, .58), V(s * .22, .81, .44), .046); limb(V(s * .22, .81, .44), V(s * .15, .79, .2), .04);
    add(new THREE.SphereGeometry(.045, 16, 12), white, s * .14, .79, .17);
    limb(V(s * .1, .52, .64), V(s * .11, .53, .22), .075); limb(V(s * .11, .53, .22), V(s * .11, .08, .16), .058);
    add(new THREE.BoxGeometry(.09, .06, .22), white, s * .11, .03, .1);
  });
  const neck = new THREE.Group(); neck.position.set(0, 1.12, .54); scene.add(neck);
  const hd = add(new THREE.SphereGeometry(.105, 28, 20), white, 0, .1, -.01, neck); hd.scale.set(.86, 1, .96);
  const gl = new THREE.MeshStandardMaterial({color: 0x15171c, roughness: .3});
  [-1, 1].forEach(s => { const ring = add(new THREE.TorusGeometry(.03, .0045, 8, 28), gl, s * .039, .1, -.104, neck); ring.scale.y = .8; add(new THREE.BoxGeometry(.004, .004, .1), gl, s * .07, .11, -.055, neck); });
  add(new THREE.BoxGeometry(.018, .004, .004), gl, 0, .108, -.104, neck);
  // 시선 점선과 목표 표시
  const sightGeo = new THREE.BufferGeometry().setFromPoints([V(), V()]);
  const sight = new THREE.Line(sightGeo, new THREE.LineDashedMaterial({color: 0x0b7a91, dashSize: .04, gapSize: .025})); scene.add(sight);
  const mark = new THREE.Mesh(new THREE.SphereGeometry(.025, 16, 12), new THREE.MeshBasicMaterial({color: 0x0e8aa2})); scene.add(mark);
  const cam = new THREE.PerspectiveCamera(36, 1.4, .05, 50), tgt = V(.12, .96, -.08);
  const orbit = {az: -.95, el: .3, dist: 2.35, hold: 0};
  let W = 0, H = 0, raf = 0;
  const eye = V(), tv = V(), pv = V();
  function layout() { W = box.clientWidth; H = box.clientHeight; if (!W) return; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); }
  const CAM0 = {az: -.95, el: .3, dist: 2.35, tgt: [.12, .96, -.08]};       // 장면마다 카메라도 같이 이동 (먼 곳은 벽 시계까지 보이게)
  function setScene(k) {
    cur = k; const s = OFFICE[k], from = head.slice(), t0 = performance.now(); anim = t0;
    const c0 = {az: orbit.az, el: orbit.el, dist: orbit.dist, tgt: tgt.toArray()}, c1 = s.cam || CAM0;
    (function step(now) { if (anim !== t0) return; const t = clamp((now - t0) / 800, 0, 1), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, L = (a, b) => a + (b - a) * e;
      head = [L(from[0], s.head[0]), L(from[1], s.head[1])];
      orbit.az = L(c0.az, c1.az); orbit.el = L(c0.el, c1.el); orbit.dist = L(c0.dist, c1.dist); tgt.set(L(c0.tgt[0], c1.tgt[0]), L(c0.tgt[1], c1.tgt[1]), L(c0.tgt[2], c1.tgt[2]));
      if (t < 1) requestAnimationFrame(step); })(t0);
    dot.style.transform = `translate(${s.zone[0]}px,${s.zone[1]}px)`; dot.classList.toggle('is-bad', !s.ok);
    read.style.filter = s.blur ? `blur(${s.blur}px)` : 'none';
    stTag.textContent = s.st || (s.ok ? '선명하게 보여요' : '흐리게 보여요'); stTag.className = 'of-st ' + (s.ok ? 'is-ok' : 'is-bad');
    cap.innerHTML = `<b>${s.title}</b> — ${s.msg} <small>개념 설명용 3D입니다. 영역의 넓이는 제품마다 다릅니다.</small>`;
    el.querySelectorAll('[data-k=sc] button').forEach(b => b.classList.toggle('is-on', b.dataset.v === k));
    mark.material.color.set(s.ok ? 0x0e8aa2 : 0xd92d20); sight.material.color.set(s.ok ? 0x0b7a91 : 0xd92d20);
  }
  const TAGS = [['mon', '모니터 · 중간 거리', V(0, 1.34, -.3)], ['dual', '듀얼 모니터', V(.66, 1.34, -.18)], ['near', '서류 · 근거리', V(-.2, .8, .26)], ['clock', '벽 시계 · 2m형', V(.38, 1.95, -2.78)]];
  function loop(t) {
    raf = requestAnimationFrame(loop); if (!W) return;
    const idle = performance.now() > orbit.hold, az = orbit.az + (idle ? Math.sin(t / 5200) * .12 : 0);
    cam.position.set(tgt.x + orbit.dist * Math.cos(orbit.el) * Math.sin(az), tgt.y + orbit.dist * Math.sin(orbit.el), tgt.z + orbit.dist * Math.cos(orbit.el) * Math.cos(az)); cam.lookAt(tgt);
    neck.rotation.set(head[0], head[1], 0, 'YXZ');
    neck.localToWorld(eye.set(0, .1, -.11)); tv.set(...OFFICE[cur].target);
    sightGeo.setFromPoints([eye, tv]); sight.computeLineDistances(); mark.position.copy(tv); mark.scale.setScalar(1 + Math.sin(t / 260) * .25);
    renderer.render(scene, cam);
    labels.innerHTML = TAGS.map(([k, n, p]) => { pv.copy(p).project(cam); return `<div class="of-tag ${k === cur ? 'is-on' : ''} ${k === cur && !OFFICE[k].ok ? 'is-bad' : ''}" style="left:${(pv.x * .5 + .5) * W}px;top:${(-pv.y * .5 + .5) * H}px">${n}</div>`; }).join('');
  }
  let drag = null;
  box.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el}; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', e => { if (!drag) return; orbit.az = drag.az - (e.clientX - drag.x) * .006; orbit.el = clamp(drag.el + (e.clientY - drag.y) * .004, .05, .9); orbit.hold = performance.now() + 6000; });
  ['pointerup', 'pointercancel'].forEach(k => box.addEventListener(k, () => { drag = null; }));
  el.querySelector('[data-k=sc]').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setScene(b.dataset.v); });
  const ro = new ResizeObserver(layout); ro.observe(box); layout(); setScene('mon'); raf = requestAnimationFrame(loop);
  return {
    update() {},
    destroy() { anim = -1; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
  };
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
