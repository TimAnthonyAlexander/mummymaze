/** Public engine surface. Import from here, not from internal modules. */
export * from './types';
export { neighbor, samePos, inBounds, canCross, gateIdAt, DELTA, OPPOSITE } from './board';
export { monsterStep, stepsPerTurn } from './monsters';
export { step, stepWithTrace, initGame, canPlayerMove } from './step';
export type {
  TraceEvent,
  TraceMove,
  TraceGate,
  TraceKill,
  TraceExit,
  StepResult,
} from './step';
export { loadLevel } from './level';
export type { LevelSpec, EdgeSpec, GateSpec, MonsterSpec } from './level';
export { solve, solveFrom, stateKey, DEFAULT_STATE_CAP } from './solver';
export type { SolveResult, SolveOptions } from './solver';
export { scoreDifficulty } from './difficulty';
export type { DifficultyResult, DifficultyBreakdown } from './difficulty';
export { generateLevel, generateLevelDetailed } from './generator';
export type { GenerateOptions, GeneratedLevel } from './generator';
