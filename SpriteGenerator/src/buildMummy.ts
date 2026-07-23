import * as THREE from 'three';
import { mummyParams } from './mummyParams';
import { makeBandageTexture, makeHeadTexture, type Variant } from './textures';

/**
 * Builds the parametric mummy as a parent-child rig of three.js primitives.
 * NOTHING here is 2D art: capsules (torso/limbs), a horizontal capsule shoulder
 * yoke, a squashed sphere head, a flattened ellipsoid eye-band + gold eyes.
 * The wrapped-bandage read comes entirely from the texture (see textures.ts) —
 * no circular wrap rings, which read as "toilet paper" at these proportions.
 *
 * All measurements come from mummyParams so tuning is number-editing. Rotations
 * are set entirely by the pose each frame; geometry is built at neutral.
 *
 * Hierarchy (facing is a Y-rotation of `root`, applied by the scene):
 *   root
 *    └ bob                     vertical bob (pose)
 *       └ body
 *          ├ torso             upper-body lean pivot
 *          │  ├ torsoMesh
 *          │  ├ shoulder yoke  (broad bar the arms hang off)
 *          │  ├ head           head-twist pivot (isolated, like the game)
 *          │  ├ shoulderL → arm
 *          │  └ shoulderR → arm
 *          ├ hipL → leg
 *          └ hipR → leg
 */
export interface MummyRig {
  root: THREE.Group;
  bob: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  variant: Variant;
  dispose(): void;
}

function limbMaterial(tex: THREE.Texture): THREE.MeshStandardMaterial {
  // Flat-ish, matte — a pre-render read, not a plastic toy. No metalness, high
  // roughness so the baked key light paints soft shading without a hot specular.
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0,
  });
}

export function buildMummy(variant: Variant): MummyRig {
  const P = mummyParams;
  const disposables: Array<{ dispose(): void }> = [];

  const tex = makeBandageTexture(variant);
  const headTex = makeHeadTexture(variant);
  disposables.push(tex, headTex);
  const skin = limbMaterial(tex);
  const headSkin = limbMaterial(headTex);
  disposables.push(skin, headSkin);

  const root = new THREE.Group();
  const bob = new THREE.Group();
  const body = new THREE.Group();
  root.add(bob);
  bob.add(body);

  // ── torso: ONE revolved solid. The profile tapers from a narrow waist out to
  //    broad shoulders and caps at the neck, so the shoulder blades are part of
  //    the core body — the back genuinely widens toward the top to carry the
  //    arms. Then squash the revolved circle into a broad, shallow slab. ─────
  const torso = new THREE.Group();
  torso.position.y = P.torso.y;
  body.add(torso);

  const T = P.torso;
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, T.bottomY), // closed bottom pole (under the pelvis)
    new THREE.Vector2(T.pelvisRadius * 0.62, T.bottomY + 0.05),
    new THREE.Vector2(T.pelvisRadius, T.hipY), // hips — the legs socket in here
    new THREE.Vector2(T.waistRadius * 1.02, (T.hipY + T.waistY) / 2),
    new THREE.Vector2(T.waistRadius, T.waistY), // narrow waist
    new THREE.Vector2(THREE.MathUtils.lerp(T.waistRadius, T.shoulderRadius, 0.42), T.chestY),
    new THREE.Vector2(T.shoulderRadius * 0.95, T.shoulderY - 0.14),
    new THREE.Vector2(T.shoulderRadius, T.shoulderY), // widest — the shoulders
    new THREE.Vector2(T.shoulderRadius * 0.78, T.shoulderY + 0.16),
    new THREE.Vector2(T.shoulderRadius * 0.44, T.topY - 0.05),
    new THREE.Vector2(0.2, T.topY),
    new THREE.Vector2(0.0, T.topY + 0.04), // closed neck cap
  ];
  const torsoGeo = new THREE.LatheGeometry(profile, 28);
  disposables.push(torsoGeo);
  const torsoMesh = new THREE.Mesh(torsoGeo, skin);
  torsoMesh.scale.set(T.chestWiden, 1, T.depthScale);
  torso.add(torsoMesh);

  // ── head (isolated pivot, like the game's `.sprite-head`) ───────────────
  const head = new THREE.Group();
  head.position.y = T.topY + P.head.lift;
  torso.add(head);

  // The head is a plain sphere; the eyes/eye-band are PAINTED into headTex and
  // sit perfectly flush on the surface (no protruding geometry). The face is
  // centred on the sphere's front by the texture UV mapping (see textures.ts).
  const headGeo = new THREE.SphereGeometry(P.head.radius, 28, 20);
  disposables.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, headSkin);
  headMesh.scale.set(1, P.head.squashY, P.head.stretchZ);
  head.add(headMesh);

  // ── arms (thrust forward in the pose), hung off the shoulder ends ────────
  const armGeo = new THREE.CapsuleGeometry(P.arm.radius, P.arm.length, 6, 16);
  disposables.push(armGeo);
  const fistGeo = new THREE.SphereGeometry(P.arm.radius * 1.15, 12, 10);
  disposables.push(fistGeo);
  const armPivotX = T.shoulderRadius * T.chestWiden * P.arm.spread;
  function makeArm(side: -1 | 1): THREE.Group {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * armPivotX, T.shoulderY, P.arm.shoulderZ);
    const arm = new THREE.Mesh(armGeo, skin);
    // hang below the pivot so the shoulder group is the true pivot point
    arm.position.y = -(P.arm.length / 2 + P.arm.radius);
    shoulder.add(arm);
    // fist sits ON the arm's lower end cap (at -(length/2+radius) in arm-local)
    const fist = new THREE.Mesh(fistGeo, skin);
    fist.position.y = -(P.arm.length / 2 + P.arm.radius);
    arm.add(fist);
    torso.add(shoulder);
    return shoulder;
  }
  const shoulderL = makeArm(-1);
  const shoulderR = makeArm(1);

  // ── legs ────────────────────────────────────────────────────────────────
  const legGeo = new THREE.CapsuleGeometry(P.leg.radius, P.leg.length, 6, 16);
  disposables.push(legGeo);
  const bootGeo = new THREE.SphereGeometry(P.leg.footRadius, 14, 10);
  disposables.push(bootGeo);
  const hipYWorld = P.torso.y - P.leg.hipDrop;
  function makeLeg(side: -1 | 1): THREE.Group {
    const hip = new THREE.Group();
    hip.position.set(side * P.leg.hipX, hipYWorld, 0);
    const leg = new THREE.Mesh(legGeo, skin);
    leg.position.y = -(P.leg.length / 2 + P.leg.radius);
    hip.add(leg);
    // chunky rounded foot on the lower cap — wrapped in the same bandages
    const boot = new THREE.Mesh(bootGeo, skin);
    boot.scale.set(1.05, 0.82, 1.25);
    boot.position.set(0, -(P.leg.length / 2 + P.leg.radius), P.leg.footRadius * 0.35);
    leg.add(boot);
    body.add(hip);
    return hip;
  }
  const hipL = makeLeg(-1);
  const hipR = makeLeg(1);

  return {
    root,
    bob,
    body,
    torso,
    head,
    shoulderL,
    shoulderR,
    hipL,
    hipR,
    variant,
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
