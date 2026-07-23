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

  for (const clip of clips) {
    const def = CLIPS[clip.name as keyof typeof CLIPS];
    for (let fi = 0; fi < FACINGS.length; fi++) {
      const facing = FACINGS[fi];
      rig.root.rotation.y = FACING_ANGLE[facing];
      for (let frame = 0; frame < def.frames; frame++) {
        const t = frame / def.frames;
        applyPose(rig, clip.name as keyof typeof CLIPS, t);
        renderer.render(scene, camera);

        const cx = frame * F;
        const cy = (clip.row + fi) * F;
        // downscale the 4× GL frame straight into the sheet cell
        sctx.clearRect(cx, cy, F, F);
        sctx.drawImage(renderer.domElement, 0, 0, R, R, cx, cy, F, F);
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

/** Bake both variants + metadata. Self-contained: owns its renderer. */
export function bakeAll(): BakeResult {
  const R = sceneParams.renderPx;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(R, R, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const camera = makeCamera();
  const lights = makeLights();

  const white = bakeVariant('white', renderer, camera, lights);
  const red = bakeVariant('red', renderer, camera, lights);
  const meta = buildMeta();

  renderer.dispose();
  renderer.forceContextLoss();
  return { white, red, meta };
}

/** Trigger browser downloads of the two PNGs + JSON. */
export function downloadBake(result: BakeResult) {
  const save = (name: string, url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  save('mummy_white.png', result.white.toDataURL('image/png'));
  save('mummy_red.png', result.red.toDataURL('image/png'));
  const metaBlob = new Blob([JSON.stringify(result.meta, null, 2)], { type: 'application/json' });
  save('mummy.meta.json', URL.createObjectURL(metaBlob));
}
