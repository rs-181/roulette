"use client";

import { pocketColor } from "@/lib/roulette";
import type { BetType } from "@/lib/roulette";

export default function NumberGrid({
  selected,
  onToggle,
}: {
  selected: BetType[];
  onToggle: (bet: BetType) => void;
}) {
  const isSelected = (bet: BetType) =>
    selected.some((b) => JSON.stringify(b) === JSON.stringify(bet));

  const numbers = Array.from({ length: 37 }, (_, i) => i); // 0-36

  return (
    <div>
      <div className="number-grid">
        <div
          className={`num-cell green ${isSelected({ kind: "straight", number: 0 }) ? "selected" : ""}`}
          onClick={() => onToggle({ kind: "straight", number: 0 })}
        >
          0
        </div>
        {numbers.slice(1).map((n) => {
          const bet: BetType = { kind: "straight", number: n };
          return (
            <div
              key={n}
              className={`num-cell ${pocketColor(n)} ${isSelected(bet) ? "selected" : ""}`}
              onClick={() => onToggle(bet)}
            >
              {n}
            </div>
          );
        })}
      </div>

      <div className="outside-bets">
        {[
          { label: "Red", bet: { kind: "red" } as BetType },
          { label: "Black", bet: { kind: "black" } as BetType },
          { label: "Even", bet: { kind: "even" } as BetType },
          { label: "Odd", bet: { kind: "odd" } as BetType },
          { label: "1-18", bet: { kind: "low" } as BetType },
          { label: "19-36", bet: { kind: "high" } as BetType },
          { label: "1st 12", bet: { kind: "dozen", dozen: 1 } as BetType },
          { label: "2nd 12", bet: { kind: "dozen", dozen: 2 } as BetType },
          { label: "3rd 12", bet: { kind: "dozen", dozen: 3 } as BetType },
        ].map(({ label, bet }) => (
          <div
            key={label}
            className={`outside-bet ${isSelected(bet) ? "selected" : ""}`}
            onClick={() => onToggle(bet)}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
