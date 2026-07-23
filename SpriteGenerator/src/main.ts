import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMummy, type MummyRig } from './buildMummy';
import { applyPose } from './pose';
import { CLIPS, CLIP_ORDER, type ClipName } from './clips';
import { FACINGS, FACING_ANGLE, sceneParams, type Facing } from './sceneParams';
import { makeCamera, makeLights, updateCamera, updateLights } from './stage';
import { bakeAll, bakeSheet, downloadBake, type BakeResult } from './capture';
import type { Variant } from './textures';

// ── shared scene (one mummy, viewed by the fixed cam and the debug orbit cam) ──
const scene = new THREE.Scene();
const lights = makeLights();
scene.add(lights);

const _q0 = new URLSearchParams(location.search);
let variant: Variant = _q0.get('variant') === 'red' ? 'red' : 'white';
let rig: MummyRig = buildMummy(variant);
scene.add(rig.root);

function rebuildRig() {
  scene.remove(rig.root);
  rig.dispose();
  rig = buildMummy(variant);
  scene.add(rig.root);
}

// ── state (seedable via URL query for headless screenshots) ──
const q = new URLSearchParams(location.search);
let clip: ClipName = (q.get('clip') as ClipName) in CLIPS ? (q.get('clip') as ClipName) : 'walk';
let facingRad = q.get('facing') && (q.get('facing') as Facing) in FACING_ANGLE
  ? FACING_ANGLE[q.get('facing') as Facing]
  : FACING_ANGLE.S;
let frame = q.get('frame') ? Math.max(0, parseInt(q.get('frame')!, 10) || 0) : 0;
let playing = q.get('play') !== '0';
let playT = 0; // seconds

// ── main fixed-camera view ──
const PREVIEW_PX = 360;
const mainCanvas = document.createElement('canvas');
mainCanvas.className = 'main';
mainCanvas.width = mainCanvas.height = PREVIEW_PX;
const mainRenderer = new THREE.WebGLRenderer({ canvas: mainCanvas, antialias: true, alpha: true });
mainRenderer.setPixelRatio(1);
mainRenderer.setSize(PREVIEW_PX, PREVIEW_PX, false);
mainRenderer.setClearColor(0x000000, 0);
mainRenderer.outputColorSpace = THREE.SRGBColorSpace;
mainRenderer.toneMapping = THREE.NoToneMapping;
const mainCam = makeCamera();

// ── debug free-orbit view ──
const DEBUG_PX = 240;
const debugCanvas = document.createElement('canvas');
debugCanvas.className = 'debug';
debugCanvas.width = debugCanvas.height = DEBUG_PX;
const debugRenderer = new THREE.WebGLRenderer({ canvas: debugCanvas, antialias: true, alpha: true });
debugRenderer.setPixelRatio(1);
debugRenderer.setSize(DEBUG_PX, DEBUG_PX, false);
debugRenderer.setClearColor(0x14100a, 1);
debugRenderer.outputColorSpace = THREE.SRGBColorSpace;
const debugCam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
debugCam.position.set(3.4, 3.2, 5.2);
const orbit = new OrbitControls(debugCam, debugCanvas);
orbit.target.set(0, sceneParams.camera.targetY, 0);
orbit.update();

// ── mount views ──
const views = document.getElementById('views')!;
function viewBox(caption: string, canvas: HTMLCanvasElement) {
  const box = document.createElement('div');
  box.className = 'viewbox';
  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.textContent = caption;
  box.append(canvas, cap);
  return box;
}
views.append(
  viewBox('Fixed game camera (baked view)', mainCanvas),
  viewBox('Debug — free orbit', debugCanvas),
);

// ── contact sheet ──
const sheetCanvas = document.getElementById('sheet') as HTMLCanvasElement;
const sheetLabel = document.getElementById('sheetlabel')!;
let sheetTimer = 0;
function scheduleSheet() {
  window.clearTimeout(sheetTimer);
  sheetTimer = window.setTimeout(rebuildSheet, 220);
}
function rebuildSheet() {
  // bake ONLY the current variant for the live sheet (cheap enough)
  const cv = bakeSheet(variant);
  sheetCanvas.width = cv.width;
  sheetCanvas.height = cv.height;
  const ctx = sheetCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(cv, 0, 0);
  sheetLabel.textContent = variant;
}

// ── control panel ──
const panel = document.getElementById('panel')!;

function h1(text: string, sub: string) {
  const t = document.createElement('h1');
  t.textContent = text;
  const s = document.createElement('p');
  s.className = 'sub';
  s.textContent = sub;
  panel.append(t, s);
}

function group(title: string): HTMLElement {
  const g = document.createElement('div');
  g.className = 'group';
  const l = document.createElement('label');
  l.className = 'title';
  l.textContent = title;
  g.append(l);
  panel.append(g);
  return g;
}

function btnRow(parent: HTMLElement): HTMLElement {
  const r = document.createElement('div');
  r.className = 'btnrow';
  parent.append(r);
  return r;
}

function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = onClick;
  parent.append(b);
  return b;
}

function slider(
  parent: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  get: () => number,
  set: (v: number) => void,
  opts: { live?: boolean } = {},
) {
  const row = document.createElement('div');
  row.className = 'row';
  const l = document.createElement('label');
  l.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(get());
  const val = document.createElement('span');
  val.className = 'val';
  val.textContent = get().toFixed(step < 1 ? 2 : 0);
  input.oninput = () => {
    const v = parseFloat(input.value);
    set(v);
    val.textContent = v.toFixed(step < 1 ? 2 : 0);
    if (opts.live) {
      updateCamera(mainCam, sceneParams);
      updateLights(lights, sceneParams);
      scheduleSheet();
    }
  };
  row.append(l, input, val);
  parent.append(row);
  return { input, val };
}

h1('Mummy Sprite Generator', 'Parametric 3D → baked sheets. Fixed game camera.');

// playback
const gPlay = group('Playback');
const variantRow = btnRow(gPlay);
const variantBtns: Record<Variant, HTMLButtonElement> = {
  white: button(variantRow, 'white', () => setVariant('white')),
  red: button(variantRow, 'red', () => setVariant('red')),
};
const clipRow = btnRow(gPlay);
const clipBtns: Partial<Record<ClipName, HTMLButtonElement>> = {};
for (const name of CLIP_ORDER) {
  clipBtns[name] = button(clipRow, name, () => setClip(name));
}
const transportRow = btnRow(gPlay);
const playBtn = button(transportRow, '⏸ pause', togglePlay);
const frameSlider = slider(
  gPlay,
  'frame',
  0,
  CLIPS[clip].frames - 1,
  1,
  () => frame,
  (v) => {
    playing = false;
    playBtn.textContent = '▶ play';
    frame = Math.round(v);
  },
);

// facing
const gFace = group('Facing (root Y rotation)');
const faceRow = btnRow(gFace);
for (const f of FACINGS) {
  button(faceRow, f, () => setFacing(FACING_ANGLE[f as Facing]));
}
const faceSlider = slider(
  gFace,
  'free °',
  0,
  360,
  1,
  () => ((facingRad * 180) / Math.PI + 360) % 360,
  (v) => {
    facingRad = (v * Math.PI) / 180;
  },
);

// camera (live)
const gCam = group('Camera (live — freeze into sceneParams.ts)');
slider(gCam, 'elevation°', 20, 90, 1, () => sceneParams.camera.elevationDeg, (v) => (sceneParams.camera.elevationDeg = v), { live: true });
slider(gCam, 'azimuth°', -90, 90, 1, () => sceneParams.camera.azimuthDeg, (v) => (sceneParams.camera.azimuthDeg = v), { live: true });
slider(gCam, 'frustum½', 1.2, 3.2, 0.05, () => sceneParams.camera.frustumHalf, (v) => (sceneParams.camera.frustumHalf = v), { live: true });
slider(gCam, 'targetY', 0.4, 1.8, 0.02, () => sceneParams.camera.targetY, (v) => (sceneParams.camera.targetY = v), { live: true });

// light (live)
const gLight = group('Light (live)');
slider(gLight, 'key elev°', 10, 90, 1, () => sceneParams.light.keyElevationDeg, (v) => (sceneParams.light.keyElevationDeg = v), { live: true });
slider(gLight, 'key azim°', -180, 180, 1, () => sceneParams.light.keyAzimuthDeg, (v) => (sceneParams.light.keyAzimuthDeg = v), { live: true });
slider(gLight, 'key intensity', 0, 4, 0.05, () => sceneParams.light.keyIntensity, (v) => (sceneParams.light.keyIntensity = v), { live: true });
slider(gLight, 'fill', 0, 2, 0.05, () => sceneParams.light.fillIntensity, (v) => (sceneParams.light.fillIntensity = v), { live: true });
slider(gLight, 'ambient', 0, 2, 0.05, () => sceneParams.light.ambientIntensity, (v) => (sceneParams.light.ambientIntensity = v), { live: true });

// actions
const gAct = group('Export');
const actRow = btnRow(gAct);
button(actRow, '↻ rebuild sheet', rebuildSheet);
button(actRow, '⬇ export PNG + JSON', () => downloadBake(bakeAll()));

// ── state setters ──
function setVariant(v: Variant) {
  if (v === variant) return;
  variant = v;
  rebuildRig();
  refreshActive();
  scheduleSheet();
}
function setClip(name: ClipName) {
  clip = name;
  frame = 0;
  playT = 0;
  frameSlider.input.max = String(CLIPS[name].frames - 1);
  refreshActive();
}
function setFacing(rad: number) {
  facingRad = rad;
  faceSlider.input.value = String(Math.round(((rad * 180) / Math.PI + 360) % 360));
  faceSlider.val.textContent = (((rad * 180) / Math.PI + 360) % 360).toFixed(0);
}
function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? '⏸ pause' : '▶ play';
}
function refreshActive() {
  for (const v of ['white', 'red'] as Variant[]) variantBtns[v].classList.toggle('active', v === variant);
  for (const name of CLIP_ORDER) clipBtns[name]!.classList.toggle('active', name === clip);
}

// ── render loop ──
let last = performance.now();
function loop(now: number) {
  const dt = (now - last) / 1000;
  last = now;

  const def = CLIPS[clip];
  if (playing) {
    playT += dt;
    frame = Math.floor(playT * def.fps) % def.frames;
    frameSlider.input.value = String(frame);
    frameSlider.val.textContent = String(frame);
  }
  const t = frame / def.frames;

  rig.root.rotation.y = facingRad;
  applyPose(rig, clip, t);

  updateCamera(mainCam, sceneParams);
  mainRenderer.render(scene, mainCam);

  orbit.update();
  debugRenderer.render(scene, debugCam);

  requestAnimationFrame(loop);
}

refreshActive();
rebuildSheet();
requestAnimationFrame(loop);

// ── headless hook for scripts/bake.mjs ──
declare global {
  interface Window {
    __generateSheets: () => { white: string; red: string; meta: unknown };
    __spriteReady: boolean;
  }
}
window.__generateSheets = () => {
  const r: BakeResult = bakeAll();
  return {
    white: r.white.toDataURL('image/png'),
    red: r.red.toDataURL('image/png'),
    meta: r.meta,
  };
};
window.__spriteReady = true;
