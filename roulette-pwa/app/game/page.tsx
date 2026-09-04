"use client";

import { useEffect, useState } from "react";
import RouletteWheel from "@/components/RouletteWheel";
import NumberGrid from "@/components/NumberGrid";
import BetChipModal from "@/components/BetChipModal";
import { QUICK_CHIPS, type BetType, type PlacedBet } from "@/lib/roulette";

function getOrCreateGuestId() {
  let id = localStorage.getItem("sim_user_id");
  if (!id) {
    id = "guest_" + crypto.randomUUID();
    localStorage.setItem("sim_user_id", id);
  }
  return id;
}

export default function GamePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [balance, setBalance] = useState<number | null>(null);
  const [chip, setChip] = useState(QUICK_CHIPS[0]);
  const [selectedBets, setSelectedBets] = useState<BetType[]>([]);
  const [chipModalOpen, setChipModalOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getOrCreateGuestId();
    const name = sessionStorage.getItem("sim_guest_name") || "Guest";
    setUserId(id);
    setDisplayName(name);

    fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, displayName: name, isGuest: true }),
    })
      .then((r) => r.json())
      .then((data) => setBalance(data.tokenBalance))
      .catch(() => setError("Could not load your balance."));
  }, []);

  function toggleBet(bet: BetType) {
    setSelectedBets((prev) => {
      const key = JSON.stringify(bet);
      const exists = prev.find((b) => JSON.stringify(b) === key);
      if (exists) return prev.filter((b) => JSON.stringify(b) !== key);
      return [...prev, bet];
    });
  }

  const totalWager = selectedBets.length * chip;

  async function handleSpin() {
    if (!userId || selectedBets.length === 0 || spinning) return;
    if (balance !== null && totalWager > balance) {
      setError("Not enough tokens for this wager.");
      return;
    }
    setError(null);
    setLastOutcome(null);
    setSpinning(true);

    const bets: PlacedBet[] = selectedBets.map((b) => ({ bet: b, amount: chip }));

    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, bets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Spin failed");

      setResult(data.result);
      // Wheel animation completes -> onSpinEnd fires -> reveal outcome
      setTimeout(() => {
        setBalance(data.newBalance);
        const net = data.totalReturned - data.totalStaked;
        setLastOutcome(
          net > 0
            ? `Pocket ${data.result} (${data.color}) — you won ${net} tokens`
            : `Pocket ${data.result} (${data.color}) — you lost ${data.totalStaked} tokens`
        );
        setSelectedBets([]);
        setSpinning(false);
      }, 3300);
    } catch (e: any) {
      setError(e.message ?? "Spin failed");
      setSpinning(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="balance-pill">
        <span>{displayName}</span>
        <span className="gold-text">{balance ?? "..."} tokens</span>
      </div>

      <RouletteWheel spinning={spinning} result={result} />

      {lastOutcome && (
        <div className="card" style={{ textAlign: "center", marginBottom: 8, fontSize: 13 }}>
          {lastOutcome}
        </div>
      )}
      {error && (
        <div className="card" style={{ textAlign: "center", marginBottom: 8, fontSize: 13, borderColor: "#b3122a" }}>
          {error}
        </div>
      )}

      <NumberGrid selected={selectedBets} onToggle={toggleBet} />

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
        {selectedBets.length} bet(s) selected &middot; {chip} tokens each &middot; total wager {totalWager}
      </div>

      <div className="chip-bar">
        <button className="chip-btn" onClick={() => setChipModalOpen(true)}>
          {chip} chip
        </button>
        <button className="spin-btn" disabled={spinning || selectedBets.length === 0} onClick={handleSpin}>
          {spinning ? "Spinning..." : "Spin"}
        </button>
      </div>

      <BetChipModal
        open={chipModalOpen}
        currentChip={chip}
        onSelect={setChip}
        onClose={() => setChipModalOpen(false)}
      />
    </main>
  );
}
