/**
 * EVERY proportion of the mummy lives here as a plain number. Iteration loop:
 * change a number, save, the dev page hot-reloads and re-poses instantly.
 * Units are arbitrary world units; the camera frustum (sceneParams) frames them.
 *
 * Convention baked into the model:
 *   +X = East (screen right)   -X = West (screen left)
 *   +Y = up                    -Y = down
 *   +Z = South (toward camera, screen down)   -Z = North (away, screen up)
 * The mummy is built FACING SOUTH (+Z), i.e. front/stomach toward the camera at
 * the default 0° facing. Facing is applied later by rotating the root around Y.
 */
export interface MummyParams {
  /** Overall uniform scale applied to the whole rig. */
  scale: number;

  head: {
    radius: number;
    /** vertical squash (1 = sphere, <1 = shorter). */
    squashY: number;
    /** depth (Z) stretch so the skull reads as a head not a ball. */
    stretchZ: number;
    /** height of the head centre above the torso top. */
    lift: number;
  };

  /**
   * The torso is ONE revolved (lathe) solid whose profile tapers from a narrow
   * waist out to broad shoulders — the shoulder blades are part of the core
   * body, not a separate bar. Radii are the profile's half-widths at each
   * height (local y, torso-centred); chestWiden/depthScale then squash the
   * revolved circle into a broad flat slab (wide in X, shallow in Z).
   */
  torso: {
    waistRadius: number;
    shoulderRadius: number; // the widest point — supports the arms
    pelvisRadius: number; // hips: flare below the waist that the legs socket into
    /** profile heights (torso-local y), bottom → neck. */
    bottomY: number;
    hipY: number; // height of the widest pelvis point
    waistY: number;
    chestY: number;
    shoulderY: number; // height of the widest point / arm line
    topY: number; // neck cap
    /** stretches the whole torso vertically (1 = base). Height without girth. */
    heightScale: number;
    /** slab squash of the revolved circle. */
    chestWiden: number;
    depthScale: number;
    /** centre height of the torso in world space. */
    y: number;
  };

  arm: {
    radius: number; // upper-arm (shoulder) radius
    /** wrist radius as a fraction of `radius` (limbs taper, they aren't tubes). */
    wristScale: number;
    length: number;
    /** arms attach at shoulderRadius·chestWiden·spread. <1 tucks the pivot
     *  INSIDE the shoulder mass so the joint is buried (not visible from behind). */
    spread: number;
    /** base outward angle (radians) so the arms splay out toward the hands. */
    splay: number;
    /** small forward offset of the shoulder pivot (+Z). */
    shoulderZ: number;
    /** classic mummy reach: how far forward the arms are thrust, 0..1 of 90°. */
    forward: number;
  };

  leg: {
    radius: number; // thigh radius
    /** ankle radius as a fraction of `radius`. */
    ankleScale: number;
    length: number;
    /** hip pivot: sideways (±X) and how far below torso centre it drops. */
    hipX: number;
    hipDrop: number;
    /** the foot: a flat shape that points FORWARD (+Z), not a ball. */
    foot: {
      length: number; // forward extent (+Z)
      width: number; // side extent (X) — kept ≈ leg width so it never splays out
      height: number; // thickness (Y) — flat
      forward: number; // how far the foot sits ahead of the ankle
    };
  };
}

export const mummyParams: MummyParams = {
  scale: 1,

  head: {
    radius: 0.5,
    squashY: 1.0,
    stretchZ: 1.0,
    lift: 0.22,
  },

  torso: {
    waistRadius: 0.5,
    shoulderRadius: 0.8,
    pelvisRadius: 0.5,
    bottomY: -0.92,
    hipY: -0.5,
    waistY: -0.24,
    chestY: 0.18,
    shoulderY: 0.6,
    topY: 0.95,
    heightScale: 1.12,
    chestWiden: 1.12,
    depthScale: 0.52,
    y: 1.28,
  },

  arm: {
    radius: 0.22,
    wristScale: 0.8,
    length: 1.02,
    spread: 0.72,
    splay: 0.32,
    shoulderZ: -0.06,
    forward: 0.82,
  },

  leg: {
    radius: 0.26,
    ankleScale: 0.72,
    length: 1.12,
    hipX: 0.32,
    hipDrop: 0.55,
    foot: {
      length: 0.46,
      width: 0.19,
      height: 0.11,
      forward: 0.13,
    },
  },
};
