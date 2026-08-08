// Types for the plain-CJS Save-dialog path module (consumed by tests/dialog-paths.test.ts; main.cjs
// requires the .cjs directly and never reads this file).
export function deepestExistingDir(dir: unknown): string | null;
export function resolveSaveDefaultPath(suggested: string): string;
export function resolveSaveDefaultPath(suggested: unknown): unknown;
