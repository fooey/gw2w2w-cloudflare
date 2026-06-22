// Minimal stub so `DurableObject` resolves in plain Node/Vitest.
// Only MatchupPoller.ts imports this at module-evaluation time;
// none of the smoke-tested routes call into the DO at runtime.
export class DurableObject<Env = unknown> {
	protected ctx: DurableObjectState;
	protected env: Env;

	constructor(ctx: DurableObjectState, env: Env) {
		this.ctx = ctx;
		this.env = env;
	}
}
export class WorkerEntrypoint {}

interface DurableObjectStorage {
	getAlarm(): Promise<number | null | undefined>;
	setAlarm(value: number): Promise<void>;
}

interface DurableObjectState {
	storage: DurableObjectStorage;
	blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
	waitUntil(promise: Promise<unknown>): void;
}
