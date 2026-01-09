// VERSION 1.1.0
// Simple Stock Trader for BN8 - WSE Account + TIX API Access only
// Uses price momentum instead of forecast data

/** @param {NS} ns */
export async function main(ns) {
  // ============================================================
  // 1) CONFIGURATION
  // ============================================================
  
  const PROFIT_TARGET = 0.05;   // Sell when 5% profit
  const STOP_LOSS = -0.03;      // Sell when -3% loss
  const MAX_POSITIONS = 5;      // Maximum number of stocks to hold
  const EXPOSURE = 0.80;        // Use 80% of available cash
  const CYCLE_TIME = 10000;     // 10 seconds between cycles
  
  // Price history for momentum calculation
  const priceHistory = new Map();
  
  // ============================================================
  // 2) STARTUP
  // ============================================================
  
  ns.tprint("=================================================");
  ns.tprint("🤖 SIMPLE STOCK TRADER v1.1.0");
  ns.tprint(`📊 Profit Target: ${(PROFIT_TARGET * 100)}% | Stop Loss: ${(STOP_LOSS * 100)}%`);
  ns.tprint(`💰 Cash Exposure: ${(EXPOSURE * 100)}%`);
  ns.tprint(`📈 Max Positions: ${MAX_POSITIONS}`);
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
    if (history.length > 10) {
      history.shift(); // Keep only last 10 prices
    }
  }
  
  function getPriceChange(sym) {
    const history = priceHistory.get(sym);
    if (!history || history.length < 2) {
      return 0;
    }
    const oldPrice = history[0];
    const newPrice = history[history.length - 1];
    return (newPrice - oldPrice) / oldPrice;
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
        priceChange: getPriceChange(sym),
        position: getPosition(sym)
      };
    }).sort((a, b) => b.priceChange - a.priceChange);
    
    // ============================================================
    // 5) SELL POSITIONS (Check existing positions first)
    // ============================================================
    
    for (const stock of stockData) {
      if (stock.position.shares > 0) {
        const currentReturn = (stock.price - stock.position.avgPrice) / stock.position.avgPrice;
        
        // Sell if profit target hit or stop loss triggered
        if (currentReturn >= PROFIT_TARGET || currentReturn <= STOP_LOSS) {
          const sellPrice = ns.stock.sellStock(stock.sym, stock.position.shares);
          
          if (sellPrice > 0) {
            const profit = (sellPrice - stock.position.avgPrice) * stock.position.shares;
            const profitText = profit >= 0 ? `+${ns.formatNumber(profit)}` : ns.formatNumber(profit);
            const reason = currentReturn >= PROFIT_TARGET ? "PROFIT" : "STOP LOSS";
            
            ns.toast(`💰 ${reason}: ${stock.sym} | P&L: ${profitText}`, "success", 3000);
            actions.push(`✅ SELL ${stock.sym} | ${reason} | P&L: ${profitText}`);
          } else {
            actions.push(`❌ SELL FAILED ${stock.sym}`);
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
      const updatedCash = getCash();
      const budget = updatedCash * EXPOSURE;
      
      // Find buy candidates (no current position + positive momentum)
      const buyCandidates = stockData
        .filter(stock => stock.position.shares === 0 && stock.priceChange > 0)
        .slice(0, availableSlots);
      
      if (buyCandidates.length > 0 && budget > 0) {
        const budgetPerStock = budget / buyCandidates.length;
        
        for (const stock of buyCandidates) {
          const maxShares = ns.stock.getMaxShares(stock.sym);
          const affordableShares = Math.floor(budgetPerStock / stock.price);
          const sharesToBuy = Math.min(affordableShares, maxShares);
          
          if (sharesToBuy > 0) {
            const buyPrice = ns.stock.buyStock(stock.sym, sharesToBuy);
            
            if (buyPrice > 0) {
              const cost = buyPrice * sharesToBuy;
              actions.push(`✅ BUY ${stock.sym} | Shares: ${sharesToBuy} | Cost: ${ns.formatNumber(cost)} | Momentum: ${(stock.priceChange * 100).toFixed(2)}%`);
            } else {
              actions.push(`❌ BUY FAILED ${stock.sym}`);
            }
          }
        }
      } else {
        actions.push(`📊 No buy opportunities (Budget: ${ns.formatNumber(budget)})`);
      }
    }
    
    // ============================================================
    // 7) STATUS REPORT
    // ============================================================
    
    const finalCash = getCash();
    let totalInvested = 0;
    let totalUnrealized = 0;
    let activeStocks = [];
    
    for (const stock of stockData) {
      if (stock.position.shares > 0) {
        const invested = stock.position.avgPrice * stock.position.shares;
        const unrealized = getUnrealizedPnL(stock.sym);
        
        totalInvested += invested;
        totalUnrealized += unrealized;
        
        const pnlText = unrealized >= 0 ? `+${ns.formatNumber(unrealized)}` : ns.formatNumber(unrealized);
        const returnPct = ((stock.price - stock.position.avgPrice) / stock.position.avgPrice * 100).toFixed(1);
        activeStocks.push(`${stock.sym}: ${stock.position.shares} shares | P&L: ${pnlText} (${returnPct}%)`);
      }
    }
    
    const totalPortfolio = finalCash + totalInvested + totalUnrealized;
    
    ns.clearLog();
    ns.print("=================================================");
    ns.print("🤖 SIMPLE STOCK TRADER - STATUS");
    ns.print("=================================================");
    ns.print(`💰 Cash: ${ns.formatNumber(finalCash)}`);
    ns.print(`📈 Invested: ${ns.formatNumber(totalInvested)}`);
    ns.print(`📊 Unrealized P&L: ${totalUnrealized >= 0 ? '+' : ''}${ns.formatNumber(totalUnrealized)}`);
    ns.print(`💎 Total Portfolio: ${ns.formatNumber(totalPortfolio)}`);
    ns.print(`📋 Active Positions: ${activeStocks.length}/${MAX_POSITIONS}`);
    ns.print("=================================================");
    
    if (activeStocks.length > 0) {
      ns.print("🏢 ACTIVE POSITIONS:");
      for (const stock of activeStocks) {
        ns.print(`  ${stock}`);
      }
      ns.print("=================================================");
    }
    
    if (actions.length > 0) {
      ns.print("⚡ RECENT ACTIONS:");
      for (const action of actions) {
        ns.print(`  ${action}`);
      }
      ns.print("=================================================");
    }
    
    await ns.sleep(CYCLE_TIME);
  }
}