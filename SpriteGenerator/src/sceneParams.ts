/**
 * The FIXED capture camera + lighting. Kept separate from mummyParams because
 * these describe the *game's world view*, not the character. The whole point of
 * exposing them as live sliders is to nail the exact board angle after the fact,
 * then freeze these numbers.
 *
 * Game perspective (from the game's Board): a faked bird's-eye, light from the
 * top-left, depth extruded down-right. Per the brief: near-overhead but tilted
 * ~20° toward South, so a South-facing character shows a little of their front.
 * That is elevation ≈ 70° from horizontal (20° off straight-down), azimuth on
 * the South side looking North across the board.
 */
export interface SceneParams {
  camera: {
    /** degrees above the horizon. 90 = straight down (pure bird's-eye). */
    elevationDeg: number;
    /** degrees around Y. 0 = camera due South of the model, looking North. */
    azimuthDeg: number;
    /** half-height of the orthographic frustum in world units (zoom). */
    frustumHalf: number;
    /** distance of the camera from the target (ortho: affects only clipping). */
    distance: number;
    /** target height the camera looks at (roughly the model's mid-height). */
    targetY: number;
  };
  light: {
    /** key light direction, in SCREEN-space intent: top-left-ish. */
    keyElevationDeg: number;
    keyAzimuthDeg: number;
    keyIntensity: number;
    fillIntensity: number;
    ambientIntensity: number;
  };
  /** pixels rendered per frame before downscale (4× of the 64px target). */
  renderPx: number;
  /** final on-board frame size in px. */
  framePx: number;
  /** unsharp-mask amount applied on downscale (0 = none). */
  sharpen: number;
}

export const sceneParams: SceneParams = {
  camera: {
    elevationDeg: 70,
    azimuthDeg: 0,
    frustumHalf: 1.95,
    distance: 20,
    targetY: 1.1,
  },
  light: {
    keyElevationDeg: 58,
    keyAzimuthDeg: -42, // top-LEFT (west + north of the model)
    keyIntensity: 2.1,
    fillIntensity: 0.55,
    ambientIntensity: 0.55,
  },
  renderPx: 256,
  framePx: 64,
  sharpen: 0.4,
};

/** The 8 baked facings, in the order stored in the sheet + metadata. */
export const FACINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Facing = (typeof FACINGS)[number];

/**
 * Root Y-rotation (radians) that turns the South-built model to face a compass
 * direction. Front starts at +Z (South). Positive Y-rotation sends +Z toward +X.
 */
export const FACING_ANGLE: Record<Facing, number> = {
  S: 0,
  SW: -Math.PI / 4,
  W: -Math.PI / 2,
  NW: (-3 * Math.PI) / 4,
  N: Math.PI,
  NE: (3 * Math.PI) / 4,
  E: Math.PI / 2,
  SE: Math.PI / 4,
};
