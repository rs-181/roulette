/* ==========================================================================
   High-Low — depends on common.js (window.Rinix) for balance/toast/ads
   ========================================================================== */
(function () {
  "use strict";

  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RED_SUITS = new Set(["♥", "♦"]);
  const HISTORY_KEY = "rinix_highlow_history";

  let balance = Rinix.getBalance();
  let selectedChip = Rinix.CONFIG.QUICK_CHIPS[0];
  let guessing = false;
  let currentCard = drawCard();

  const chipGrid = document.getElementById("chipGrid");
  const lowBtn = document.getElementById("lowBtn");
  const highBtn = document.getElementById("highBtn");
  const betStatusEl = document.getElementById("betStatus");
  const outcomeBox = document.getElementById("outcomeBox");
  const currentCardEl = document.getElementById("currentCardEl");
  const nextCardEl = document.getElementById("nextCardEl");
  const historyList = document.getElementById("historyList");
  const historyBtn = document.getElementById("historyBtn");

  window.addEventListener("rinix:balance", (e) => { balance = e.detail.balance; syncUI(); });

  function drawCard() {
    const rankIndex = Rinix.cryptoRandomInt(RANKS.length);
    const suitIndex = Rinix.cryptoRandomInt(SUITS.length);
    return { rank: RANKS[rankIndex], suit: SUITS[suitIndex], value: rankIndex + 1 };
  }

  function paintCard(el, card) {
    el.querySelector(".hilo-rank").textContent = card.rank;
    el.querySelector(".hilo-suit").textContent = card.suit;
    el.classList.toggle("red", RED_SUITS.has(card.suit));
  }

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
      : `Betting ${Rinix.formatNum(selectedChip)} tokens — call it`;
    lowBtn.disabled = guessing || balance < selectedChip;
    highBtn.disabled = guessing || balance < selectedChip;
  }

  paintCard(currentCardEl, currentCard);

  function renderHistory() {
    const records = Rinix.historyLoad(HISTORY_KEY);
    if (records.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No guesses yet.</p>';
      return;
    }
    historyList.innerHTML = records.map((r) => {
      const badgeClass = r.outcome === "win" ? "win" : r.outcome === "push" ? "even" : "loss";
      const statusText = r.outcome === "win" ? `WIN +${Rinix.formatNum(r.net)}` : r.outcome === "push" ? "PUSH" : `LOSS -${Rinix.formatNum(r.bet)}`;
      return `<div class="history-card">
        <div class="history-card-head"><span>${r.timestamp}</span><span class="badge ${badgeClass}">${statusText}</span></div>
        <div>${r.from} → ${r.to} · Guessed <strong>${r.guess}</strong> · Bet ${Rinix.formatNum(r.bet)}</div>
      </div>`;
    }).join("");
  }
  if (historyBtn) historyBtn.addEventListener("click", renderHistory);

  function makeGuess(guess) {
    if (balance < selectedChip) { Rinix.showToast("Not enough tokens for that chip."); return; }
    if (guessing) return;

    const bet = selectedChip;
    balance = Rinix.addBalance(-bet);
    guessing = true;
    syncUI();
    outcomeBox.style.display = "none";

    const nextCard = drawCard();
    nextCardEl.classList.remove("hidden");
    paintCard(nextCardEl, nextCard);
    nextCardEl.classList.add("flip-in");
    setTimeout(() => nextCardEl.classList.remove("flip-in"), 400);

    setTimeout(() => {
      let outcome, net;
      if (nextCard.value === currentCard.value) {
        balance = Rinix.addBalance(bet); // push — refund the stake
        outcome = "push";
        net = 0;
        outcomeBox.innerHTML = `Push — both cards were ${nextCard.rank}s. Your ${Rinix.formatNum(bet)} tokens are back.`;
        nextCardEl.classList.add("flash-lose");
      } else {
        const wasHigher = nextCard.value > currentCard.value;
        const correct = (guess === "higher" && wasHigher) || (guess === "lower" && !wasHigher);
        if (correct) {
          const winnings = bet * 2;
          balance = Rinix.addBalance(winnings);
          outcome = "win";
          net = winnings;
          outcomeBox.innerHTML = `🎉 ${nextCard.rank}${nextCard.suit} is ${wasHigher ? "higher" : "lower"} — you called it! +${Rinix.formatNum(winnings)} tokens`;
          nextCardEl.classList.add("flash-win");
        } else {
          outcome = "loss";
          net = -bet;
          outcomeBox.innerHTML = `${nextCard.rank}${nextCard.suit} is ${wasHigher ? "higher" : "lower"} — not this time.`;
          nextCardEl.classList.add("flash-lose");
        }
      }
      outcomeBox.style.display = "block";

      Rinix.historySave(HISTORY_KEY, {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        from: currentCard.rank + currentCard.suit, to: nextCard.rank + nextCard.suit,
        guess, bet, outcome, net,
      });

      setTimeout(() => {
        nextCardEl.classList.remove("flash-win", "flash-lose");
        currentCard = nextCard;
        paintCard(currentCardEl, currentCard);
        nextCardEl.classList.add("hidden");
        guessing = false;
        syncUI();
      }, 900);
    }, 450);
  }

  lowBtn.addEventListener("click", () => makeGuess("lower"));
  highBtn.addEventListener("click", () => makeGuess("higher"));

  renderChips();
  syncUI();
})();
