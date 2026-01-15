// VERSION: 7.3.0
//
// PURPOSE: Stock market arbitrage using timing-based HACK/GROW cycles
// PARAMETERS: None
// DEPENDENCIES: Requires Stock Market API access and TIX API
// USAGE: run stock/stock-momentum-maker.js
//
// PORT USAGE:
// - Port 80: Receives {target: "servername"} from smartMomentumMaker
// - Port 85: Sends "HACK", "KILL" or "GROW" commands to control all smartMomentumMaker instances
//
// STRATEGY:
// 1. Send HACK command -> Monitor prices for 10min -> Track lowest prices and count new lows
// 2. Send KILL command -> Monitor for 1min -> Continue tracking if prices still falling
// 3. Buy top 5 stocks with most new lows and closest to lowest price (80% of cash)
// 4. Send GROW command -> Wait 10min for prices to rise
// 5. Sell all stocks
// 6. Repeat cycle

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.clearPort(80);

  if (!ns.stock.hasWSEAccount() || !ns.stock.hasTIXAPIAccess()) {
    ns.tprint("❌ ERROR: Need WSE Account and TIX API Access.");
    return;
  }

  ns.ui.openTail();
  ns.print("✅ Stock Market access confirmed.");
  ns.print("🔄 Starting timing-based trading strategy...");

  const symbolCache = new Map();
  const purchasePrices = new Map();
  const trackedSymbols = new Set();

  function getSymbolFromServer(serverName) {
    if (symbolCache.has(serverName)) {
      return symbolCache.get(serverName);
    }

    const serverInfo = ns.getServer(serverName);
    const orgName = serverInfo.organizationName;

    const allSymbols = ns.stock.getSymbols();
    for (const sym of allSymbols) {
      if (ns.stock.getOrganization(sym) === orgName) {
        symbolCache.set(serverName, sym);
        return sym;
      }
    }

    symbolCache.set(serverName, null);
    return null;
  }

  while (true) {
    // PHASE 1: Start HACK phase
    ns.clearPort(85);
    ns.writePort(85, "HACK");
    ns.print("📉 [HACK PHASE] Started - Monitoring prices for 10 minutes...");
    const lowestPrices = new Map();

    const hackStartTime = Date.now();
    const hackDuration = 10 * 60 * 1000; // 10 minutes

    // Monitor prices during HACK phase
    while (Date.now() - hackStartTime < hackDuration) {
      const portData = ns.readPort(80);
      if (portData !== "NULL PORT DATA") {
        try {
          const msg = JSON.parse(portData);
          const { target } = msg;
          const symbol = getSymbolFromServer(target);

          if (symbol) {
            trackedSymbols.add(symbol);
          }
        } catch (error) {
          ns.print(`❌ Error parsing port data: ${error}`);
        }
      }

      // Monitor all tracked symbols
      for (const symbol of trackedSymbols) {
        const price = ns.stock.getPrice(symbol);
        const existing = lowestPrices.get(symbol);

        if (!existing || price < existing.price) {
          const newCount = existing ? existing.count + 1 : 1;
          lowestPrices.set(symbol, { price: price, timestamp: Date.now(), count: newCount });
          ns.print(`📊 [${symbol}] New low #${newCount}: $${ns.formatNumber(price)}`);
        }
      }

      await ns.sleep(5000);
    }

    ns.print(`✅ [HACK PHASE] Complete - Tracked ${lowestPrices.size} stocks`);

    // PHASE 2: KILL phase - Stop hacking and monitor for 1 minute
    ns.clearPort(85);
    ns.writePort(85, "KILL");
    ns.print("⏸️  [KILL PHASE] Started - Monitoring for 1 minute...");

    const killStartTime = Date.now();
    const killDuration = 1 * 60 * 1000; // 1 minute

    while (Date.now() - killStartTime < killDuration) {
      for (const symbol of trackedSymbols) {
        const price = ns.stock.getPrice(symbol);
        const existing = lowestPrices.get(symbol);

        if (existing && price < existing.price) {
          const newCount = existing.count + 1;
          lowestPrices.set(symbol, { price: price, timestamp: Date.now(), count: newCount });
          ns.print(`📊 [${symbol}] New low #${newCount}: $${ns.formatNumber(price)}`);
        }
      }

      await ns.sleep(5000);
    }

    ns.print(`✅ [KILL PHASE] Complete`);

    // PHASE 3: Select top 5 stocks and buy
    ns.print("💰 [BUY PHASE] Selecting top 5 stocks with most new lows...");

    // Create array with volatility data
    const stockData = [];
    for (const [symbol, data] of lowestPrices.entries()) {
      const currentPrice = ns.stock.getPrice(symbol);
      const volatility = ((currentPrice - data.price) / data.price) * 100;
      stockData.push({ symbol, lowestPrice: data.price, currentPrice, volatility, count: data.count });
    }

    // Sort by count (descending), then by volatility (ascending)
    stockData.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.volatility - b.volatility;
    });

    // Select top 5
    const top5 = stockData.slice(0, 5);

    ns.print("✅ [SELECTION] Top 5 stocks:");
    for (const stock of top5) {
      ns.print(`  [${stock.symbol}] Count: ${stock.count} | Volatility: ${stock.volatility.toFixed(2)}% | Low: $${ns.formatNumber(stock.lowestPrice)} | Now: $${ns.formatNumber(stock.currentPrice)}`);
    }

    const playerMoney = ns.getServerMoneyAvailable("home");
    const budgetPerStock = (playerMoney * 0.8) / top5.length;

    let totalInvested = 0;
    for (const stock of top5) {
      const maxShares = ns.stock.getMaxShares(stock.symbol);
      const affordableShares = Math.floor(budgetPerStock / stock.currentPrice);
      const sharesToBuy = Math.min(maxShares, affordableShares);

      if (sharesToBuy > 0) {
        const buyPrice = ns.stock.buyStock(stock.symbol, sharesToBuy);
        if (buyPrice > 0) {
          purchasePrices.set(stock.symbol, buyPrice);
          const invested = buyPrice * sharesToBuy;
          totalInvested += invested;
          ns.print(`✅ [${stock.symbol}] BOUGHT ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)} | Count: ${stock.count} | Total: $${ns.formatNumber(invested)}`);
          ns.toast(`Bought ${stock.symbol}: ${sharesToBuy} shares`, "info", 3000);
        }
      }
    }

    ns.print(`💵 [BUY PHASE] Complete - Invested: $${ns.formatNumber(totalInvested)}`);

    // PHASE 4: Start GROW phase
    ns.clearPort(85);
    ns.writePort(85, "GROW");
    ns.print("📈 [GROW PHASE] Started - Waiting 10 minutes for prices to rise...");

    const growStartTime = Date.now();
    const growDuration = 10 * 60 * 1000; // 10 minutes

    while (Date.now() - growStartTime < growDuration) {
      await ns.sleep(10000);
    }

    ns.print("✅ [GROW PHASE] Complete");

    // PHASE 5: Sell all stocks
    ns.print("💸 [SELL PHASE] Liquidating all positions...");
    let totalProfit = 0;

    for (const [symbol, buyPrice] of purchasePrices.entries()) {
      const [shares] = ns.stock.getPosition(symbol);
      if (shares > 0) {
        const salePrice = ns.stock.sellStock(symbol, shares);
        if (salePrice > 0) {
          const profit = (salePrice - buyPrice) * shares;
          const profitPercent = ((salePrice - buyPrice) / buyPrice) * 100;
          totalProfit += profit;

          const profitEmoji = profit >= 0 ? "✅" : "❌";
          const profitSign = profit >= 0 ? "+" : "";
          ns.print(`${profitEmoji} [${symbol}] SOLD ${shares} shares @ $${ns.formatNumber(salePrice)} | ${profitSign}$${ns.formatNumber(profit)} (${profitPercent.toFixed(2)}%)`);
          ns.toast(`Sold ${symbol}: ${profitSign}$${ns.formatNumber(profit)}`, profit >= 0 ? "success" : "error", 3000);
        }
      }
    }

    purchasePrices.clear();
    const profitEmoji = totalProfit >= 0 ? "🎉" : "😢";
    const profitSign = totalProfit >= 0 ? "+" : "";
    ns.print(`${profitEmoji} [CYCLE COMPLETE] Total Profit: ${profitSign}$${ns.formatNumber(totalProfit)}`);
    ns.toast(`Cycle Complete: ${profitSign}$${ns.formatNumber(totalProfit)}`, totalProfit >= 0 ? "success" : "error", 5000);

    ns.print("🔄 Starting new cycle in 5 seconds...");
    await ns.sleep(5000);
  }
}
