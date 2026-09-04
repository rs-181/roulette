import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { targetUserId, newBalance, reason } = await req.json();
    if (!targetUserId || typeof newBalance !== "number" || newBalance < 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const ref = doc(db, "simUsers", targetUserId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const previousBalance = snap.data().tokenBalance;
    await updateDoc(ref, { tokenBalance: newBalance });

    await addDoc(collection(db, "balanceAdjustments"), {
      targetUserId,
      previousBalance,
      newBalance,
      reason: reason || "Admin adjustment (simulation)",
      adjustedBy: "admin-demo",
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, previousBalance, newBalance });
  } catch (err) {
    console.error("balance adjust failed", err);
    return NextResponse.json({ error: "Adjustment failed" }, { status: 500 });
  }
}
