// Type declaration for the pure cert-pin predicate (electron/certPin.cjs), so the TS test can import it.
export function certMatchesPin(
  url: string,
  certificate: { fingerprint?: unknown } | null | undefined,
  serverHost: string,
  pinnedFingerprint: string,
): boolean;
