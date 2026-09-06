/* ==========================================================================
   Coin Toss — depends on common.js (window.Rinix) for balance/toast/ads
   ========================================================================== */
(function () {
  "use strict";

  const HISTORY_KEY = "rinix_cointoss_history";

  let balance = Rinix.getBalance();
  let selectedChip = Rinix.CONFIG.QUICK_CHIPS[0];
  let selectedSide = null; // "heads" | "tails"
  let flipping = false;
  let coinRotation = 0;

  const coin = document.getElementById("coin");
  const headsBtn = document.getElementById("headsBtn");
  const tailsBtn = document.getElementById("tailsBtn");
  const chipGrid = document.getElementById("chipGrid");
  const flipBtn = document.getElementById("flipBtn");
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

  function selectSide(side) {
    if (flipping) return;
    selectedSide = side;
    headsBtn.classList.toggle("selected", side === "heads");
    tailsBtn.classList.toggle("selected", side === "tails");
    syncUI();
  }
  headsBtn.addEventListener("click", () => selectSide("heads"));
  tailsBtn.addEventListener("click", () => selectSide("tails"));

  function syncUI() {
    if (!selectedSide) {
      betStatusEl.textContent = "Pick a side, then choose your chip";
    } else {
      betStatusEl.textContent = `Calling ${selectedSide === "heads" ? "Heads" : "Tails"} for ${Rinix.formatNum(selectedChip)} tokens`;
    }
    flipBtn.disabled = flipping || !selectedSide || balance < selectedChip;
  }

  function flipCoinTo(result) {
    const targetDeg = result === "tails" ? 180 : 0;
    const current = ((coinRotation % 360) + 360) % 360;
    let delta = targetDeg - current;
    if (delta <= 0) delta += 360;
    coinRotation += 5 * 360 + delta;
    coin.style.transform = `rotateY(${coinRotation}deg)`;
  }

  function renderHistory() {
    const records = Rinix.historyLoad(HISTORY_KEY);
    if (records.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No flips yet.</p>';
      return;
    }
    historyList.innerHTML = records.map((r) => {
      const badgeClass = r.outcome === "win" ? "win" : "loss";
      const statusText = r.outcome === "win" ? `WIN +${Rinix.formatNum(r.net)}` : `LOSS -${Rinix.formatNum(r.bet)}`;
      return `<div class="history-card">
        <div class="history-card-head"><span>${r.timestamp}</span><span class="badge ${badgeClass}">${statusText}</span></div>
        <div>Called <strong>${r.side}</strong> · Landed <strong>${r.result}</strong> · Bet ${Rinix.formatNum(r.bet)}</div>
      </div>`;
    }).join("");
  }
  if (historyBtn) historyBtn.addEventListener("click", renderHistory);

  flipBtn.addEventListener("click", () => {
    if (!selectedSide) { Rinix.showToast("Pick Heads or Tails first."); return; }
    if (balance < selectedChip) { Rinix.showToast("Not enough tokens for that chip."); return; }

    const bet = selectedChip;
    balance = Rinix.addBalance(-bet);
    flipping = true;
    syncUI();
    outcomeBox.style.display = "none";

    const result = Rinix.cryptoRandomInt(2) === 0 ? "heads" : "tails";
    flipCoinTo(result);

    setTimeout(() => {
      let outcome, net;
      if (result === selectedSide) {
        const winnings = bet * 2;
        balance = Rinix.addBalance(winnings);
        outcome = "win";
        net = winnings;
        outcomeBox.innerHTML = `🎉 It's ${result === "heads" ? "Heads" : "Tails"}! You called it — +${Rinix.formatNum(winnings)} tokens`;
      } else {
        outcome = "loss";
        net = -bet;
        outcomeBox.innerHTML = `It landed on ${result === "heads" ? "Heads" : "Tails"} — better luck next flip.`;
      }
      outcomeBox.style.display = "block";

      Rinix.historySave(HISTORY_KEY, {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        side: selectedSide, result, bet, outcome, net,
      });

      flipping = false;
      syncUI();
    }, 1950);
  });

  renderChips();
  syncUI();
})();
