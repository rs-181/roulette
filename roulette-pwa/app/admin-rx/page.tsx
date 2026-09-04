"use client";

import { useEffect, useState } from "react";
import type { SimUser } from "@/lib/types";

interface Stats {
  activeUsers: number;
  googleUsers: number;
  totalSpins: number;
  totalWagered: number;
  totalReturned: number;
  houseNet: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<SimUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        window.location.href = "/admin-rx/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setStats(data.stats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBalance(userId: string) {
    const newBalance = Number(editValue);
    if (Number.isNaN(newBalance) || newBalance < 0) return;
    await fetch("/api/admin/adjust-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, newBalance, reason: "Manual admin override (simulation)" }),
    });
    setEditingId(null);
    load();
  }

  return (
    <main className="app-shell" style={{ maxWidth: 720 }}>
      <h1 className="gold-text" style={{ fontSize: 22 }}>Admin Dashboard <span style={{ fontSize: 12, opacity: 0.6 }}>(simulation)</span></h1>

      {error && <div className="card" style={{ borderColor: "#b3122a", marginBottom: 12 }}>{error}</div>}
      {loading && <p>Loading...</p>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card"><div className="label">Active Users</div><div className="value">{stats.activeUsers}</div></div>
          <div className="stat-card"><div className="label">Google-linked Users</div><div className="value">{stats.googleUsers}</div></div>
          <div className="stat-card"><div className="label">Total Spins</div><div className="value">{stats.totalSpins}</div></div>
          <div className="stat-card"><div className="label">Total Wagered (tokens)</div><div className="value">{stats.totalWagered.toLocaleString()}</div></div>
          <div className="stat-card"><div className="label">Total Returned (tokens)</div><div className="value">{stats.totalReturned.toLocaleString()}</div></div>
          <div className="stat-card"><div className="label">House Net (sim tokens)</div><div className="value">{stats.houseNet.toLocaleString()}</div></div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="chip-btn" href="/api/admin/export?data=users&format=csv">Export Users CSV</a>
          <a className="chip-btn" href="/api/admin/export?data=users&format=json">Export Users JSON</a>
          <a className="chip-btn" href="/api/admin/export?data=spins&format=csv">Export Spins CSV</a>
          <a className="chip-btn" href="/api/admin/export?data=spins&format=json">Export Spins JSON</a>
        </div>
      </div>

      <div className="card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Last Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>{u.isGuest ? "Guest" : "Google"}</td>
                <td>
                  {editingId === u.id ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{ width: 80, background: "rgba(0,0,0,0.3)", color: "#f3e9d2", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 6, padding: 4 }}
                    />
                  ) : (
                    u.tokenBalance?.toLocaleString?.() ?? u.tokenBalance
                  )}
                </td>
                <td style={{ fontSize: 11 }}>
                  {u.lastActive?.seconds
                    ? new Date(u.lastActive.seconds * 1000).toLocaleString()
                    : "-"}
                </td>
                <td>
                  {editingId === u.id ? (
                    <button className="chip-btn" style={{ padding: "4px 10px" }} onClick={() => saveBalance(u.id)}>Save</button>
                  ) : (
                    <button
                      className="chip-btn"
                      style={{ padding: "4px 10px" }}
                      onClick={() => {
                        setEditingId(u.id);
                        setEditValue(String(u.tokenBalance));
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
