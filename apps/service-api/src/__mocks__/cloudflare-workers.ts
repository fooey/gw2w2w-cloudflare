// Minimal stub so `DurableObject` resolves in plain Node/Vitest.
// Only MatchupPoller.ts imports this at module-evaluation time;
// none of the smoke-tested routes call into the DO at runtime.
export class DurableObject {}
export class WorkerEntrypoint {}
