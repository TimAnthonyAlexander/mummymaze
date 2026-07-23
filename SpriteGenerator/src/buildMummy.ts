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

/**
 * A properly-modelled limb: a revolved solid that TAPERS from rTop (near end)
 * to rBottom (far end) with rounded hemispherical caps — a real upper-arm/thigh
 * shape, not a uniform tube. Centred on the origin, long axis on Y; the near end
 * (rTop) is up (+Y), so it hangs from a joint pivot at y = +(length/2 + rTop).
 */
function taperedLimbGeo(rTop: number, rBottom: number, length: number): THREE.LatheGeometry {
  const half = length / 2;
  const cap = 6;
  // Ordered BOTTOM → TOP so the lathe winds outward-facing normals (same sense
  // as the torso profile). Top→bottom flips them inward and you see the inside.
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2); // bottom hemisphere: pole → equator
    pts.push(new THREE.Vector2(Math.sin(a) * rBottom, -half - Math.cos(a) * rBottom));
  }
  pts.push(new THREE.Vector2(rTop, half)); // taper up the side
  for (let i = 1; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2); // top hemisphere: equator → pole
    pts.push(new THREE.Vector2(Math.cos(a) * rTop, half + Math.sin(a) * rTop));
  }
  return new THREE.LatheGeometry(pts, 22);
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
  const k = T.heightScale; // vertical stretch of the torso
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
  for (const v of profile) v.y *= k; // stretch height without changing girth
  const torsoGeo = new THREE.LatheGeometry(profile, 28);
  disposables.push(torsoGeo);
  const torsoMesh = new THREE.Mesh(torsoGeo, skin);
  torsoMesh.scale.set(T.chestWiden, 1, T.depthScale);
  torso.add(torsoMesh);

  // ── head (isolated pivot, like the game's `.sprite-head`) ───────────────
  const head = new THREE.Group();
  head.position.y = T.topY * k + P.head.lift;
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
  const armWrist = P.arm.radius * P.arm.wristScale;
  const armGeo = taperedLimbGeo(P.arm.radius, armWrist, P.arm.length);
  disposables.push(armGeo);
  const fistGeo = new THREE.SphereGeometry(armWrist * 1.15, 14, 12);
  disposables.push(fistGeo);
  const armPivotX = T.shoulderRadius * T.chestWiden * P.arm.spread;
  const armEnd = P.arm.length / 2 + armWrist; // distance from arm centre to wrist
  function makeArm(side: -1 | 1): THREE.Group {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * armPivotX, T.shoulderY * k, P.arm.shoulderZ);
    const arm = new THREE.Mesh(armGeo, skin);
    // hang below the pivot so the shoulder group is the true pivot point
    arm.position.y = -(P.arm.length / 2 + P.arm.radius);
    shoulder.add(arm);
    // fist sits ON the wrist (the arm's tapered lower end)
    const fist = new THREE.Mesh(fistGeo, skin);
    fist.position.y = -armEnd;
    arm.add(fist);
    torso.add(shoulder);
    return shoulder;
  }
  const shoulderL = makeArm(-1);
  const shoulderR = makeArm(1);

  // ── legs (tapered thigh→ankle) + a flat forward-pointing foot ────────────
  const ankle = P.leg.radius * P.leg.ankleScale;
  const legGeo = taperedLimbGeo(P.leg.radius, ankle, P.leg.length);
  disposables.push(legGeo);
  const legEnd = P.leg.length / 2 + ankle; // arm-local y of the ankle

  // Foot: a flattened capsule that runs FORWARD along Z (heel→toe), not a ball.
  // Built along Y then rotated onto Z; its X width is kept ≈ the ankle so it
  // never splays outward. z-flatten gives it a low, flat profile.
  const F = P.leg.foot;
  const footR = F.width; // cross-section radius (X, and pre-flatten Y)
  const footStraight = Math.max(0.02, F.length - 2 * footR);
  const footGeo = new THREE.CapsuleGeometry(footR, footStraight, 6, 16);
  disposables.push(footGeo);

  const hipYWorld = P.torso.y - P.leg.hipDrop * k;
  function makeLeg(side: -1 | 1): THREE.Group {
    const hip = new THREE.Group();
    hip.position.set(side * P.leg.hipX, hipYWorld, 0);
    const leg = new THREE.Mesh(legGeo, skin);
    leg.position.y = -(P.leg.length / 2 + P.leg.radius);
    hip.add(leg);

    const foot = new THREE.Mesh(footGeo, skin);
    foot.rotation.x = Math.PI / 2; // long axis Y → Z (points forward)
    foot.scale.set(1, 1, F.height / footR); // flatten the vertical (now object-Z)
    foot.position.set(0, -legEnd + F.height * 0.4, F.forward);
    leg.add(foot);

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
