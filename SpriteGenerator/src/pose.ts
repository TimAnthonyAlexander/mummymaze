import { mummyParams } from './mummyParams';
import type { MummyRig } from './buildMummy';
import type { ClipName } from './clips';

/**
 * One pure function that fully sets the rig's joint rotations from (clip, t).
 * "Pure" here = the output depends only on (rig-identity, clip, t); it holds no
 * internal state and always writes every joint it touches from scratch, so
 * scrubbing to any t is order-independent and repeatable (bakes are stable).
 *
 * t ∈ [0,1). Clips are periodic in t (period 1), so frame 0 and the wrap point
 * are identical → the walk loops without a pop.
 *
 * The mummy's signature reach: both arms thrust FORWARD (down the body's +Z),
 * held across every clip; clips only add small sway on top.
 */
const TAU = Math.PI * 2;

// base arm reach: rotation.x that swings a hanging arm forward toward +Z.
// forward = 1 → straight ahead (−90°); < 1 → angled down-forward.
function armBaseX(): number {
  return -mummyParams.arm.forward * (Math.PI / 2);
}

export function applyPose(rig: MummyRig, clip: ClipName, t: number): void {
  const phase = TAU * t;
  const armBase = armBaseX();
  const splay = mummyParams.arm.splay; // base outward angle, L = −z, R = +z

  // reset the joints this function drives (keep it self-contained / pure)
  rig.bob.position.y = 0;
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.shoulderL.rotation.set(armBase, 0, 0);
  rig.shoulderR.rotation.set(armBase, 0, 0);
  rig.hipL.rotation.set(0, 0, 0);
  rig.hipR.rotation.set(0, 0, 0);

  if (clip === 'idle') {
    // gentle breathing bob + a tiny arm sway; feet planted.
    const bob = Math.sin(phase) * 0.03;
    rig.bob.position.y = bob;
    rig.torso.rotation.x = Math.sin(phase) * 0.015;
    const sway = Math.sin(phase) * 0.05;
    rig.shoulderL.rotation.x = armBase - sway;
    rig.shoulderR.rotation.x = armBase + sway;
    // splayed outward toward the hands, with a faint in/out drift
    rig.shoulderL.rotation.z = -splay + Math.sin(phase) * 0.02;
    rig.shoulderR.rotation.z = splay - Math.sin(phase) * 0.02;
    // head barely settles
    rig.head.rotation.z = Math.sin(phase) * 0.02;
    return;
  }

  // clip === 'walk'
  // Legs swing from the hips in opposite phase (rotation.x). Torso does a
  // double-bounce bob, rolls slightly side to side, and the forward-held arms
  // counter-swing subtly against the legs.
  const swing = 0.55;
  rig.hipL.rotation.x = Math.sin(phase) * swing;
  rig.hipR.rotation.x = Math.sin(phase + Math.PI) * swing;

  // double-bounce: body dips as each leg passes under (twice per cycle)
  rig.bob.position.y = -0.05 + Math.abs(Math.cos(phase)) * 0.05;

  // subtle body roll + forward lean
  rig.torso.rotation.z = Math.sin(phase) * 0.035;
  rig.torso.rotation.x = 0.04;

  // arms held forward, small counter-sway (opposite the same-side leg)
  const armSway = 0.12;
  rig.shoulderL.rotation.x = armBase + Math.sin(phase + Math.PI) * armSway;
  rig.shoulderR.rotation.x = armBase + Math.sin(phase) * armSway;
  rig.shoulderL.rotation.z = -splay;
  rig.shoulderR.rotation.z = splay;
}
