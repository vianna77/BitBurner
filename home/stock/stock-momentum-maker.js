// VERSION: 3.1.0
//
// PURPOSE: Stock market arbitrage system by observing p-server manipulation
// PARAMETERS: None
// DEPENDENCIES: Requires Stock Market API access and TIX API
// USAGE: run stock/stock-momentum-maker.js
//
// STRATEGY:
// 1. Monitor p-servers to detect hack/grow operations
// 2. When basic-hack.js is running -> price is being pushed DOWN
// 3. When basic-grow.js is running -> price is being pushed UP
// 4. Buy when transitioning from hack to grow (bottom)
// 5. Sell when grow momentum stops (top)
// 6. Profit from other scripts' manipulation

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const TARGETS = [
    "foodnstuff",
    "sigma-cosmetics",
    "joesguns",
    "nectar-net",
    "hong-fang-tea",
    "harakiri-sushi"
  ];

  const PRICE_HISTORY_SIZE = 10;
  const GROW_INFLUENCE_THRESHOLD = 0.01;
  const CYCLE_TIME = 6000;
  const HACK_SCRIPT = "smart/basic-hack.js";
  const GROW_SCRIPT = "smart/basic-grow.js";

  const State = {
    OBSERVING: "OBSERVING",
    HACKING: "HACKING",
    BUYING: "BUYING",
    GROWING: "GROWING"
  };

  // Check stock market access
  if (!ns.stock.hasWSEAccount() || !ns.stock.hasTIXAPIAccess()) {
    ns.tprint("❌ ERROR: Need WSE Account and TIX API Access.");
    return;
  } else {
    ns.ui.openTail();
  }

  ns.print("✅ Stock Market access confirmed.");
  ns.print(`🎯 Monitoring: ${TARGETS.join(", ")}`);

  const priceHistory = {};
  const stockState = {};

  TARGETS.forEach(t => {
    priceHistory[t] = [];
    stockState[t] = State.OBSERVING;
  });

  async function getServerActivity(target) {
    const pServer = `p-${target}`;
    if (!ns.serverExists(pServer)) {
      return null;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const processes = ns.ps(pServer);
      
      if (processes.length > 0) {
        const isHacking = processes.some(p => p.filename === HACK_SCRIPT);
        const isGrowing = processes.some(p => p.filename === GROW_SCRIPT);

        if (isHacking) {
          return "HACK";
        }
        if (isGrowing) {
          return "GROW";
        }
        return "IDLE";
      }

      if (attempt < 2) {
        await ns.sleep(2000);
      }
    }

    return "IDLE";
  }

  function updatePriceHistory(sym, price) {
    priceHistory[sym].push(price);
    if (priceHistory[sym].length > PRICE_HISTORY_SIZE) {
      priceHistory[sym].shift();
    }
  }

  function getMomentum(sym) {
    const history = priceHistory[sym];
    if (history.length < PRICE_HISTORY_SIZE) {
      return 0;
    }
    const recentAvg = (history[history.length - 1] + history[history.length - 2] + history[history.length - 3]) / 3;
    const oldAvg = (history[0] + history[1] + history[2]) / 3;
    return (recentAvg - oldAvg) / oldAvg;
  }

  function setState(sym, newState) {
    if (stockState[sym] !== newState) {
      ns.print(`🔄 [${sym}] ${stockState[sym]} -> ${newState}`);
      stockState[sym] = newState;
    }
  }

  while (true) {
    for (const target of TARGETS) {
      const price = ns.stock.getPrice(target);
      const position = ns.stock.getPosition(target);
      const [shares, avgPrice] = position;
      const momentum = getMomentum(target);

      updatePriceHistory(target, price);

      switch (stockState[target]) {
        case State.OBSERVING: {
          const activity = await getServerActivity(target);

          if (activity === "HACK") {
            ns.print(`🔨 [${target}] Detected HACK - Price being pushed down`);
            setState(target, State.HACKING);
          }
          break;
        }

        case State.HACKING: {
          const activity = await getServerActivity(target);

          if (activity === "GROW") {
            ns.print(`🌱 [${target}] Detected GROW - Transition to buying`);
            setState(target, State.BUYING);
          } else if (activity === "HACK") {
            ns.print(`📉 [${target}] Still hacking: $${ns.formatNumber(price)} | Mom: ${(momentum * 100).toFixed(2)}%`);
          } else {
            setState(target, State.OBSERVING);
          }
          break;
        }

        case State.BUYING: {
          const maxShares = ns.stock.getMaxShares(target);
          const playerMoney = ns.getServerMoneyAvailable("home");
          const affordableShares = Math.floor(playerMoney * 0.8 / price);
          const sharesToBuy = Math.min(maxShares, affordableShares);

          if (sharesToBuy > 0) {
            const buyPrice = ns.stock.buyStock(target, sharesToBuy);
            if (buyPrice > 0) {
              ns.print(`💵 [${target}] BOUGHT ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)}`);
              ns.toast(`Bought ${target}: ${sharesToBuy} shares`, "info");
              setState(target, State.GROWING);
            }
          } else {
            setState(target, State.OBSERVING);
          }
          break;
        }

        case State.GROWING: {
          if (shares === 0) {
            setState(target, State.OBSERVING);
            priceHistory[target] = [];
            break;
          }

          const activity = await getServerActivity(target);
          const currentReturn = (price - avgPrice) / avgPrice;
          ns.print(`💰 [${target}] Holding ${shares} @ $${ns.formatNumber(price)} | P&L: ${(currentReturn * 100).toFixed(2)}% | Mom: ${(momentum * 100).toFixed(2)}% | Activity: ${activity}`);

          if (activity !== "GROW" || momentum < -GROW_INFLUENCE_THRESHOLD || (momentum < GROW_INFLUENCE_THRESHOLD && currentReturn > 0.05)) {
            const salePrice = ns.stock.sellStock(target, shares);
            if (salePrice > 0) {
              const profit = (salePrice - avgPrice) * shares;
              ns.print(`✅ [${target}] SOLD ${shares} shares @ $${ns.formatNumber(salePrice)} | Profit: $${ns.formatNumber(profit)}`);
              ns.toast(`Sold ${target}: $${ns.formatNumber(profit)} profit`, "success");
              setState(target, State.OBSERVING);
              priceHistory[target] = [];
            }
          }
          break;
        }
      }
    }

    await ns.sleep(CYCLE_TIME);
  }
}
