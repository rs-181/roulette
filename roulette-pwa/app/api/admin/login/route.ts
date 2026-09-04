import { NextRequest, NextResponse } from "next/server";

/**
 * DEMO-ONLY passcode gate. This is intentionally NOT a production
 * auth system — no hashing, no rate limiting, no session rotation.
 * Before deploying anywhere real, replace this with Firebase Auth +
 * a custom "admin" claim checked via Firebase Admin SDK on the
 * server. See README.md "Before you deploy this for real".
 */
export async function POST(req: NextRequest) {
  const { passcode } = await req.json();
  const expected = process.env.ADMIN_DEMO_PASSCODE;

  if (!expected || expected === "change-me-before-deploy") {
    return NextResponse.json(
      { error: "Set ADMIN_DEMO_PASSCODE in your environment before using the admin panel." },
      { status: 500 }
    );
  }
  if (passcode !== expected) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sim_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
    path: "/",
  });
  return res;
}
