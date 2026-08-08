// Types for the plain-CJS main-process module (consumed by tests/cloud-read.test.ts; main.cjs
// requires the .cjs directly and never reads this file).
export interface TolerantFs {
  readFile(p: string): Promise<Uint8Array>;
  stat(p: string): Promise<{ size: number }>;
}
export interface TolerantOpts {
  retryMs?: number;
  deadlineMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}
export function readFileTolerant(fsp: TolerantFs, filePath: string, opts?: TolerantOpts): Promise<Uint8Array>;
export const READ_EMPTY_RETRY_MS: number;
export const READ_EMPTY_DEADLINE_MS: number;
