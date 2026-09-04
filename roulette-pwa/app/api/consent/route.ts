import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Writes an append-only legal compliance record: IP (from the
 * x-forwarded-for header, which the client cannot forge on Vercel's
 * edge network), user agent, and server timestamp. This record is
 * never updated or deleted by any other route in the app — Firestore
 * security rules (see /firestore.rules) enforce create-only access
 * on this collection.
 */
export async function POST(req: NextRequest) {
  try {
    const { termsVersion } = await req.json();

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const docRef = await addDoc(collection(db, "consentLogs"), {
      ipAddress: ip,
      userAgent,
      termsVersion,
      timestamp: serverTimestamp(),
    });

    const res = NextResponse.json({ consentId: docRef.id });
    // Signed-ish marker cookie the middleware checks before allowing
    // /game or gameplay API routes to render/respond. This is a UX
    // convenience gate, not the compliance record itself — the
    // Firestore write above is the actual legal proof.
    res.cookies.set("sim_terms_accepted", "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("consent log failed", err);
    return NextResponse.json({ error: "consent logging failed" }, { status: 500 });
  }
}
