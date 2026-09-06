/* ==========================================================================
   Velo Cards — depends on common.js (window.Rinix) for balance/toast/ads
   ========================================================================== */
(function () {
  "use strict";

  const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const SUITS = ["♠", "♥", "♦", "♣"];
  const CHIP_VALUES = [10, 20, 50, 100, 500, 1000];
  const MAX_TOTAL_BET = 10000;
  const HISTORY_KEY = "rinix_velo_history";

  let balance = Rinix.getBalance();
  let bets = {};          // rank -> amount currently staked
  let selectedChip = CHIP_VALUES[0];
  let drawing = false;

  const cardGrid = document.getElementById("cardGrid");
  const chipGrid = document.getElementById("chipGrid");
  const drawBtn = document.getElementById("drawBtn");
  const clearBtn = document.getElementById("clearBtn");
  const betTotalEl = document.getElementById("betTotal");
  const revealStrip = document.getElementById("revealStrip");
  const inCardEl = document.getElementById("inCardEl");
  const outCardEl = document.getElementById("outCardEl");
  const historyList = document.getElementById("historyList");

  window.addEventListener("rinix:balance", (e) => { balance = e.detail.balance; renderDrawButton(); });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Draws two DISTINCT ranks (guaranteeing In and Out never contradict each
  // other) then attaches a random suit to each for display, drawn as if
  // from a standard 52-card deck.
  function drawTwoCards() {
    const [inRank, outRank] = shuffle([...RANKS]);
    return {
      inCard: { rank: inRank, suit: SUITS[Math.floor(Math.random() * SUITS.length)] },
      outCard: { rank: outRank, suit: SUITS[Math.floor(Math.random() * SUITS.length)] },
    };
  }

  function totalStaked() {
    return Object.values(bets).reduce((a, b) => a + b, 0);
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }
  function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50))); }
    catch (e) { console.warn("history not saved", e); }
  }

  function renderChips() {
    chipGrid.innerHTML = "";
    CHIP_VALUES.forEach((val) => {
      const el = document.createElement("button");
      el.className = "chip" + (val === selectedChip ? " selected" : "");
      el.dataset.val = val;
      el.textContent = val;
      el.addEventListener("click", () => { selectedChip = val; renderChips(); });
      chipGrid.appendChild(el);
    });
  }

  function renderGrid() {
    cardGrid.innerHTML = "";
    RANKS.forEach((rank) => {
      const slot = document.createElement("div");
      const amount = bets[rank];
      slot.className = "card-slot" + (amount ? " has-bet" : "");
      slot.dataset.rank = rank;
      slot.innerHTML =
        `<div class="rank">${rank}</div><div class="suit-row">♠ ♥ ♦ ♣</div>` +
        (amount ? `<div class="bet-chip-tag">${Rinix.formatNum(amount)}</div>` : "");
      slot.addEventListener("click", () => placeBet(rank));
      cardGrid.appendChild(slot);
    });
  }

  function renderDrawButton() {
    drawBtn.disabled = drawing || Object.keys(bets).length === 0;
    if (betTotalEl) betTotalEl.textContent = `Staked: ${Rinix.formatNum(totalStaked())} / ${Rinix.formatNum(MAX_TOTAL_BET)}`;
  }

  function placeBet(rank) {
    if (drawing) return;
    const current = bets[rank] || 0;

    if (balance < selectedChip) {
      Rinix.showToast("Not enough tokens for that chip.");
      return;
    }
    if (totalStaked() + selectedChip > MAX_TOTAL_BET) {
      Rinix.showToast(`Total bets are capped at ${Rinix.formatNum(MAX_TOTAL_BET)} tokens.`);
      return;
    }

    balance = Rinix.addBalance(-selectedChip);
    bets[rank] = current + selectedChip;
    renderGrid();
    renderDrawButton();
  }

  function clearBoard() {
    if (drawing) return;
    const staked = totalStaked();
    if (staked === 0) { Rinix.showToast("The board is already clear."); return; }
    balance = Rinix.addBalance(staked);
    bets = {};
    renderGrid();
    renderDrawButton();
    Rinix.showToast("Bets returned to your balance.");
  }
  if (clearBtn) clearBtn.addEventListener("click", clearBoard);

  function flashSlot(rank, cls) {
    const slot = cardGrid.querySelector(`[data-rank="${rank}"]`);
    if (!slot) return;
    slot.classList.add(cls);
    setTimeout(() => slot.classList.remove(cls), 900);
  }

  function draw() {
    if (drawing) return;
    if (Object.keys(bets).length === 0) { Rinix.showToast("Place a bet on a card before you draw."); return; }
    drawing = true;
    renderDrawButton();

    const { inCard, outCard } = drawTwoCards();
    inCardEl.textContent = inCard.rank + inCard.suit;
    outCardEl.textContent = outCard.rank + outCard.suit;
    revealStrip.classList.add("show");

    const roundResults = [];
    let netChange = 0;

    Object.keys(bets).forEach((rank) => {
      const amount = bets[rank];
      if (rank === inCard.rank) {
        roundResults.push({ rank, amount, outcome: "lose" });
        netChange -= amount; // already deducted at bet time — this is just for the history net figure
        delete bets[rank];
        flashSlot(rank, "flash-in");
      } else if (rank === outCard.rank) {
        const winnings = amount * 2;
        balance = Rinix.addBalance(winnings);
        roundResults.push({ rank, amount: winnings, outcome: "win" });
        netChange += winnings;
        delete bets[rank];
        flashSlot(rank, "flash-out");
      }
      // else: bet stays exactly as it is for the next round
    });

    const history = loadHistory();
    history.unshift({
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      inCard, outCard, results: roundResults, net: netChange,
    });
    saveHistory(history);

    renderGrid();
    renderHistory();

    setTimeout(() => {
      drawing = false;
      renderDrawButton();
    }, 700);
  }
  if (drawBtn) drawBtn.addEventListener("click", draw);

  function renderHistory() {
    const history = loadHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No draws yet. Your results will appear here.</p>';
      return;
    }
    historyList.innerHTML = history.map((entry) => {
      let outcomeHtml;
      if (entry.results.length === 0) {
        outcomeHtml = '<span style="color:var(--muted)">No bets resolved — board carried forward</span>';
      } else {
        outcomeHtml = entry.results.map((r) => {
          const badge = r.outcome === "win"
            ? `<span class="badge win">+${Rinix.formatNum(r.amount)}</span>`
            : `<span class="badge loss">-${Rinix.formatNum(r.amount)}</span>`;
          return badge + " " + r.rank;
        }).join(" &nbsp; ");
      }
      return `<div class="history-row">
        <div class="history-cards">
          <div class="mini-card in-c">${entry.inCard.rank}${entry.inCard.suit}</div>
          <div class="mini-card out-c">${entry.outCard.rank}${entry.outCard.suit}</div>
        </div>
        <div class="history-meta">
          <div class="history-time">${entry.time} · In / Out</div>
          <div class="history-outcome">${outcomeHtml}</div>
        </div>
      </div>`;
    }).join("");
  }

  const historyBtn = document.getElementById("historyBtn");
  if (historyBtn) historyBtn.addEventListener("click", renderHistory);

  renderChips();
  renderGrid();
  renderDrawButton();
  renderHistory();
})();

// --- Rinix agency sponsored slot fallback ---
document.addEventListener("DOMContentLoaded", () => {
  const adSlot = document.getElementById("adSlot");
  if (!adSlot) return;
  const adIns = adSlot.querySelector(".adsbygoogle");
  const isPlaceholder = !adIns || adIns.getAttribute("data-ad-client") === "ca-pub-3562749923218282";
  if (isPlaceholder) {
    adSlot.innerHTML = `<a href="https://rinix.online" target="_blank" rel="noopener noreferrer" class="rinix-ad">
      <span class="rinix-ad-mark">R</span>
      <span class="rinix-ad-copy">
        <span class="brand">RINIX</span>
        <span class="headline">Build your digital presence</span>
        <span class="sub">Premium websites · web apps · e-commerce</span>
      </span>
    </a>`;
  }
});
