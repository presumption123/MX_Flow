// Types for the plain-CJS argv module (consumed by tests/argv.test.ts; main.cjs requires the .cjs
// directly and never reads this file).
export function extractBreakflowUrl(args: unknown): string | null;
export function extractDocPath(args: unknown, exts: string | string[]): string | null;
