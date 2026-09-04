/**
 * Fair RNG module — European roulette (single zero).
 *
 * There is NO win-rate weighting, NO hidden bias, and NO server-side
 * "adjustment" of outcomes here. The house edge comes only from the
 * wheel's own math (the 0 pocket paying nobody's even-money/color bet),
 * exactly like a physical wheel. Every pocket 0-36 has an equal 1/37
 * probability on every spin, independent of bet size, streak, or
 * balance. This is intentional and should not be "improved" into a
 * weighted RNG — see README.md for why.
 */

// crypto.getRandomValues is used instead of Math.random() for a
// non-predictable, non-seedable source of randomness.
export function fairSpin(): number {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    // Node fallback (server-side spins, e.g. in an API route)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require("crypto");
    buf[0] = nodeCrypto.randomInt(0, 4294967295);
  }
  // Reject values that would bias the modulo (rejection sampling)
  const MAX_UINT32 = 4294967296;
  const limit = MAX_UINT32 - (MAX_UINT32 % 37);
  let value = buf[0];
  while (value >= limit) {
    crypto.getRandomValues(buf);
    value = buf[0];
  }
  return value % 37; // 0-36 inclusive, uniform
}

export interface SpinAuditEntry {
  pocket: number;
  timestamp: string;
  serverSeedHash?: string; // optional: for provably-fair extensions later
}

/** Wraps fairSpin() and returns an auditable record for logging. */
export function auditedSpin(): SpinAuditEntry {
  return {
    pocket: fairSpin(),
    timestamp: new Date().toISOString(),
  };
}
