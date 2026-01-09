// VERSION 1.2.1
// Simple Stock Trader with Auto-Upgrade to PRO

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  // ============================================================
  // 1) CONFIGURATION
  // ============================================================

  const PROFIT_TARGET = 0.05;   // Sell when 5% profit
  const STOP_LOSS = -0.03;      // Sell when -3% loss
  const MAX_POSITIONS = 5;      // Maximum number of stocks to hold
  const EXPOSURE = 0.80;        // Use 80% of available cash
  const CYCLE_TIME = 6000;      // 6 seconds (stock update frequency)
  const COMMISSION = 100000;    // 100k per trade

  const priceHistory = new Map();
  let recentActions = []; // Persistent action history

  // ============================================================
  // 2) STARTUP
  // ============================================================

  ns.tprint("=================================================");
  ns.tprint("🤖 STOCK TRADER v1.2.1 - MOMENTUM MODE");
  ns.tprint(`📊 Target: ${(PROFIT_TARGET * 100)}% | Stop: ${(STOP_LOSS * 100)}%`);
  ns.tprint("=================================================");

  // ============================================================
  // 3) HELPERS
  // ============================================================

  const symbols = ns.stock.getSymbols();

  function getCash() {
    return ns.getServerMoneyAvailable("home");
  }

  function getPosition(sym) {
    const [longShares, longAvgPrice] = ns.stock.getPosition(sym);
    return { shares: longShares, avgPrice: longAvgPrice };
  }

  // --- AUTO-UPGRADE FUNCTION ---
  async function manageMarketUpgrades() {
    const has4S = ns.stock.purchase4SMarketData();
    const has4SAPI = ns.stock.purchase4SMarketDataTixApi();

    if (has4S && has4SAPI) {
      ns.tprint("🚀 All Market Data APIs purchased! Switching to PRO trader...");
      ns.spawn("stocker-trader-pro.js", { threads: 1, spawnDelay: 100 }, "25b", "false", "0.7");
    }
  }

  function updatePriceHistory(sym, price) {
    if (!priceHistory.has(sym)) {
      priceHistory.set(sym, []);
    }
    const history = priceHistory.get(sym);
    history.push(price);
    if (history.length > 20) {
      history.shift();
    }
  }

  function getMomentum(sym) {
    const history = priceHistory.get(sym);
    if (!history || history.length < 5) {
      return 0;
    }
    const recent = history.slice(-5);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    return (newest - oldest) / oldest;
  }

  // ============================================================
  // 4) MAIN LOOP
  // ============================================================

  while (true) {
    // Check for upgrades at start of each cycle
    await manageMarketUpgrades();

    const currentCash = getCash();
    let actions = [];

    // Get all stock data and update price history
    const stockData = symbols.map(sym => {
      const price = ns.stock.getPrice(sym);
      updatePriceHistory(sym, price);

      return {
        sym,
        price,
        momentum: getMomentum(sym),
        position: getPosition(sym)
      };
    }).sort((a, b) => b.momentum - a.momentum);

    // ============================================================
    // 5) SELL POSITIONS (Check existing positions first)
    // ============================================================

    for (const stock of stockData) {
      if (stock.position.shares > 0) {
        const currentReturn = (stock.price - stock.position.avgPrice) / stock.position.avgPrice;
        let shouldSell = false;
        let reason = "";

        if (currentReturn >= PROFIT_TARGET) {
          shouldSell = true;
          reason = "PROFIT 💰";
        } else if (currentReturn <= STOP_LOSS) {
          shouldSell = true;
          reason = "STOP LOSS 🔴";
        } else if (stock.momentum < 0 && currentReturn > 0.01) {
          shouldSell = true;
          reason = "MOMENTUM DROP 📉";
        }

        if (shouldSell) {
          const sellPrice = ns.stock.sellStock(stock.sym, stock.position.shares);
          if (sellPrice > 0) {
            const totalAmount = sellPrice * stock.position.shares;
            const profit = (sellPrice - stock.position.avgPrice) * stock.position.shares - (2 * COMMISSION);

            ns.writePort(1, { source: "STOCK", amount: totalAmount });
            const actionMsg = `✅ SOLD ${stock.sym} | ${reason} | P&L: ${ns.formatNumber(profit)}`;
            recentActions.push(actionMsg);
            if (recentActions.length > 10) recentActions.shift();
            ns.toast(`${stock.sym} ${reason}`, "info");
          }
        }
      }
    }

    // ============================================================
    // 6) BUY NEW POSITIONS
    // ============================================================

    // Count current positions after sells
    let activePositions = stockData.filter(stock => {
      return getPosition(stock.sym).shares > 0;
    }).length;

    let availableSlots = MAX_POSITIONS - activePositions;

    if (availableSlots > 0) {
      const budget = getCash() * EXPOSURE;
      const budgetPerStock = budget / availableSlots;

      const candidates = stockData.filter(s => {
        return s.position.shares === 0 &&
          s.momentum > 0.005 &&
          budgetPerStock > (COMMISSION * 10);
      }).slice(0, availableSlots);

      for (const stock of candidates) {
        if (activePositions < MAX_POSITIONS) {
          const maxShares = ns.stock.getMaxShares(stock.sym);
          const affordableShares = Math.floor((budgetPerStock - COMMISSION) / stock.price);
          const sharesToBuy = Math.min(affordableShares, maxShares);

          if (sharesToBuy > 0) {
            const buyPrice = ns.stock.buyStock(stock.sym, sharesToBuy);
            if (buyPrice > 0) {
              const actionMsg = `💸 BOUGHT ${stock.sym} | Momentum: ${(stock.momentum * 100).toFixed(2)}%`;
              recentActions.push(actionMsg);
              if (recentActions.length > 10) recentActions.shift();
              activePositions++;
            }
          }
        }
      }
    }

    // ============================================================
    // 7) STATUS REPORT
    // ============================================================

    const finalCash = getCash();
    let totalInvested = 0;
    let totalUnrealized = 0;


    // Portfolio calculation moved to display section

    ns.clearLog();
    ns.print("📊 MARKET STATUS");
    ns.print("-------------------------------------------------");

    for (const stock of stockData) {
      const pos = getPosition(stock.sym);
      if (pos.shares > 0) {
        const val = pos.shares * stock.price;
        const cost = pos.shares * pos.avgPrice;
        const pnl = val - cost;
        totalInvested += cost;
        totalUnrealized += pnl;

        ns.print(`${stock.sym.padEnd(6)} | Qty: ${ns.formatNumber(pos.shares).padEnd(6)} | P&L: ${ns.formatNumber(pnl).padEnd(8)} (${(pnl/cost*100).toFixed(2)}%)`);
      }
    }

    ns.print("-------------------------------------------------");
    ns.print(`💰 Cash: ${ns.formatNumber(finalCash)}`);
    ns.print(`📦 Total Value: ${ns.formatNumber(finalCash + totalInvested + totalUnrealized)}`);

    if (recentActions.length > 0) {
      ns.print("⚡ RECENT:");
      recentActions.forEach(a => ns.print(`  ${a}`));
    }

    await ns.sleep(CYCLE_TIME);
  }
}
