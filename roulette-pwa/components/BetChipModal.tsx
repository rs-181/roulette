"use client";

import { QUICK_CHIPS } from "@/lib/roulette";

export default function BetChipModal({
  open,
  currentChip,
  onSelect,
  onClose,
}: {
  open: boolean;
  currentChip: number;
  onSelect: (amount: number) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>
        <h3 className="gold-text" style={{ margin: 0 }}>Select Chip Value</h3>
        <p style={{ fontSize: 12, opacity: 0.7 }}>Min bet 10 &middot; Max bet 10,000 (capped by your balance)</p>
        <div className="chip-grid">
          {QUICK_CHIPS.map((c) => (
            <button
              key={c}
              className={`chip-option ${currentChip === c ? "active" : ""}`}
              onClick={() => {
                onSelect(c);
                onClose();
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
