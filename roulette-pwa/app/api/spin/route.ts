import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auditedSpin } from "@/lib/rng";
import { settleSpin, MIN_BET, MAX_BET, type PlacedBet } from "@/lib/roulette";

/**
 * Resolves one spin server-side so the RNG and payout math can't be
 * influenced by client state. Fair, unweighted spin only — see
 * lib/rng.ts and lib/roulette.ts for why there is no win-rate cap
 * or adjustment logic here.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, bets } = (await req.json()) as { userId: string; bets: PlacedBet[] };

    if (!userId || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    for (const b of bets) {
      if (b.amount < MIN_BET || b.amount > MAX_BET) {
        return NextResponse.json({ error: `Bet must be between ${MIN_BET} and ${MAX_BET} tokens` }, { status: 400 });
      }
    }

    const totalStaked = bets.reduce((s, b) => s + b.amount, 0);
    const userRef = doc(db, "simUsers", userId);

    const outcome = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error("User not found");
      const user = snap.data();

      if (user.tokenBalance < totalStaked) {
        throw new Error("Insufficient balance");
      }

      const spin = auditedSpin(); // fair, uniform 0-36
      const settled = settleSpin(bets, spin.pocket);
      const newBalance = user.tokenBalance - totalStaked + settled.totalReturned;

      tx.update(userRef, { tokenBalance: newBalance, lastActive: serverTimestamp() });

      return { settled, newBalance };
    });

    await addDoc(collection(db, "spinLogs"), {
      userId,
      result: outcome.settled.result,
      color: outcome.settled.color,
      totalStaked: outcome.settled.totalStaked,
      totalReturned: outcome.settled.totalReturned,
      netChange: outcome.settled.totalReturned - outcome.settled.totalStaked,
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({
      result: outcome.settled.result,
      color: outcome.settled.color,
      details: outcome.settled.details,
      totalStaked: outcome.settled.totalStaked,
      totalReturned: outcome.settled.totalReturned,
      newBalance: outcome.newBalance,
    });
  } catch (err: any) {
    console.error("spin failed", err);
    return NextResponse.json({ error: err.message ?? "Spin failed" }, { status: 400 });
  }
}
