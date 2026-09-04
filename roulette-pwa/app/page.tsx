"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TERMS_VERSION = "sim-1.0";

function makeGuestName() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Guest_${n}`;
}

export default function EntryGate() {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleEnter() {
    if (!agreed) return;
    setLoading(true);
    try {
      // Server-side route reads x-forwarded-for; client can't spoof the
      // IP field usefully, so the actual capture happens in /api/consent.
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termsVersion: TERMS_VERSION }),
      });
      const { consentId } = await res.json();

      const guestName = makeGuestName();
      sessionStorage.setItem("sim_guest_name", guestName);
      sessionStorage.setItem("sim_consent_id", consentId ?? "");
      sessionStorage.setItem("sim_terms_accepted", "true");

      router.push("/game");
    } catch (e) {
      console.error("Consent logging failed", e);
      // Fail closed: do not grant access if the compliance log couldn't be written.
      alert("Couldn't verify entry right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="legal-gate">
      <h1 className="gold-text" style={{ fontSize: 28, marginBottom: 4 }}>
        Roulette PWA
      </h1>
      <p style={{ opacity: 0.75, fontSize: 13, marginBottom: 20 }}>
        Simulation mode — play-money tokens only. No real currency is used,
        wagered, or paid out anywhere in this app.
      </p>

      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          By entering you agree to the{" "}
          <a className="gold-text" href="/terms" target="_blank">Terms &amp; Conditions</a>{" "}
          and{" "}
          <a className="gold-text" href="/privacy" target="_blank">Privacy Policy</a>.
          Your IP address, device metadata, and the time of acceptance will be
          recorded as a compliance record.
        </p>
        <div className="checkbox-row">
          <input
            id="agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2 }}
          />
          <label htmlFor="agree" style={{ fontSize: 13 }}>
            I have read and agree to the Terms &amp; Conditions and Privacy Policy.
          </label>
        </div>
        <button className="enter-btn" style={{ width: "100%" }} disabled={!agreed || loading} onClick={handleEnter}>
          {loading ? "Verifying..." : "Enter as Guest"}
        </button>
      </div>
    </main>
  );
}
