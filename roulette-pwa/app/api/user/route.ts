import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const STARTING_BALANCE = 10000; // free play-money tokens, simulation only

export async function POST(req: NextRequest) {
  try {
    const { userId, displayName, isGuest } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const ref = doc(db, "simUsers", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: displayName ?? "Guest",
        isGuest: !!isGuest,
        tokenBalance: STARTING_BALANCE,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      });
      return NextResponse.json({ tokenBalance: STARTING_BALANCE, isNew: true });
    }

    const data = snap.data();
    return NextResponse.json({ tokenBalance: data.tokenBalance, isNew: false });
  } catch (err: any) {
    console.error("user bootstrap failed", err);
    return NextResponse.json({ error: "Could not load user" }, { status: 500 });
  }
}
