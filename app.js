const CONFIG = {
  STARTING_BALANCE: 1000,
  AD_REWARD_AMOUNT: 100,
  MIN_BET: 10,
  MAX_BET: 10000,
  QUICK_CHIPS: [10,
    20,
    50,
    100,
    500,
    1000],
  AD_SIM_SECONDS: 10,
  USE_SIMULATOR_BY_DEFAULT: true
};

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const PAYOUTS = {
  straight: 35,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  low: 1,
  high: 1,
  dozen: 2
};

function pocketColor(n) {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red": "black";
}

function resolveBet(bet, result) {
  switch (bet.kind) {
    case "straight": return bet.number === result ? PAYOUTS.straight: 0;
    case "red": return pocketColor(result) === "red" ? PAYOUTS.red: 0;
    case "black": return pocketColor(result) === "black" ? PAYOUTS.black: 0;
    case "even": return result !== 0 && result % 2 === 0 ? PAYOUTS.even: 0;
    case "odd": return result !== 0 && result % 2 === 1 ? PAYOUTS.odd: 0;
    case "low": return result >= 1 && result <= 18 ? PAYOUTS.low: 0;
    case "high": return result >= 19 && result <= 36 ? PAYOUTS.high: 0;
    case "dozen": return result !== 0 && Math.ceil(result / 12) === bet.dozen ? PAYOUTS.dozen: 0;
    default: return 0;
  }
}

// True Cryptographic Random Number Generator
function cryptoRandomPocket() {
  const buf = new Uint32Array(1);
  const limit = 4294967296 - (4294967296 % 37);
  let val;
  do {
    crypto.getRandomValues(buf); val = buf[0];
  } while (val >= limit);
  return val % 37;
}

/**
* Modified Spin Logic:
* Ensures user win rate stays around 35-40% based on active user bets.
*/
function getBiasedSpinResult(selectedBets) {
  const trueResult = cryptoRandomPocket();
  if (!selectedBets || selectedBets.length === 0) return trueResult;

  // Check if true result yields a win
  const isTrueWin = selectedBets.some(bet => resolveBet(bet, trueResult) > 0);

  // Target win probability: ~38%
  const targetWinProbability = 0.38;
  const roll = Math.random();

  if (isTrueWin && roll > targetWinProbability) {
    // If it's a win, but exceeds our 38% probability cap, force a non-winning pocket instead
    const losingPockets = [];
    for (let i = 0; i < 37; i++) {
      const isWinPocket = selectedBets.some(bet => resolveBet(bet, i) > 0);
      if (!isWinPocket) losingPockets.push(i);
    }
    if (losingPockets.length > 0) {
      const randomIndex = Math.floor(Math.random() * losingPockets.length);
      return losingPockets[randomIndex];
    }
  }

  return trueResult;
}

/* LocalStorage Manager */
const BALANCE_KEY = "rs_token_balance";
const HISTORY_KEY = "rs_game_history";
const NAME_KEY = "rs_guest_name";

function loadBalance() {
  const raw = localStorage.getItem(BALANCE_KEY);
  if (raw === null) {
    localStorage.setItem(BALANCE_KEY, String(CONFIG.STARTING_BALANCE)); return CONFIG.STARTING_BALANCE;
  }
  const val = parseInt(raw, 10);
  return Number.isFinite(val) ? val: CONFIG.STARTING_BALANCE;
}
function saveBalance(n) {
  localStorage.setItem(BALANCE_KEY, String(n));
}

function ensureGuestName() {
  let name = localStorage.getItem(NAME_KEY);
  if (!name) {
    name = "Guest_" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem(NAME_KEY, name);
  }
  return name;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  }
  catch {
    return [];
  }
}
function saveHistoryRecord(record) {
  const history = loadHistory();
  history.unshift(record);
  if (history.length > 50) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function showErrorToast(msg) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* Wheel Canvas Graphics */
function drawWheelFace(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth;
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const size = cssSize;
  const cx = size / 2,
  cy = size / 2;
  const outerR = size / 2 - 2;
  const POCKET_COUNT = WHEEL_ORDER.length;
  const DEG_PER_POCKET = 360 / POCKET_COUNT;

  ctx.clearRect(0, 0, size, size);

  // Outer shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetY = size * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = "#0a0508";
  ctx.fill();
  ctx.restore();

  // Wood rim
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

  // Wood grain lines
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

  // Gold bezel
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

  // Rivets
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

  // Pockets
  const pocketOuter = bezelInner;
  const pocketInner = outerR * 0.52;
  for (let i = 0; i < POCKET_COUNT; i++) {
    const num = WHEEL_ORDER[i];
    const startA = ((i * DEG_PER_POCKET - 90 - DEG_PER_POCKET / 2) * Math.PI) / 180;
    const endA = ((i * DEG_PER_POCKET - 90 + DEG_PER_POCKET / 2) * Math.PI) / 180;
    const color = pocketColor(num);
    const base = color === "red" ? "#b3122a": color === "black" ? "#161616": "#0b3d2e";
    const hi = color === "red" ? "#e2314f": color === "black" ? "#3a3a3a": "#177a54";

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

    const textR = (pocketInner + pocketOuter) / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(midA) * textR, cy + Math.sin(midA) * textR);
    ctx.rotate(midA + Math.PI / 2);
    ctx.fillStyle = color === "green" ? "#ffe9a8": "#f3e9d2";
    ctx.font = `700 ${Math.max(9, size * 0.032)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 2;
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  }

  // Metallic Hub
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

  // Hub Spokes
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

  // Dome & Glass glare
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

/* Realistic Ball Animation */
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t: 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateBall(ballEl, wheelSize, durationMs, onDone) {
  const outerRadius = wheelSize * 0.46;
  const landingRadius = wheelSize * 0.36;
  const startAngleDeg = Math.random() * 360;
  const totalTravel = 6 * 360 + ((startAngleDeg + 90) % 360);
  const t0 = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - t0) / durationMs);
    const angleProgress = easeOutQuart(t);
    const currentAngleDeg = startAngleDeg - totalTravel * angleProgress;
    const radiusProgress = t < 0.78 ? 0: easeInOutCubic((t - 0.78) / 0.22);
    const radius = outerRadius - (outerRadius - landingRadius) * radiusProgress;
    const rad = (currentAngleDeg * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    ballEl.style.transform = `translate(${x}px, ${y}px)`;
    if (t < 1) requestAnimationFrame(frame);
    else onDone && onDone();
  }
  requestAnimationFrame(frame);
}

document.addEventListener("DOMContentLoaded", () => {
  const displayNameEl = document.getElementById("displayName");
  const balanceEl = document.getElementById("balance");
  const wheelCanvas = document.getElementById("wheelCanvas");
  const wheelSpin = document.getElementById("wheelSpin");
  const ball = document.getElementById("ball");
  const numberGridEl = document.getElementById("numberGrid");
  const outsideBetsEl = document.getElementById("outsideBets");
  const wagerStatusEl = document.getElementById("wagerStatus");
  const spinBtn = document.getElementById("spinBtn");
  const watchAdBtn = document.getElementById("watchAdBtn");
  const openBetsBtn = document.getElementById("openBetsBtn");
  const betsModal = document.getElementById("betsModal");
  const closeBetsBtn = document.getElementById("closeBetsBtn");
  const openChipModalBtn = document.getElementById("openChipModal");
  const chipModal = document.getElementById("chipModal");
  const closeChipBtn = document.getElementById("closeChipBtn");
  const chipGrid = document.getElementById("chipGrid");
  const customChipInput = document.getElementById("customChipInput");
  const setCustomChipBtn = document.getElementById("setCustomChipBtn");
  const historyBtn = document.getElementById("historyBtn");
  const historyModal = document.getElementById("historyModal");
  const closeHistoryBtn = document.getElementById("closeHistoryBtn");
  const historyList = document.getElementById("historyList");
  const outcomeBox = document.getElementById("outcomeBox");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const zeroModal = document.getElementById("zeroModal");
  const zeroWatchAdBtn = document.getElementById("zeroWatchAdBtn");
  const zeroCloseBtn = document.getElementById("zeroCloseBtn");
  const adSimModal = document.getElementById("adSimModal");
  const adTimerCount = document.getElementById("adTimerCount");
  const lastResultEl = document.getElementById("lastResult");

  let balance = loadBalance();
  let chip = CONFIG.MIN_BET;
  let selectedBets = [];
  let spinning = false;
  let rotation = 0;

  displayNameEl.textContent = ensureGuestName();
  balanceEl.textContent = balance;
  drawWheelFace(wheelCanvas);
  window.addEventListener("resize", () => drawWheelFace(wheelCanvas));

  function betKey(bet) {
    return JSON.stringify(bet);
  }

  function renderGrid() {
    numberGridEl.innerHTML = "";
    const zeroCell = document.createElement("div");
    zeroCell.className = "num-cell green";
    zeroCell.textContent = "0";
    const zeroBet = {
      kind: "straight", number: 0
    };
    zeroCell.dataset.key = betKey(zeroBet);
    zeroCell.addEventListener("click", () => toggleBet(zeroBet));
    numberGridEl.appendChild(zeroCell);

    for (let n = 1; n <= 36; n++) {
      const cell = document.createElement("div");
      cell.className = `num-cell ${pocketColor(n)}`;
      cell.textContent = String(n);
      const bet = {
        kind: "straight",
        number: n
      };
      cell.dataset.key = betKey(bet);
      cell.addEventListener("click", () => toggleBet(bet));
      numberGridEl.appendChild(cell);
    }

    const outside = [{
      label: "Red",
      bet: {
        kind: "red"
      }
    },
      {
        label: "Black",
        bet: {
          kind: "black"
        }
      },
      {
        label: "Even",
        bet: {
          kind: "even"
        }
      },
      {
        label: "Odd",
        bet: {
          kind: "odd"
        }
      },
      {
        label: "1-18",
        bet: {
          kind: "low"
        }
      },
      {
        label: "19-36",
        bet: {
          kind: "high"
        }
      },
      {
        label: "1st 12",
        bet: {
          kind: "dozen",
          dozen: 1
        }
      },
      {
        label: "2nd 12",
        bet: {
          kind: "dozen",
          dozen: 2
        }
      },
      {
        label: "3rd 12",
        bet: {
          kind: "dozen",
          dozen: 3
        }
      },
    ];
    outsideBetsEl.innerHTML = "";
    outside.forEach(({
      label, bet
    }) => {
      const cell = document.createElement("div");
      cell.className = "outside-bet";
      cell.textContent = label;
      cell.dataset.key = betKey(bet);
      cell.addEventListener("click", () => toggleBet(bet));
      outsideBetsEl.appendChild(cell);
    });
  }

  function toggleBet(bet) {
    if (spinning) return;
    const key = betKey(bet);
    const idx = selectedBets.findIndex((b) => betKey(b) === key);
    if (idx >= 0) selectedBets.splice(idx, 1);
    else selectedBets.push(bet);
    syncUI();
  }

  function syncUI() {
    const keys = new Set(selectedBets.map(betKey));
    document.querySelectorAll(".num-cell, .outside-bet").forEach((el) => {
      el.classList.toggle("selected", keys.has(el.dataset.key));
    });
    const total = selectedBets.length * chip;
    wagerStatusEl.textContent = `${selectedBets.length} bet(s) · ${chip}/bet · total ${total}`;
    if (openBetsBtn) openBetsBtn.textContent = selectedBets.length > 0 ? `Bets (${selectedBets.length})`: "Select Numbers";
    spinBtn.disabled = spinning || selectedBets.length === 0 || total > balance;
  }

  function applyChipValue(val) {
    if (isNaN(val) || val < CONFIG.MIN_BET || val > CONFIG.MAX_BET) {
      showErrorToast(`Chip amount must be between ${CONFIG.MIN_BET} and ${CONFIG.MAX_BET}`);
      return;
    }
    chip = val;
    if (openChipModalBtn) openChipModalBtn.textContent = `${chip} chip`;
    chipModal.classList.add("hidden");
    renderChips();
    syncUI();
  }

  function renderChips() {
    if (!chipGrid) return;
    chipGrid.innerHTML = "";
    CONFIG.QUICK_CHIPS.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = `chip-option ${c === chip ? "active": ""}`;
      btn.textContent = String(c);
      btn.addEventListener("click", () => applyChipValue(c));
      chipGrid.appendChild(btn);
    });
  }

  if (setCustomChipBtn) {
    setCustomChipBtn.addEventListener("click", () => {
      const val = parseInt(customChipInput.value, 10);
      applyChipValue(val);
    });
  }

  function renderHistory() {
    const records = loadHistory();
    if (records.length === 0) {
      historyList.innerHTML = '<p class="empty-history">No games played yet.</p>';
      return;
    }
    historyList.innerHTML = records.map((r) => {
      const badgeClass = r.net > 0 ? "win": r.net < 0 ? "loss": "even";
      const statusText = r.net > 0 ? `WIN (+${r.net})`: r.net < 0 ? `LOSS (${r.net})`: "EVEN (0)";
      return `
      <div class="history-card">
      <div class="history-card-header">
      <span>${r.timestamp}</span>
      <span class="history-badge ${badgeClass}">${statusText}</span>
      </div>
      <div>Result: <strong>${r.result} (${r.color})</strong> | Staked: ${r.staked} | Balance: ${r.balance}</div>
      </div>
      `;
    }).join("");
  }

  if (historyBtn) historyBtn.addEventListener("click", () => {
    renderHistory(); historyModal.classList.remove("hidden");
  });
  if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", () => historyModal.classList.add("hidden"));

  if (openChipModalBtn) openChipModalBtn.addEventListener("click", () => chipModal.classList.remove("hidden"));
  if (closeChipBtn) closeChipBtn.addEventListener("click", () => chipModal.classList.add("hidden"));
  if (openBetsBtn) openBetsBtn.addEventListener("click", () => betsModal.classList.remove("hidden"));
  if (closeBetsBtn) closeBetsBtn.addEventListener("click", () => betsModal.classList.add("hidden"));

  function updateBalance(n) {
    balance = n;
    saveBalance(balance);
    balanceEl.textContent = balance;
    syncUI();
    if (balance <= 0) zeroModal.classList.remove("hidden");
  }

  /* Spin Execution with Win Bias Applied */
    spinBtn.addEventListener("click", () => {
    const totalWager = selectedBets.length * chip;
    if (totalWager > balance) { showErrorToast("Insufficient balance for this wager!"); return; }

    spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = "Spinning...";
    if (betsModal) betsModal.classList.add("hidden");

    // 1. Biased result generate karein
    const result = getBiasedSpinResult(selectedBets);

    // 2. Wheel ka rotation exact ussi final result ke index par set karein
    const pocketIndex = WHEEL_ORDER.indexOf(result);
    const targetAngle = 360 * 6 + (360 - pocketIndex * (360 / WHEEL_ORDER.length));
    rotation += targetAngle;
    wheelSpin.style.transform = `rotate(${rotation}deg)`;

    animateBall(ball, wheelSpin.clientWidth, 4200, () => {
      let totalReturned = 0;
      selectedBets.forEach((b) => {
        const mult = resolveBet(b, result);
        if (mult > 0) totalReturned += chip * (mult + 1);
      });

      const net = totalReturned - totalWager;
      const newBal = balance + net;

      saveHistoryRecord({
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        result: result,
        color: pocketColor(result),
        staked: totalWager,
        net: net,
        balance: newBal,
      });

      updateBalance(newBal);

      lastResultEl.textContent = String(result);
      lastResultEl.className = `last-result ${pocketColor(result)}`;
      outcomeBox.style.display = "block";
      outcomeBox.innerHTML = `<div class="outcome-headline">Pocket ${result} (${pocketColor(result)}) — Net ${net >= 0 ? "+" + net : net} tokens</div>`;

      selectedBets = [];
      spinning = false;
      spinBtn.textContent = "Spin";
      syncUI();
    });
  });


  function startAdSimulator(onComplete) {
    adSimModal.classList.remove("hidden");
    let remaining = CONFIG.AD_SIM_SECONDS;
    adTimerCount.textContent = remaining;

    const timer = setInterval(() => {
      remaining -= 1;
      adTimerCount.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        adSimModal.classList.add("hidden");
        onComplete();
      }
    },
      1000);
  }

  function handleWatchAd() {
    if (!CONFIG.USE_SIMULATOR_BY_DEFAULT && typeof window.adBreak === "function") {
      let rewarded = false;
      window.adBreak({
        type: "reward",
        name: "ad-reward",
        beforeReward: (showAd) => showAd(),
        adViewed: () => {
          rewarded = true; updateBalance(balance + CONFIG.AD_REWARD_AMOUNT); zeroModal.classList.add("hidden");
        },
        adDismissed: () => showErrorToast("Ad closed early - No reward granted."),
        adBreakDone: () => {
          if (!rewarded) startAdSimulator(() => {
            updateBalance(balance + CONFIG.AD_REWARD_AMOUNT); zeroModal.classList.add("hidden");
          });
        }
      });
    } else {
      startAdSimulator(() => {
        updateBalance(balance + CONFIG.AD_REWARD_AMOUNT);
        zeroModal.classList.add("hidden");
      });
    }
  }

  if (watchAdBtn) watchAdBtn.addEventListener("click", handleWatchAd);
  if (zeroWatchAdBtn) zeroWatchAdBtn.addEventListener("click", handleWatchAd);
  if (zeroCloseBtn) zeroCloseBtn.addEventListener("click", () => zeroModal.classList.add("hidden"));

  function tryFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }
  if (fullscreenBtn) fullscreenBtn.addEventListener("click", tryFullscreen);
  document.body.addEventListener("click", tryFullscreen, {
    once: true
  });

  renderGrid();
  renderChips();
  syncUI();
  if (balance <= 0) zeroModal.classList.add("hidden"); // Kept modal controllable
});
// --- Premium Rinix Agency Advertisement ---
document.addEventListener("DOMContentLoaded", () => {
  const adSlot = document.getElementById("adSlot");

  if (adSlot) {
    const adIns = adSlot.querySelector(".adsbygoogle");
    const isPlaceholder =
    !adIns ||
    adIns.getAttribute("data-ad-client") === "ca-pub-XXXXXXXXXXXXXXXX";

    if (isPlaceholder) {
      adSlot.innerHTML = `
      <a href="https://rinix.online"
      target="_blank"
      rel="noopener noreferrer"
      class="rinix-ad">

      <div class="rinix-ad-badge">SPONSORED</div>

      <div class="rinix-ad-content">
      <div class="rinix-logo">
      <span>R</span>
      </div>

      <div class="rinix-ad-text">
      <div class="rinix-brand">RINIX</div>
      <div class="rinix-title">Build Your Digital Presence</div>
      <div class="rinix-description">
      Premium Websites • Web Apps • E-Commerce
      </div>
      </div>

      <div class="rinix-cta">
      Visit Site →
      </div>
      </div>

      <div class="rinix-url">rinix.online</div>
      </a>
      `;
    }
  }
});
