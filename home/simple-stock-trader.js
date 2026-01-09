// VERSION 1.2.0
// Simple Stock Trader for BN8 - WSE Account + TIX API Access only
// Uses improved momentum with commission awareness

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
  
  // ============================================================
  // 2) STARTUP
  // ============================================================
  
  ns.tprint("=================================================");
  ns.tprint("🤖 STOCK TRADER v1.2.0 - MOMENTUM MODE");
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
  
  function getUnrealizedPnL(sym) {
    const position = getPosition(sym);
    if (position.shares === 0) {
      return 0;
    }
    const currentPrice = ns.stock.getPrice(sym);
    return (currentPrice - position.avgPrice) * position.shares;
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
          reason = "STOP LOSS ⚠️";
        } else if (stock.momentum < 0 && currentReturn > 0.01) {
          shouldSell = true;
          reason = "MOMENTUM DROP 📉";
        }
        
        if (shouldSell) {
          const sellPrice = ns.stock.sellStock(stock.sym, stock.position.shares);
          if (sellPrice > 0) {
            const profit = (sellPrice - stock.position.avgPrice) * stock.position.shares - (2 * COMMISSION);
            actions.push(`✅ SOLD ${stock.sym} | ${reason} | P&L: ${ns.formatNumber(profit)}`);
            ns.toast(`${stock.sym} ${reason}`, "info");
          }
        }
      }
    }
    
    // ============================================================
    // 6) BUY NEW POSITIONS
    // ============================================================
    
    // Count current positions
    const currentPositions = stockData.filter(stock => stock.position.shares > 0).length;
    const availableSlots = MAX_POSITIONS - currentPositions;
    
    if (availableSlots > 0) {
      const budget = getCash() * EXPOSURE;
      const budgetPerStock = budget / availableSlots;
      
      const candidates = stockData.filter(s => 
        s.position.shares === 0 && 
        s.momentum > 0.005 && // Minimum 0.5% momentum
        budgetPerStock > (COMMISSION * 10)
      ).slice(0, availableSlots);
      
      for (const stock of candidates) {
        const maxShares = ns.stock.getMaxShares(stock.sym);
        const affordableShares = Math.floor((budgetPerStock - COMMISSION) / stock.price);
        const sharesToBuy = Math.min(affordableShares, maxShares);
        
        if (sharesToBuy > 0) {
          const buyPrice = ns.stock.buyStock(stock.sym, sharesToBuy);
          if (buyPrice > 0) {
            actions.push(`💸 BOUGHT ${stock.sym} | Momentum: ${(stock.momentum * 100).toFixed(2)}%`);
            availableSlots--;
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
      if (stock.position.shares > 0) {
        const val = stock.position.shares * stock.price;
        const cost = stock.position.shares * stock.position.avgPrice;
        const pnl = val - cost;
        totalInvested += cost;
        totalUnrealized += pnl;
        
        ns.print(`${stock.sym.padEnd(6)} | Qty: ${ns.formatNumber(stock.position.shares).padEnd(6)} | P&L: ${ns.formatNumber(pnl).padEnd(8)} (${(pnl/cost*100).toFixed(2)}%)`);
      }
    }
    
    ns.print("-------------------------------------------------");
    ns.print(`💰 Cash: ${ns.formatNumber(finalCash)}`);
    ns.print(`📦 Total Value: ${ns.formatNumber(finalCash + totalInvested + totalUnrealized)}`);
    
    if (actions.length > 0) {
      ns.print("⚡ RECENT:");
      actions.forEach(a => ns.print(`  ${a}`));
    }
    
    await ns.sleep(CYCLE_TIME);
  }
}