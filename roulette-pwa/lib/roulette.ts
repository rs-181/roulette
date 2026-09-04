/**
 * European roulette payout table and bet resolution.
 * Standard wheel: single 0, pockets 1-36 alternating red/black.
 * House edge = 1/37 ≈ 2.70% on every bet type — this is the ONLY
 * edge in the system. No result is ever re-weighted after the spin.
 */

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function pocketColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export type BetType =
  | { kind: "straight"; number: number } // pays 35:1
  | { kind: "red" | "black" } // pays 1:1
  | { kind: "even" | "odd" } // pays 1:1
  | { kind: "low" | "high" } // 1-18 / 19-36, pays 1:1
  | { kind: "dozen"; dozen: 1 | 2 | 3 } // pays 2:1
  | { kind: "column"; column: 1 | 2 | 3 }; // pays 2:1

export interface PlacedBet {
  bet: BetType;
  amount: number; // tokens
}

const PAYOUTS: Record<string, number> = {
  straight: 35,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  low: 1,
  high: 1,
  dozen: 2,
  column: 2,
};

/** Returns payout multiplier (0 if the bet loses). */
export function resolveBet(bet: BetType, result: number): number {
  switch (bet.kind) {
    case "straight":
      return bet.number === result ? PAYOUTS.straight : 0;
    case "red":
      return pocketColor(result) === "red" ? PAYOUTS.red : 0;
    case "black":
      return pocketColor(result) === "black" ? PAYOUTS.black : 0;
    case "even":
      return result !== 0 && result % 2 === 0 ? PAYOUTS.even : 0;
    case "odd":
      return result !== 0 && result % 2 === 1 ? PAYOUTS.odd : 0;
    case "low":
      return result >= 1 && result <= 18 ? PAYOUTS.low : 0;
    case "high":
      return result >= 19 && result <= 36 ? PAYOUTS.high : 0;
    case "dozen": {
      if (result === 0) return 0;
      const d = Math.ceil(result / 12);
      return d === bet.dozen ? PAYOUTS.dozen : 0;
    }
    case "column": {
      if (result === 0) return 0;
      const col = ((result - 1) % 3) + 1;
      return col === bet.column ? PAYOUTS.column : 0;
    }
    default:
      return 0;
  }
}

/** Resolves a full slate of bets placed on one spin. Returns total payout (winnings incl. stake back). */
export function settleSpin(bets: PlacedBet[], result: number) {
  let totalStaked = 0;
  let totalReturned = 0;
  const details = bets.map((pb) => {
    const mult = resolveBet(pb.bet, result);
    totalStaked += pb.amount;
    const returned = mult > 0 ? pb.amount * (mult + 1) : 0;
    totalReturned += returned;
    return { ...pb, multiplier: mult, returned };
  });
  return { result, color: pocketColor(result), totalStaked, totalReturned, details };
}

export const MIN_BET = 10;
export const MAX_BET = 10000;
export const QUICK_CHIPS = [10, 20, 50, 100, 500, 1000];
