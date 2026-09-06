/* ==========================================================================
   Slot Fruit Spin — depends on common.js (window.Rinix) for balance/toast/ads
   ========================================================================== */
(function () {
  "use strict";

  // Weighted symbol pool: common low-value fruit appear often, the top
  // symbols are rare — same "rarer pays more" principle as Roulette and
  // Lucky Dice's payout tables.
  const POOL = [
    ..."🍒".repeat(10).match(/./gu),
    ..."🍋".repeat(8).match(/./gu),
    ..."🍊".repeat(6).match(/./gu),
    ..."🍇".repeat(5).match(/./gu),
    ..."🔔".repeat(3).match(/./gu),
    ..."⭐".repeat(2).match(/./gu),
    "7️⃣",
  ];
  const PAYOUTS = { "🍒": 3, "🍋": 5, "🍊": 8, "🍇": 12, "🔔": 20, "⭐": 40, "7️⃣": 100 };
  const HISTORY_KEY = "rinix_slots_history";

  let balance = Rinix.getBalance();
  let selectedChip = Rinix.CONFIG.QUICK_CHIPS[0];
  let spinning = false;

  const reels = [document.getElementById("reel1"), document.getElementById("reel2"), document.getElementById("reel3")];
  const chipGrid = document.getElementById("chipGrid");
  const spinBtn = document.getElementById("spinBtn");
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

  function syncUI() {
    betStatusEl.textContent = balance < selectedChip
      ? "Not enough tokens for that chip"
      : `Spinning for ${Rinix.formatNum(selectedChip)} tokens per spin`;
    spinBtn.disabled = spinning || balance < selectedChip;
  }

  function pickSymbol() {
    return POOL[Rinix.cryptoRandomInt(POOL.length)];
  }

  function renderHistory() {
    const records = Rinix.historyLoad(HISTORY_KEY);
    if (records.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No spins yet.</p>';
      return;
    }
    historyList.innerHTML = records.map((r) => {
      const badgeClass = r.outcome === "win" ? "win" : "loss";
      const statusText = r.outcome === "win" ? `WIN +${Rinix.formatNum(r.net)}` : `LOSS -${Rinix.formatNum(r.bet)}`;
      return `<div class="history-card">
        <div class="history-card-head"><span>${r.timestamp}</span><span class="badge ${badgeClass}">${statusText}</span></div>
        <div>${r.symbols.join(" ")} · Bet ${Rinix.formatNum(r.bet)}</div>
      </div>`;
    }).join("");
  }
  if (historyBtn) historyBtn.addEventListener("click", renderHistory);

  spinBtn.addEventListener("click", () => {
    if (balance < selectedChip) { Rinix.showToast("Not enough tokens for that chip."); return; }

    const bet = selectedChip;
    balance = Rinix.addBalance(-bet);
    spinning = true;
    syncUI();
    outcomeBox.style.display = "none";
    reels.forEach((r) => r.classList.remove("win"));

    const results = [pickSymbol(), pickSymbol(), pickSymbol()];
    const stopDelays = [650, 950, 1300];
    let settled = 0;

    reels.forEach((reelEl, i) => {
      reelEl.classList.add("spinning");
      const flicker = setInterval(() => {
        reelEl.textContent = POOL[Math.floor(Math.random() * POOL.length)];
      }, 60);

      setTimeout(() => {
        clearInterval(flicker);
        reelEl.classList.remove("spinning");
        reelEl.textContent = results[i];
        reelEl.classList.add("landed");
        setTimeout(() => reelEl.classList.remove("landed"), 320);

        settled += 1;
        if (settled === reels.length) settleSpin(results, bet);
      }, stopDelays[i]);
    });
  });

  function settleSpin(results, bet) {
    const allMatch = results[0] === results[1] && results[1] === results[2];
    const mult = allMatch ? (PAYOUTS[results[0]] || 0) : 0;

    let outcome, net;
    if (mult > 0) {
      const winnings = bet * mult;
      balance = Rinix.addBalance(winnings);
      outcome = "win";
      net = winnings;
      outcomeBox.innerHTML = `🎉 ${results.join(" ")} — 3 of a kind! +${Rinix.formatNum(winnings)} tokens (${mult}x)`;
      reels.forEach((r) => r.classList.add("win"));
    } else {
      outcome = "loss";
      net = -bet;
      outcomeBox.innerHTML = `${results.join(" ")} — no match. Spin again!`;
    }
    outcomeBox.style.display = "block";

    Rinix.historySave(HISTORY_KEY, {
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      symbols: results, bet, outcome, net,
    });

    spinning = false;
    syncUI();
  }

  renderChips();
  syncUI();
})();
