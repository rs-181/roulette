"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/admin-rx");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="legal-gate">
      <h1 className="gold-text">Admin Access</h1>
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Demo passcode gate — see README before using this in anything beyond local testing.
      </p>
      <div className="card">
        <input
          type="password"
          placeholder="Passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid rgba(212,175,55,0.4)", background: "rgba(0,0,0,0.3)", color: "#f3e9d2", marginBottom: 12 }}
        />
        {error && <p style={{ color: "#ff8a8a", fontSize: 12 }}>{error}</p>}
        <button className="enter-btn" style={{ width: "100%" }} disabled={loading} onClick={handleLogin}>
          {loading ? "Checking..." : "Enter Admin Panel"}
        </button>
      </div>
    </main>
  );
}
