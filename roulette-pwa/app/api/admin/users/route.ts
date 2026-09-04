import { NextResponse } from "next/server";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const snap = await getDocs(query(collection(db, "simUsers"), orderBy("lastActive", "desc")));
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const spinSnap = await getDocs(collection(db, "spinLogs"));
    let totalWagered = 0;
    let totalReturned = 0;
    let googleUsers = 0;
    spinSnap.forEach((d) => {
      const s = d.data();
      totalWagered += s.totalStaked ?? 0;
      totalReturned += s.totalReturned ?? 0;
    });
    users.forEach((u: any) => { if (!u.isGuest) googleUsers += 1; });

    return NextResponse.json({
      users,
      stats: {
        activeUsers: users.length,
        googleUsers,
        totalSpins: spinSnap.size,
        totalWagered,
        totalReturned,
        houseNet: totalWagered - totalReturned, // simulated-token "revenue", not real money
      },
    });
  } catch (err) {
    console.error("admin users fetch failed", err);
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}
