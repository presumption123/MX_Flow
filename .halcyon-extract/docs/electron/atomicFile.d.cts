// Type declaration for electron/atomicFile.cjs so the TS test (tests/atomic-file.test.ts) can import it.
export function readJsonOrEmptySync(file: string): Record<string, unknown>;
export function writeJsonAtomicSync(file: string, obj: unknown, mode?: number): boolean;
