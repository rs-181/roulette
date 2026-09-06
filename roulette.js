/* ==========================================================================
   Roulette — depends on common.js (window.Rinix) for balance/toast/ads
   ========================================================================== */
const ROULETTE = {
  QUICK_CHIPS: [10, 20, 50, 100, 500, 1000],
  MAX_BET_PER_SPOT: 10000,
  HISTORY_KEY: "rinix_roulette_history",
};

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const PAYOUTS = { straight: 35, red: 1, black: 1, even: 1, odd: 1, low: 1, high: 1, dozen: 2 };

function pocketColor(n) {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

function resolveBet(bet, result) {
  switch (bet.kind) {
    case "straight": return bet.number === result ? PAYOUTS.straight : 0;
    case "red": return pocketColor(result) === "red" ? PAYOUTS.red : 0;
    case "black": return pocketColor(result) === "black" ? PAYOUTS.black : 0;
    case "even": return result !== 0 && result % 2 === 0 ? PAYOUTS.even : 0;
    case "odd": return result !== 0 && result % 2 === 1 ? PAYOUTS.odd : 0;
    case "low": return result >= 1 && result <= 18 ? PAYOUTS.low : 0;
    case "high": return result >= 19 && result <= 36 ? PAYOUTS.high : 0;
    case "dozen": return result !== 0 && Math.ceil(result / 12) === bet.dozen ? PAYOUTS.dozen : 0;
    default: return 0;
  }
}

// Fair, unweighted cryptographic RNG — rejection sampling avoids modulo bias.
// There is no win-rate cap and no hidden override of the true result.
function cryptoRandomPocket() {
  const buf = new Uint32Array(1);
  const limit = 4294967296 - (4294967296 % 37);
  let val;
  do { crypto.getRandomValues(buf); val = buf[0]; } while (val >= limit);
  return val % 37;
}

function betKey(bet) { return JSON.stringify(bet); }

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(ROULETTE.HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistoryRecord(record) {
  try {
    const history = loadHistory();
    history.unshift(record);
    if (history.length > 50) history.pop();
    localStorage.setItem(ROULETTE.HISTORY_KEY, JSON.stringify(history));
  } catch (e) { console.warn("history not saved", e); }
}

/* ---------------- Wheel canvas rendering (unchanged look & feel) --------- */
function drawWheelFace(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth;
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const size = cssSize;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 2;
  const POCKET_COUNT = WHEEL_ORDER.length;
  const DEG_PER_POCKET = 360 / POCKET_COUNT;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetY = size * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = "#0a0508";
  ctx.fill();
  ctx.restore();

  const woodOuter = outerR;
  const woodInner = outerR * 0.90;
  const woodGrad = ctx.createRadialGradient(cx, cy, woodInner, cx, cy, woodOuter);
  woodGrad.addColorStop(0, "#4a2a12");
  woodGrad.addColorStop(0.5, "#6b3d1a");
  woodGrad.addColorStop(1, "#3a2010");
  ctx.beginPath();
  ctx.arc(cx, cy, woodOuter, 0, Math.PI * 2);
  ctx.fillStyle = woodGrad;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#2a1608";
  for (let a = 0; a < 360; a += 3) {
    const rad = (a * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * woodInner, cy + Math.sin(rad) * woodInner);
    ctx.lineTo(cx + Math.cos(rad) * woodOuter, cy + Math.sin(rad) * woodOuter);
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();

  const bezelOuter = woodInner;
  const bezelInner = outerR * 0.855;
  const bezelGrad = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR);
  bezelGrad.addColorStop(0, "#fff3c4");
  bezelGrad.addColorStop(0.3, "#d4af37");
  bezelGrad.addColorStop(0.6, "#8a6a1f");
  bezelGrad.addColorStop(1, "#d4af37");
  ctx.beginPath();
  ctx.arc(cx, cy, bezelOuter, 0, Math.PI * 2);
  ctx.arc(cx, cy, bezelInner, 0, Math.PI * 2, true);
  ctx.fillStyle = bezelGrad;
  ctx.fill("evenodd");

  const rivetR = (bezelOuter + bezelInner) / 2;
  for (let i = 0; i < POCKET_COUNT; i++) {
    const a = ((i * DEG_PER_POCKET) * Math.PI) / 180;
    const rx = cx + Math.cos(a) * rivetR;
    const ry = cy + Math.sin(a) * rivetR;
    const rg = ctx.createRadialGradient(rx - 1, ry - 1, 0, rx, ry, 2.4);
    rg.addColorStop(0, "#fff8e0");
    rg.addColorStop(1, "#7a5c18");
    ctx.beginPath();
    ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
  }

  const pocketOuter = bezelInner;
  const pocketInner = outerR * 0.52;
  for (let i = 0; i < POCKET_COUNT; i++) {
    const num = WHEEL_ORDER[i];
    const startA = ((i * DEG_PER_POCKET - 90 - DEG_PER_POCKET / 2) * Math.PI) / 180;
    const endA = ((i * DEG_PER_POCKET - 90 + DEG_PER_POCKET / 2) * Math.PI) / 180;
    const color = pocketColor(num);
    const base = color === "red" ? "#b3122a" : color === "black" ? "#161616" : "#0b3d2e";
    const hi = color === "red" ? "#e2314f" : color === "black" ? "#3a3a3a" : "#177a54";

    const midA = (startA + endA) / 2;
    const pg = ctx.createRadialGradient(
      cx + Math.cos(midA) * pocketInner, cy + Math.sin(midA) * pocketInner, 1,
      cx + Math.cos(midA) * pocketOuter, cy + Math.sin(midA) * pocketOuter, pocketOuter - pocketInner
    );
    pg.addColorStop(0, "#000000");
    pg.addColorStop(0.35, base);
    pg.addColorStop(1, hi);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, pocketOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, pocketInner, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, pocketOuter, startA, endA);
    ctx.closePath();
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(startA) * pocketInner, cy + Math.sin(startA) * pocketInner);
    ctx.lineTo(cx + Math.cos(startA) * pocketOuter, cy + Math.sin(startA) * pocketOuter);
    ctx.strokeStyle = "rgba(212,175,55,0.85)";
    ctx.lineWidth = Math.max(1, size * 0.004);
    ctx.stroke();

    const textR = (pocketInner + pocketOuter) / 1.71;
    ctx.save();
    ctx.translate(cx + Math.cos(midA) * textR, cy + Math.sin(midA) * textR);
    ctx.rotate(midA + Math.PI / 2);
    ctx.fillStyle = color === "green" ? "#ffe9a8" : "#f3e9d2";
    ctx.font = `700 ${Math.max(9, size * 0.032)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 2;
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  }

  const hubOuter = pocketInner;
  const hubGrad = ctx.createRadialGradient(cx - hubOuter * 0.3, cy - hubOuter * 0.3, hubOuter * 0.05, cx, cy, hubOuter);
  hubGrad.addColorStop(0, "#fff6d8");
  hubGrad.addColorStop(0.35, "#d4af37");
  hubGrad.addColorStop(0.7, "#8a6a1f");
  hubGrad.addColorStop(1, "#3a2c0d");
  ctx.beginPath();
  ctx.arc(cx, cy, hubOuter, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const a = (i * 45 * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    const sg = ctx.createLinearGradient(0, 0, hubOuter * 0.92, 0);
    sg.addColorStop(0, "#5c4415");
    sg.addColorStop(0.5, "#f0d580");
    sg.addColorStop(1, "#5c4415");
    ctx.fillStyle = sg;
    ctx.fillRect(hubOuter * 0.18, -Math.max(1.5, size * 0.008), hubOuter * 0.74, Math.max(3, size * 0.016));
    ctx.restore();
  }

  const domeR = hubOuter * 0.22;
  const domeGrad = ctx.createRadialGradient(cx - domeR * 0.4, cy - domeR * 0.4, domeR * 0.1, cx, cy, domeR);
  domeGrad.addColorStop(0, "#fffdf2");
  domeGrad.addColorStop(0.5, "#e8c866");
  domeGrad.addColorStop(1, "#6b4e14");
  ctx.beginPath();
  ctx.arc(cx, cy, domeR, 0, Math.PI * 2);
  ctx.fillStyle = domeGrad;
  ctx.fill();

  const glare = ctx.createRadialGradient(cx - outerR * 0.4, cy - outerR * 0.55, outerR * 0.05, cx - outerR * 0.4, cy - outerR * 0.55, outerR * 1.1);
  glare.addColorStop(0, "rgba(255,255,255,0.25)");
  glare.addColorStop(0.4, "rgba(255,255,255,0.05)");
  glare.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = glare;
  ctx.fill();
}

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

let lastBallAngleDeg = -90;
function animateBall(ballEl, wheelSize, durationMs, onDone) {
  const outerRadius = wheelSize * 0.46;
  const landingRadius = wheelSize * 0.36;
  const startAngleDeg = lastBallAngleDeg;
  const totalTravel = 6 * 360 + ((startAngleDeg + 90) % 360);
  const t0 = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - t0) / durationMs);
    const angleProgress = easeOutQuart(t);
    const currentAngleDeg = startAngleDeg - totalTravel * angleProgress;
    const radiusProgress = t < 0.78 ? 0 : easeInOutCubic((t - 0.78) / 0.22);
    const radius = outerRadius - (outerRadius - landingRadius) * radiusProgress;
    const rad = (currentAngleDeg * Math.PI) / 180;
    ballEl.style.transform = `translate(${Math.cos(rad) * radius}px, ${Math.sin(rad) * radius}px)`;
    if (t < 1) requestAnimationFrame(frame);
    else {
      lastBallAngleDeg = ((currentAngleDeg % 360) + 360) % 360;
      onDone && onDone();
    }
  }
  requestAnimationFrame(frame);
}

/* ------------------------------ Game wiring ------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const wheelCanvas = document.getElementById("wheelCanvas");
  const wheelSpin = document.getElementById("wheelSpin");
  const ball = document.getElementById("ball");
  const numberGridEl = document.getElementById("numberGrid");
  const outsideBetsEl = document.getElementById("outsideBets");
  const wagerStatusEl = document.getElementById("wagerStatus");
  const spinBtn = document.getElementById("spinBtn");
  const openBetsBtn = document.getElementById("openBetsBtn");
  const bettingPanel = document.getElementById("bettingPanel");
  const closeBetsBtn = document.getElementById("closeBetsBtn");
  const openChipModalBtn = document.getElementById("openChipModal");
  const chipGrid = document.getElementById("chipGrid");
  const customChipInput = document.getElementById("customChipInput");
  const setCustomChipBtn = document.getElementById("setCustomChipBtn");
  const historyBtn = document.getElementById("historyBtn");
  const historyList = document.getElementById("historyList");
  const outcomeBox = document.getElementById("outcomeBox");
  const lastResultEl = document.getElementById("lastResult");
  const clearBetsBtn = document.getElementById("clearBetsBtn");

  let balance = Rinix.getBalance();
  let bets = {}; // key -> { bet, amount }
  let selectedChip = ROULETTE.QUICK_CHIPS[0];
  let spinning = false;
  let rotation = 0;
  const DEG_PER_POCKET = 360 / WHEEL_ORDER.length;

  function spinWheelToResult(result, extraSpins = 6) {
    const pocketIndex = WHEEL_ORDER.indexOf(result);
    const pocketAngle = pocketIndex * DEG_PER_POCKET - 90;
    let deltaToTop = (-90 - pocketAngle - rotation) % 360;
    if (deltaToTop < 0) deltaToTop += 360;
    rotation += extraSpins * 360 + deltaToTop;
    wheelSpin.style.transform = `rotate(${rotation}deg)`;
  }
  function normalizeWheelRotation() {
    const normalized = ((rotation % 360) + 360) % 360;
    wheelSpin.style.transition = "none";
    rotation = normalized;
    wheelSpin.style.transform = `rotate(${rotation}deg)`;
    void wheelSpin.offsetHeight;
    wheelSpin.style.transition = "";
  }

  drawWheelFace(wheelCanvas);
  window.addEventListener("resize", () => drawWheelFace(wheelCanvas));
  window.addEventListener("rinix:balance", (e) => { balance = e.detail.balance; syncUI(); });

  function totalStaked() {
    return Object.values(bets).reduce((sum, b) => sum + b.amount, 0);
  }

  function renderGrid() {
    numberGridEl.innerHTML = "";
    const zeroCell = document.createElement("div");
    zeroCell.className = "num-cell green";
    zeroCell.textContent = "0";
    const zeroBet = { kind: "straight", number: 0 };
    zeroCell.dataset.key = betKey(zeroBet);
    zeroCell.addEventListener("click", () => placeBet(zeroBet));
    numberGridEl.appendChild(zeroCell);

    for (let n = 1; n <= 36; n++) {
      const cell = document.createElement("div");
      cell.className = `num-cell ${pocketColor(n)}`;
      cell.textContent = String(n);
      const bet = { kind: "straight", number: n };
      cell.dataset.key = betKey(bet);
      cell.addEventListener("click", () => placeBet(bet));
      numberGridEl.appendChild(cell);
    }

    const outside = [
      { label: "Red", bet: { kind: "red" } },
      { label: "Black", bet: { kind: "black" } },
      { label: "Even", bet: { kind: "even" } },
      { label: "Odd", bet: { kind: "odd" } },
      { label: "1-18", bet: { kind: "low" } },
      { label: "19-36", bet: { kind: "high" } },
      { label: "1st 12", bet: { kind: "dozen", dozen: 1 } },
      { label: "2nd 12", bet: { kind: "dozen", dozen: 2 } },
      { label: "3rd 12", bet: { kind: "dozen", dozen: 3 } },
    ];
    outsideBetsEl.innerHTML = "";
    outside.forEach(({ label, bet }) => {
      const cell = document.createElement("div");
      cell.className = "outside-bet";
      cell.textContent = label;
      cell.dataset.key = betKey(bet);
      cell.addEventListener("click", () => placeBet(bet));
      outsideBetsEl.appendChild(cell);
    });

    renderBetTags();
  }

  // Renders the little gold "amount staked" tag on every cell that has a
  // bet on it, without rebuilding the whole grid (keeps click handlers).
  function renderBetTags() {
    document.querySelectorAll(".num-cell, .outside-bet").forEach((el) => {
      el.querySelectorAll(".bet-chip-tag").forEach((t) => t.remove());
      el.classList.remove("has-bet");
      const entry = bets[el.dataset.key];
      if (entry) {
        el.classList.add("has-bet");
        const tag = document.createElement("span");
        tag.className = "bet-chip-tag";
        tag.textContent = Rinix.formatNum(entry.amount);
        el.appendChild(tag);
      }
    });
  }

  function placeBet(bet) {
    if (spinning) return;
    const key = betKey(bet);
    const current = bets[key]?.amount || 0;

    if (selectedChip > balance) {
      Rinix.showToast("Not enough tokens for that chip.");
      return;
    }
    if (current + selectedChip > ROULETTE.MAX_BET_PER_SPOT) {
      Rinix.showToast("This spot is already at its 10,000 token limit.");
      return;
    }

    balance = Rinix.addBalance(-selectedChip);
    bets[key] = { bet, amount: current + selectedChip };
    renderBetTags();
    syncUI();
  }

  function clearBets() {
    if (spinning) return;
    const staked = totalStaked();
    if (staked === 0) { Rinix.showToast("No bets on the table."); return; }
    balance = Rinix.addBalance(staked);
    bets = {};
    renderBetTags();
    syncUI();
  }
  if (clearBetsBtn) clearBetsBtn.addEventListener("click", clearBets);

  function syncUI() {
    const count = Object.keys(bets).length;
    const total = totalStaked();
    wagerStatusEl.textContent = `${count} bet(s) · ${Rinix.formatNum(selectedChip)} chip · total staked ${Rinix.formatNum(total)}`;
    if (openBetsBtn) openBetsBtn.textContent = count > 0 ? `Bets (${count})` : "Select Numbers";
    spinBtn.disabled = spinning || count === 0;
  }

  function applyChipValue(val) {
    if (isNaN(val) || val < ROULETTE.QUICK_CHIPS[0] || val > ROULETTE.MAX_BET_PER_SPOT) {
      Rinix.showToast(`Chip amount must be between ${ROULETTE.QUICK_CHIPS[0]} and ${ROULETTE.MAX_BET_PER_SPOT}`);
      return;
    }
    selectedChip = val;
    if (openChipModalBtn) openChipModalBtn.textContent = `${Rinix.formatNum(selectedChip)} chip`;
    renderChips();
    syncUI();
    const chipModal = document.getElementById("chipModal");
    if (chipModal) chipModal.classList.add("hidden");
  }

  function renderChips() {
    if (!chipGrid) return;
    chipGrid.innerHTML = "";
    ROULETTE.QUICK_CHIPS.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = `chip${c === selectedChip ? " selected" : ""}`;
      btn.dataset.val = c;
      btn.textContent = c;
      btn.addEventListener("click", () => applyChipValue(c));
      chipGrid.appendChild(btn);
    });
  }
  if (setCustomChipBtn) {
    setCustomChipBtn.addEventListener("click", () => applyChipValue(parseInt(customChipInput.value, 10)));
  }

  function renderHistory() {
    const records = loadHistory();
    if (records.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No spins yet.</p>';
      return;
    }
    historyList.innerHTML = records.map((r) => {
      const badgeClass = r.net > 0 ? "win" : r.net < 0 ? "loss" : "even";
      const statusText = r.net > 0 ? `WIN +${Rinix.formatNum(r.net)}` : r.net < 0 ? `LOSS ${Rinix.formatNum(r.net)}` : "EVEN";
      return `<div class="history-card">
        <div class="history-card-head"><span>${r.timestamp}</span><span class="badge ${badgeClass}">${statusText}</span></div>
        <div>Result: <strong>${r.result} (${r.color})</strong> · Staked ${Rinix.formatNum(r.staked)}</div>
      </div>`;
    }).join("");
  }
  if (historyBtn) historyBtn.addEventListener("click", renderHistory);

  if (openBetsBtn) openBetsBtn.addEventListener("click", () => bettingPanel.classList.add("open"));
  if (closeBetsBtn) closeBetsBtn.addEventListener("click", () => bettingPanel.classList.remove("open"));

  spinBtn.addEventListener("click", () => {
    const staked = totalStaked();
    if (staked === 0) { Rinix.showToast("Place a bet before you spin."); return; }

    spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = "Spinning...";
    if (bettingPanel) bettingPanel.classList.remove("open");

    const result = cryptoRandomPocket();
    spinWheelToResult(result);

    animateBall(ball, wheelSpin.clientWidth, 4200, () => {
      normalizeWheelRotation();

      let totalReturned = 0;
      Object.values(bets).forEach(({ bet, amount }) => {
        const mult = resolveBet(bet, result);
        if (mult > 0) totalReturned += amount * (mult + 1);
      });
      if (totalReturned > 0) balance = Rinix.addBalance(totalReturned);

      const net = totalReturned - staked;
      saveHistoryRecord({
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        result, color: pocketColor(result), staked, net,
      });

      lastResultEl.textContent = String(result);
      lastResultEl.className = `last-result ${pocketColor(result)}`;
      outcomeBox.style.display = "block";
      outcomeBox.innerHTML = `<div class="outcome-headline">Pocket ${result} (${pocketColor(result)}) — Net ${net >= 0 ? "+" + Rinix.formatNum(net) : Rinix.formatNum(net)} tokens</div>`;

      bets = {};
      renderBetTags();
      spinning = false;
      spinBtn.textContent = "Spin";
      syncUI();
    });
  });

  function tryFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  }
  document.body.addEventListener("click", tryFullscreen, { once: true });

  renderGrid();
  renderChips();
  syncUI();
});

// --- Rinix agency sponsored slot fallback (shown only while no real AdSense unit is filled) ---
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
