import * as THREE from 'three';
import { buildMummy } from './buildMummy';
import { applyPose } from './pose';
import { CLIPS, CLIP_ORDER } from './clips';
import { FACINGS, FACING_ANGLE, sceneParams } from './sceneParams';
import { makeCamera, makeLights } from './stage';
import type { Variant } from './textures';

export interface SheetMeta {
  frameW: number;
  frameH: number;
  columns: number;
  rows: number;
  variants: Variant[];
  facings: readonly string[];
  clips: Array<{ name: string; frames: number; fps: number; row: number }>;
  note: string;
}

/** Layout math shared by the baker and the meta: which sheet row a (clip,facing) is. */
function computeLayout() {
  const facingCount = FACINGS.length;
  let row = 0;
  let columns = 0;
  const clips = CLIP_ORDER.map((name) => {
    const def = CLIPS[name];
    const entry = { name, frames: def.frames, fps: def.fps, row };
    columns = Math.max(columns, def.frames);
    row += facingCount;
    return entry;
  });
  return { clips, rows: row, columns };
}

export function buildMeta(): SheetMeta {
  const { clips, rows, columns } = computeLayout();
  return {
    frameW: sceneParams.framePx,
    frameH: sceneParams.framePx,
    columns,
    rows,
    variants: ['white', 'red'],
    facings: FACINGS,
    clips,
    note:
      'Each clip occupies a block of 8 rows (one per facing, in `facings` order); ' +
      'columns are animation frames. Fixed game-view camera; transparent background.',
  };
}

// 3×3 unsharp — light edge crispening for the pre-rendered read on downscale.
function sharpen(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, amount: number) {
  if (amount <= 0) return;
  const img = ctx.getImageData(x, y, s, s);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const a = amount;
  const w = s;
  for (let j = 1; j < s - 1; j++) {
    for (let i = 1; i < s - 1; i++) {
      const o = (j * w + i) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[o + c];
        const up = src[o - w * 4 + c];
        const dn = src[o + w * 4 + c];
        const lf = src[o - 4 + c];
        const rt = src[o + 4 + c];
        out[o + c] = center + a * (4 * center - up - dn - lf - rt);
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, x, y);
}

/**
 * Bake one variant into a packed sheet canvas using the supplied (already
 * configured) renderer. The renderer, camera and lights are shared across
 * variants so both sheets are pixel-identical in framing.
 */
// ONE shared renderer for all bakes. Creating a WebGLRenderer per bake (the live
// contact sheet re-bakes on every slider move) leaks GL contexts until the
// browser kills the oldest — which blanked the export. Reuse a singleton and
// never dispose it.
let sharedRenderer: THREE.WebGLRenderer | null = null;
function bakeRenderer(): THREE.WebGLRenderer {
  if (sharedRenderer) return sharedRenderer;
  const R = sceneParams.renderPx;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(R, R, false);
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;
  sharedRenderer = r;
  return r;
}

function bakeVariant(
  variant: Variant,
  renderer: THREE.WebGLRenderer,
  camera: THREE.OrthographicCamera,
  lights: THREE.Group,
): HTMLCanvasElement {
  const R = sceneParams.renderPx;
  const F = sceneParams.framePx;
  const { clips, rows, columns } = computeLayout();

  const scene = new THREE.Scene();
  scene.add(lights);
  const rig = buildMummy(variant);
  scene.add(rig.root);

  const sheet = document.createElement('canvas');
  sheet.width = columns * F;
  sheet.height = rows * F;
  const sctx = sheet.getContext('2d')!;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';

  // Scratch 2D canvas to read pixels back for the auto-centre measurement.
  const meas = document.createElement('canvas');
  meas.width = meas.height = R;
  const mctx = meas.getContext('2d', { willReadFrequently: true })!;

  // Feet land on this fraction of the frame, in EVERY facing (a fixed floor line).
  const FEET_TARGET = 0.773;

  for (const clip of clips) {
    const def = CLIPS[clip.name as keyof typeof CLIPS];
    for (let fi = 0; fi < FACINGS.length; fi++) {
      const facing = FACINGS[fi];
      rig.root.rotation.y = FACING_ANGLE[facing];

      // Per-facing offset: the model rotates around a pivot BEHIND the figure
      // (arms thrust forward), so each facing drifts sideways/vertically in the
      // frame. Measure frame 0's silhouette and shift ALL of this facing's frames
      // so the figure is centred horizontally and its feet sit on FEET_TARGET.
      applyPose(rig, clip.name as keyof typeof CLIPS, 0);
      renderer.render(scene, camera);
      mctx.clearRect(0, 0, R, R);
      mctx.drawImage(renderer.domElement, 0, 0);
      const px = mctx.getImageData(0, 0, R, R).data;
      let minX = R;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < R; y++) {
        const rowo = y * R * 4;
        for (let x = 0; x < R; x++) {
          if (px[rowo + x * 4 + 3] > 16) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      const offX = maxX >= 0 ? R / 2 - (minX + maxX) / 2 : 0; // centre horizontally
      const offY = maxX >= 0 ? FEET_TARGET * R - maxY : 0; // feet → fixed floor line
      const dxF = (offX * F) / R;
      const dyF = (offY * F) / R;

      for (let frame = 0; frame < def.frames; frame++) {
        const t = frame / def.frames;
        applyPose(rig, clip.name as keyof typeof CLIPS, t);
        renderer.render(scene, camera);

        const cx = frame * F;
        const cy = (clip.row + fi) * F;
        // downscale the 4× GL frame into the cell, shifted to the centred/anchored spot
        sctx.clearRect(cx, cy, F, F);
        sctx.drawImage(renderer.domElement, 0, 0, R, R, cx + dxF, cy + dyF, F, F);
        sharpen(sctx, cx, cy, F, sceneParams.sharpen);
      }
    }
  }

  scene.remove(rig.root);
  rig.dispose();
  return sheet;
}

export interface BakeResult {
  white: HTMLCanvasElement;
  red: HTMLCanvasElement;
  meta: SheetMeta;
}

/** Bake ONE variant's sheet (uses the shared renderer + current scene params). */
export function bakeSheet(variant: Variant): HTMLCanvasElement {
  return bakeVariant(variant, bakeRenderer(), makeCamera(), makeLights());
}

/** Bake both variants + metadata. */
export function bakeAll(): BakeResult {
  return { white: bakeSheet('white'), red: bakeSheet('red'), meta: buildMeta() };
}

/** Trigger browser downloads of the two PNGs + JSON, staggered (Safari blocks
 *  rapid successive programmatic downloads, so space them out). */
export function downloadBake(result: BakeResult) {
  const save = (name: string, url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const metaUrl = URL.createObjectURL(
    new Blob([JSON.stringify(result.meta, null, 2)], { type: 'application/json' }),
  );
  const items: Array<[string, string]> = [
    ['mummy_white.png', result.white.toDataURL('image/png')],
    ['mummy_red.png', result.red.toDataURL('image/png')],
    ['mummy.meta.json', metaUrl],
  ];
  items.forEach(([name, url], i) => setTimeout(() => save(name, url), i * 350));
}
