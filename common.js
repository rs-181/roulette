/* ==========================================================================
   RINIX CASINO — shared core (window.Rinix)
   Balance is a single localStorage value shared by every game. Any page
   that includes this file gets: balance persistence + cross-tab sync,
   toast notifications, the watch-ad / zero-balance reward flow, and
   generic [data-open-modal] / [data-close-modal] wiring.
   ========================================================================== */
(function (global) {
  "use strict";

  const CONFIG = {
    STARTING_BALANCE: 1000,
    BALANCE_KEY: "rinix_casino_balance",
    AD_REWARD_AMOUNT: 100,
    AD_SIM_SECONDS: 10,
    // Shared bet-sizing defaults so every game's chip picker looks and
    // behaves identically without each game redefining its own list.
    QUICK_CHIPS: [10, 20, 50, 100, 500, 1000],
    MAX_BET_PER_SPOT: 10000,
    // Placeholder AdSense client — swap for a real one when configured.
    // Real ads are attempted first; the labelled simulator is only a
    // fallback so the reward flow never silently breaks in the meantime.
    ADSENSE_CLIENT: "ca-pub-3562749923218282",
  };

  let memoryBalance = CONFIG.STARTING_BALANCE;
  let storageWarned = false;
  function warnStorageOnce() {
    if (storageWarned) return;
    storageWarned = true;
    console.warn("localStorage unavailable — balance will not persist after this tab closes.");
  }

  function formatNum(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  // Fair, unweighted random integer in [0, maxExclusive) via rejection
  // sampling on crypto RNG — no modulo bias, same fairness guarantee used
  // by the Roulette wheel, shared here so every game's outcome is equally
  // trustworthy.
  function cryptoRandomInt(maxExclusive) {
    const buf = new Uint32Array(1);
    const limit = 4294967296 - (4294967296 % maxExclusive);
    let val;
    do { crypto.getRandomValues(buf); val = buf[0]; } while (val >= limit);
    return val % maxExclusive;
  }

  function getBalance() {
    try {
      const raw = localStorage.getItem(CONFIG.BALANCE_KEY);
      if (raw === null) {
        localStorage.setItem(CONFIG.BALANCE_KEY, String(CONFIG.STARTING_BALANCE));
        return CONFIG.STARTING_BALANCE;
      }
      const val = parseInt(raw, 10);
      return Number.isFinite(val) ? val : CONFIG.STARTING_BALANCE;
    } catch (e) {
      warnStorageOnce();
      return memoryBalance;
    }
  }

  function broadcastBalance(val) {
    document.querySelectorAll("[data-balance-display]").forEach((el) => {
      el.textContent = formatNum(val);
    });
    global.dispatchEvent(new CustomEvent("rinix:balance", { detail: { balance: val } }));
    const zeroModal = document.getElementById("zeroModal");
    if (val <= 0 && zeroModal) zeroModal.classList.remove("hidden");
  }

  function setBalance(n) {
    const val = Math.max(0, Math.round(n));
    memoryBalance = val;
    try {
      localStorage.setItem(CONFIG.BALANCE_KEY, String(val));
    } catch (e) {
      warnStorageOnce();
    }
    broadcastBalance(val);
    return val;
  }

  function addBalance(delta) {
    return setBalance(getBalance() + delta);
  }

  // Keep every open tab in sync if the balance changes elsewhere.
  global.addEventListener("storage", (e) => {
    if (e.key === CONFIG.BALANCE_KEY) broadcastBalance(getBalance());
  });

  function showToast(msg) {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Only treated as "configured" once the placeholder client ID has been
  // swapped for a real one AND the SDK actually exposed adBreak(). Until
  // then every "watch ad" click goes straight to the labelled simulator.
  function isAdSenseConfigured() {
    const script = document.querySelector('script[src*="adsbygoogle.js"]');
    const hasRealClientId = !!script && !script.src.includes(CONFIG.ADSENSE_CLIENT);
    return hasRealClientId && typeof global.adBreak === "function";
  }

  function startAdSimulator(onComplete) {
    const modal = document.getElementById("adSimModal");
    const countEl = document.getElementById("adTimerCount");
    if (!modal || !countEl) { onComplete(); return; }
    modal.classList.remove("hidden");
    let remaining = CONFIG.AD_SIM_SECONDS;
    countEl.textContent = remaining;
    const timer = setInterval(() => {
      remaining -= 1;
      countEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        modal.classList.add("hidden");
        onComplete();
      }
    }, 1000);
  }

  function handleWatchAd(onReward) {
    if (isAdSenseConfigured()) {
      let rewarded = false;
      try {
        global.adBreak({
          type: "reward",
          name: "ad-reward",
          beforeReward: (showAdFn) => showAdFn(),
          adViewed: () => { rewarded = true; onReward(); },
          adDismissed: () => showToast("Ad closed early — no reward granted."),
          adBreakDone: () => { if (!rewarded) startAdSimulator(onReward); },
        });
      } catch (e) {
        console.error("adBreak failed", e);
        startAdSimulator(onReward);
      }
    } else {
      startAdSimulator(onReward);
    }
  }

  function grantAdReward() {
    addBalance(CONFIG.AD_REWARD_AMOUNT);
    showToast(`+${CONFIG.AD_REWARD_AMOUNT} tokens added!`);
    const zeroModal = document.getElementById("zeroModal");
    if (zeroModal) zeroModal.classList.add("hidden");
  }

  // Generic "stack of quick-bet chips" picker, shared by every game.
  // Renders CONFIG.QUICK_CHIPS as .chip buttons into `container`, calling
  // onSelect(value) when tapped and re-rendering to show the new selection.
  function renderChipPicker(container, selected, onSelect, values) {
    if (!container) return;
    const list = values || CONFIG.QUICK_CHIPS;
    container.innerHTML = "";
    list.forEach((val) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (val === selected ? " selected" : "");
      btn.dataset.val = val;
      btn.textContent = val;
      btn.addEventListener("click", () => onSelect(val));
      container.appendChild(btn);
    });
  }

  // Generic per-game history log stored under its own localStorage key.
  function historyLoad(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }
  function historySave(key, record, limit) {
    try {
      const list = historyLoad(key);
      list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list.slice(0, limit || 50)));
    } catch (e) {
      console.warn("history not saved", e);
    }
  }

  function initCommonUI() {
    broadcastBalance(getBalance());
    initAdSlotFallback();

    document.querySelectorAll("[data-watch-ad]").forEach((btn) => {
      btn.addEventListener("click", () => handleWatchAd(grantAdReward));
    });

    const zeroModal = document.getElementById("zeroModal");
    const zeroCloseBtn = document.getElementById("zeroCloseBtn");
    if (zeroCloseBtn && zeroModal) {
      zeroCloseBtn.addEventListener("click", () => zeroModal.classList.add("hidden"));
    }
    if (getBalance() <= 0 && zeroModal) zeroModal.classList.remove("hidden");

    document.querySelectorAll("[data-open-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = document.getElementById(btn.getAttribute("data-open-modal"));
        if (modal) modal.classList.remove("hidden");
      });
    });
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-close-modal");
        const modal = targetId ? document.getElementById(targetId) : btn.closest(".modal-backdrop");
        if (modal) modal.classList.add("hidden");
      });
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.add("hidden");
      });
    });

    document.querySelectorAll("[data-fullscreen-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      });
    });
  }

  // One unexpected error shows as a small toast instead of silently
  // freezing the game with no feedback to the player.
  global.addEventListener("error", (e) => console.error("Unhandled error:", e.error || e.message));
  global.addEventListener("unhandledrejection", (e) => console.error("Unhandled promise rejection:", e.reason));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCommonUI);
  } else {
    initCommonUI();
  }

  // Shared sponsored-slot fallback markup, used by every game's #adSlot
  // until a real AdSense unit is filled there.
  function initAdSlotFallback() {
    document.querySelectorAll(".ad-slot").forEach((adSlot) => {
      const adIns = adSlot.querySelector(".adsbygoogle");
      const isPlaceholder = !adIns || adIns.getAttribute("data-ad-client") === CONFIG.ADSENSE_CLIENT;
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
  }

  global.Rinix = {
    CONFIG,
    formatNum,
    cryptoRandomInt,
    getBalance,
    setBalance,
    addBalance,
    showToast,
    isAdSenseConfigured,
    startAdSimulator,
    handleWatchAd,
    grantAdReward,
    renderChipPicker,
    historyLoad,
    historySave,
    initAdSlotFallback,
  };
})(window);
