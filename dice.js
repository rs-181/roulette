/* ==========================================================================
   Lucky Dice Roll — depends on common.js (window.Rinix) for balance/toast/ads
   ========================================================================== */
(function () {
  "use strict";

  const DICE_GLYPHS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const HISTORY_KEY = "rinix_dice_history";

  // Two-dice odds out of 36, shaved for a modest house edge (same spirit
  // as Roulette's payout table — rarer outcomes pay more).
  const NUMBER_PAYOUT_ONE = 2;   // chosen number appears on exactly one die
  const NUMBER_PAYOUT_BOTH = 3;  // chosen number appears on both dice
  const TOTAL_PAYOUTS = { 2: 30, 3: 15, 4: 10, 5: 7, 6: 6, 7: 5, 8: 6, 9: 7, 10: 10, 11: 15, 12: 30 };
  const EVENODD_PAYOUT = 2;

  let balance = Rinix.getBalance();
  let selectedChip = Rinix.CONFIG.QUICK_CHIPS[0];
  let betType = "number";     // "number" | "total" | "evenodd"
  let betValue = null;        // 1-6, 2-12, or "even"/"odd"
  let rolling = false;

  const die1 = document.getElementById("die1");
  const die2 = document.getElementById("die2");
  const tabsEl = document.getElementById("betTypeTabs");
  const valueGridEl = document.getElementById("valueGrid");
  const chipGrid = document.getElementById("chipGrid");
  const rollBtn = document.getElementById("rollBtn");
  const betStatusEl = document.getElementById("betStatus");
  const outcomeBox = document.getElementById("outcomeBox");
  const historyList = document.getElementById("historyList");
  const historyBtn = document.getElementById("historyBtn");

  window.addEventListener("rinix:balance", (e) => { balance = e.detail.balance; syncUI(); });

  function renderChips() {
    Rinix.renderChipPicker(chipGrid, selectedChip, (val) => {
      selectedChip = val;
      renderChips();
      syncUI();
    });
  }

  function renderValueGrid() {
    valueGridEl.innerHTML = "";
    valueGridEl.classList.toggle("cols-2", betType === "evenodd");

    if (betType === "number") {
      for (let n = 1; n <= 6; n++) {
        valueGridEl.appendChild(makeValueChip(n, `${DICE_GLYPHS[n - 1]} ${n}`, `${NUMBER_PAYOUT_ONE}x/${NUMBER_PAYOUT_BOTH}x`));
      }
    } else if (betType === "total") {
      for (let n = 2; n <= 12; n++) {
        valueGridEl.appendChild(makeValueChip(n, String(n), `${TOTAL_PAYOUTS[n]}x`));
      }
    } else {
      valueGridEl.appendChild(makeValueChip("even", "Even", `${EVENODD_PAYOUT}x`));
      valueGridEl.appendChild(makeValueChip("odd", "Odd", `${EVENODD_PAYOUT}x`));
    }
  }

  function makeValueChip(value, label, odds) {
    const btn = document.createElement("button");
    btn.className = "value-chip" + (betValue === value ? " selected" : "");
    btn.innerHTML = `${label}<span class="odds">${odds}</span>`;
    btn.addEventListener("click", () => {
      if (rolling) return;
      betValue = value;
      renderValueGrid();
      syncUI();
    });
    return btn;
  }

  tabsEl.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (rolling) return;
      betType = tab.dataset.type;
      betValue = null;
      tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      renderValueGrid();
      syncUI();
    });
  });
  tabsEl.querySelector('[data-type="number"]').classList.add("active");

  function syncUI() {
    if (betValue === null) {
      betStatusEl.textContent = "Choose a value above to enable Roll";
    } else if (balance < selectedChip) {
      betStatusEl.textContent = "Not enough tokens for that chip";
    } else {
      betStatusEl.textContent = `Betting ${Rinix.formatNum(selectedChip)} tokens on ${describeBet()}`;
    }
    rollBtn.disabled = rolling || betValue === null || balance < selectedChip;
  }

  function describeBet() {
    if (betType === "number") return `number ${betValue}`;
    if (betType === "total") return `total ${betValue}`;
    return betValue === "even" ? "Even" : "Odd";
  }

  function renderHistory() {
    const records = Rinix.historyLoad(HISTORY_KEY);
    if (records.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No rolls yet.</p>';
      return;
    }
    historyList.innerHTML = records.map((r) => {
      const badgeClass = r.outcome === "win" ? "win" : "loss";
      const statusText = r.outcome === "win" ? `WIN +${Rinix.formatNum(r.net)}` : `LOSS -${Rinix.formatNum(r.bet)}`;
      return `<div class="history-card">
        <div class="history-card-head"><span>${r.timestamp}</span><span class="badge ${badgeClass}">${statusText}</span></div>
        <div>Rolled <strong>${r.die1}+${r.die2}=${r.total}</strong> · Bet on ${r.betDesc} · ${Rinix.formatNum(r.bet)} tokens</div>
      </div>`;
    }).join("");
  }
  if (historyBtn) historyBtn.addEventListener("click", renderHistory);

  rollBtn.addEventListener("click", () => {
    if (betValue === null) { Rinix.showToast("Pick a number, total, or Even/Odd first."); return; }
    if (balance < selectedChip) { Rinix.showToast("Not enough tokens for that chip."); return; }

    const bet = selectedChip;
    const type = betType, value = betValue, betDesc = describeBet();
    balance = Rinix.addBalance(-bet);
    rolling = true;
    syncUI();
    outcomeBox.style.display = "none";

    const finalD1 = Rinix.cryptoRandomInt(6) + 1;
    const finalD2 = Rinix.cryptoRandomInt(6) + 1;

    [die1, die2].forEach((el) => el.classList.add("rolling"));
    const flicker = setInterval(() => {
      die1.textContent = DICE_GLYPHS[Math.floor(Math.random() * 6)];
      die2.textContent = DICE_GLYPHS[Math.floor(Math.random() * 6)];
    }, 70);

    setTimeout(() => {
      clearInterval(flicker);
      die1.classList.remove("rolling");
      die2.classList.remove("rolling");
      die1.textContent = DICE_GLYPHS[finalD1 - 1];
      die2.textContent = DICE_GLYPHS[finalD2 - 1];
      die1.classList.add("landed");
      die2.classList.add("landed");
      setTimeout(() => { die1.classList.remove("landed"); die2.classList.remove("landed"); }, 300);

      const total = finalD1 + finalD2;
      let mult = 0;
      if (type === "number") {
        const matches = (finalD1 === value ? 1 : 0) + (finalD2 === value ? 1 : 0);
        mult = matches === 2 ? NUMBER_PAYOUT_BOTH : matches === 1 ? NUMBER_PAYOUT_ONE : 0;
      } else if (type === "total") {
        mult = total === value ? TOTAL_PAYOUTS[total] : 0;
      } else {
        const isEven = total % 2 === 0;
        mult = (value === "even" && isEven) || (value === "odd" && !isEven) ? EVENODD_PAYOUT : 0;
      }

      let outcome, net;
      if (mult > 0) {
        const winnings = bet * mult;
        balance = Rinix.addBalance(winnings);
        outcome = "win";
        net = winnings;
        outcomeBox.innerHTML = `🎉 Rolled ${finalD1}+${finalD2}=${total} — +${Rinix.formatNum(winnings)} tokens (${mult}x)`;
      } else {
        outcome = "loss";
        net = -bet;
        outcomeBox.innerHTML = `Rolled ${finalD1}+${finalD2}=${total} — no match this time.`;
      }
      outcomeBox.style.display = "block";

      Rinix.historySave(HISTORY_KEY, {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        die1: finalD1, die2: finalD2, total, betDesc, bet, outcome, net,
      });

      rolling = false;
      syncUI();
    }, 700);
  });

  renderChips();
  renderValueGrid();
  syncUI();
})();
