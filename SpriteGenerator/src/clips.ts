/**
 * Animation clip registry. Frame counts and fps are the source of truth for both
 * the scrubber UI and the baked-sheet metadata. Poses come from pose.ts; these
 * are just the timing/looping facts.
 */
export type ClipName = 'idle' | 'walk' | 'headturn';

export interface ClipDef {
  name: ClipName;
  frames: number;
  fps: number;
  /** clips are sampled at t = frame / frames, so t ∈ [0,1) and frame 0 == wrap. */
  loops: true;
}

export const CLIPS: Record<ClipName, ClipDef> = {
  idle: { name: 'idle', frames: 1, fps: 1, loops: true },
  walk: { name: 'walk', frames: 8, fps: 10, loops: true },
  // the spawn head-twist: the BODY holds still while the head spins a full 360°.
  headturn: { name: 'headturn', frames: 16, fps: 22, loops: true },
};

export const CLIP_ORDER: ClipName[] = ['idle', 'walk', 'headturn'];
