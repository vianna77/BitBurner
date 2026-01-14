// VERSION: 6.0.0
//
// PURPOSE: Stock market arbitrage by listening to smartMomentumMaker notifications
// PARAMETERS: None
// DEPENDENCIES: Requires Stock Market API access and TIX API
// USAGE: run stock/stock-momentum-maker.js
//
// PORT USAGE:
// - Port 80: Receives {target: "servername", phase: "HACK"/"GROW"} from smartMomentumMaker
//
// STRATEGY:
// 1. Listen to port 80 for phase notifications
// 2. GROW phase -> Buy shares if not holding any (price will rise)
// 3. HACK phase -> Sell shares only if profit >= 5% (price will drop)
// 4. Profit from predictable price movements

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
  ns.print("📡 Listening on port 80 for phase notifications...");

  const symbolCache = new Map();
  const purchasePrices = new Map();

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
    const portData = ns.readPort(80);

    if (portData !== "NULL PORT DATA") {
      try {
        const msg = JSON.parse(portData);
        const { target, phase } = msg;
        const symbol = getSymbolFromServer(target);

        if (!symbol) {
          ns.print(`📨 Received: ${target} (${phase}) - No stock symbol found, ignoring.`);
          await ns.sleep(100);
          continue;
        }

        const [shares, avgPrice] = ns.stock.getPosition(symbol);
        const price = ns.stock.getPrice(symbol);

        if (phase === "GROW") {
          if (shares > 0) {
            ns.print(`📈 [${symbol}] GROW phase - Already holding ${shares} shares, ignoring buy`);
          } else {
            const maxShares = ns.stock.getMaxShares(symbol);
            const playerMoney = ns.getServerMoneyAvailable("home");
            const affordableShares = Math.floor(playerMoney * 0.8 / price);
            const sharesToBuy = Math.min(maxShares, affordableShares);

            if (sharesToBuy > 0) {
              const buyPrice = ns.stock.buyStock(symbol, sharesToBuy);
              if (buyPrice > 0) {
                purchasePrices.set(symbol, buyPrice);
                ns.print(`✅ [${symbol}] BOUGHT ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)}`);
                ns.toast(`Bought ${symbol}: ${sharesToBuy} shares`, "info", 5000);
              }
            } else {
              ns.print(`📈 [${symbol}] GROW phase - Insufficient funds`);
            }
          }
        } else if (phase === "HACK") {
          if (shares > 0) {
            const buyPrice = purchasePrices.get(symbol) || avgPrice;
            const profitPercent = ((price - buyPrice) / buyPrice) * 100;

            if (profitPercent >= 5) {
              const salePrice = ns.stock.sellStock(symbol, shares);
              if (salePrice > 0) {
                const profit = (salePrice - buyPrice) * shares;
                purchasePrices.delete(symbol);
                ns.print(`✅ [${symbol}] SOLD ${shares} shares @ $${ns.formatNumber(salePrice)} | Profit: +${ns.formatNumber(profit)} (${profitPercent.toFixed(2)}%)`);
                ns.toast(`Sold ${symbol}: +${ns.formatNumber(profit)}`, "success", 5000);
              }
            } else {
              ns.print(`📉 [${symbol}] HACK phase - Profit ${profitPercent.toFixed(2)}% < 5%, holding`);
            }
          } else {
            ns.print(`📉 [${symbol}] HACK phase - No shares to sell`);
          }
        }
      } catch (error) {
        ns.print(`❌ Error parsing port data: ${error}`);
      }
    }

    await ns.sleep(100);
  }
}
