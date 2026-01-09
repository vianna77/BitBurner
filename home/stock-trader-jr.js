// VERSION 1.4.0
// Simple Stock Trader with Auto-Upgrade to PRO
//
// PORT COMMUNICATION:
// - Port 1: Sends stock sale proceeds to money manager
//   Format: { source: "STOCK", amount: totalSaleAmount }
//
// EXTERNAL FILES:
// - stocker-trader-pro.js: Advanced trader with forecast data
//   Used when 4S Market Data APIs become available

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  // ============================================================
  // 1) CONFIGURATION
  // ============================================================

  const PROFIT_TARGET = 0.05;   // Sell when 5% profit
  const STOP_LOSS = -0.04;      // Sell when -4% loss
  const MAX_POSITIONS = 6;      // Maximum number of stocks to hold
  const EXPOSURE = 1.00;        // Use 100% of available cash
  const CYCLE_TIME = 6000;      // 6 seconds (stock update frequency)
  const COMMISSION = 100000;    // 100k per trade
  const MIN_MOMENTUM = 0.01;    // Minimum 1% momentum to buy

  const priceHistory = new Map();
  let recentActions = []; // Persistent action history

  // ============================================================
  // 2) STARTUP
  // ============================================================

  ns.tprint("=================================================");
  ns.tprint("🤖 STOCK TRADER v1.4.0 - BALANCED MODE");
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
    if (history.length > 30) {
      history.shift();
    }
  }

  function getMomentum(sym) {
    const history = priceHistory.get(sym);
    if (!history || history.length < 15) {
      return 0;
    }

    // Compare average of last 3 prices with average of first 3 in window
    const recentAvg = (history[history.length - 1] + history[history.length - 2] + history[history.length - 3]) / 3;
    const oldAvg = (history[0] + history[1] + history[2]) / 3;

    return (recentAvg - oldAvg) / oldAvg;
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
        }

        if (shouldSell) {
          const sellPrice = ns.stock.sellStock(stock.sym, stock.position.shares);
          if (sellPrice > 0) {
            const totalAmount = sellPrice * stock.position.shares;
            const profit = (sellPrice - stock.position.avgPrice) * stock.position.shares - (2 * COMMISSION);

            ns.writePort(1, { source: "STOCK", amount: totalAmount });
            const returnPercent = (currentReturn * 100).toFixed(2);
            const actionMsg = `✅ SOLD ${stock.sym} | ${reason} (${returnPercent}%) | P&L: ${ns.formatNumber(profit)}`;
            recentActions.push(actionMsg);
            if (recentActions.length > 10) {
              recentActions.shift();
            }
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
          s.momentum > MIN_MOMENTUM &&
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
              if (recentActions.length > 10) {
                recentActions.shift();
              }
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

    // Collect positions for alphabetical display
    const positionsToDisplay = [];

    for (const stock of stockData) {
      const pos = getPosition(stock.sym);
      if (pos.shares > 0) {
        const val = pos.shares * stock.price;
        const cost = pos.shares * pos.avgPrice;
        const pnl = val - cost;
        totalInvested += cost;
        totalUnrealized += pnl;

        positionsToDisplay.push({
          sym: stock.sym,
          shares: pos.shares,
          pnl: pnl,
          pnlPercent: (pnl/cost*100).toFixed(2)
        });
      }
    }

    // Sort alphabetically for consistent display
    positionsToDisplay.sort((a, b) => a.sym.localeCompare(b.sym));

    for (const pos of positionsToDisplay) {
      ns.print(`${pos.sym.padEnd(6)} | Qty: ${ns.formatNumber(pos.shares).padEnd(6)} | P&L: ${ns.formatNumber(pos.pnl).padEnd(8)} (${pos.pnlPercent}%)`);
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
