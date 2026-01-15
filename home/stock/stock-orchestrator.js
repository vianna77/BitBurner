// VERSION: 1.2.0
//
// PURPOSE: Orchestrate hack/grow cycles on p-servers with long/short stock trading
// PARAMETERS: pServer - The p-server name (e.g., "p-joesguns")
// USAGE: run stock/stock-orchestrator.js <p-server>
//
// STRATEGY:
// - Maps p-server → target → symbol (e.g., p-joesguns → joesguns → JGN)
// - Observes price for 1 hour to find min/max
// - Starts with LONG+GROW if closer to min, SHORT+HACK if closer to max
// - Price near MAX: Sell LONG → Buy SHORT → Run HACK
// - Price near MIN: Sell SHORT → Buy LONG → Run GROW

export function autocomplete(data, args) {
  if (args.length === 1) {
    return data.servers.filter(s => s.startsWith('p-'));
  }
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length === 0) {
    ns.tprint("❌ USAGE: stock-orchestrator.js <p-server>");
    return;
  }

  if (!ns.stock.hasWSEAccount() || !ns.stock.hasTIXAPIAccess()) {
    ns.tprint("❌ ERROR: Need WSE Account and TIX API Access.");
    return;
  }

  const pServer = String(ns.args[0]);

  // Extract target from p-server name (e.g., "p-joesguns" → "joesguns")
  if (!pServer.startsWith('p-')) {
    ns.tprint("❌ ERROR: Server must start with 'p-'");
    return;
  }

  const target = pServer.substring(2);

  if (!ns.serverExists(target)) {
    ns.tprint(`❌ ERROR: Target server ${target} does not exist`);
    return;
  }

  // Get symbol from target
  const serverInfo = ns.getServer(target);
  const orgName = serverInfo.organizationName;
  const allSymbols = ns.stock.getSymbols();

  let symbol = null;
  for (const sym of allSymbols) {
    if (ns.stock.getOrganization(sym) === orgName) {
      symbol = sym;
      break;
    }
  }

  if (!symbol) {
    ns.tprint(`❌ ERROR: No stock symbol found for ${target}`);
    return;
  }

  ns.tprint(`🎯 Orchestrator started: ${pServer} → ${target} → ${symbol}`);

  // PHASE 1: Observe for 1 hour to find min/max prices
  ns.print("🔍 [OBSERVATION] Starting 1-hour price observation...");

  let minPrice = Infinity;
  let maxPrice = 0;
  const observationStart = Date.now();
  const observationDuration = 60 * 60 * 1000; // 1 hour

  while (Date.now() - observationStart < observationDuration) {
    const price = ns.stock.getPrice(symbol);

    if (price < minPrice) {
      minPrice = price;
      ns.print(`📉 [${symbol}] New MIN: $${ns.formatNumber(minPrice)}`);
    }
    if (price > maxPrice) {
      maxPrice = price;
      ns.print(`📈 [${symbol}] New MAX: $${ns.formatNumber(maxPrice)}`);
    }

    const elapsed = Date.now() - observationStart;
    const remaining = observationDuration - elapsed;
    ns.print(`🕒 [OBSERVATION] ${Math.floor(remaining / 60000)} minutes remaining | Min: $${ns.formatNumber(minPrice)} | Max: $${ns.formatNumber(maxPrice)}`);

    await ns.sleep(10000);
  }

  const priceRange = maxPrice - minPrice;

  // Determine starting position based on current price
  const currentPrice = ns.stock.getPrice(symbol);
  const distanceToMin = currentPrice - minPrice;
  const distanceToMax = maxPrice - currentPrice;

  ns.print(`✅ [OBSERVATION] Complete`);
  ns.print(`  Min: $${ns.formatNumber(minPrice)} | Max: $${ns.formatNumber(maxPrice)} | Current: $${ns.formatNumber(currentPrice)}`);
  ns.print(`  Distance to MIN: $${ns.formatNumber(distanceToMin)} | Distance to MAX: $${ns.formatNumber(distanceToMax)}`);

  const CONTINUOUS_SCRIPT = "smart/continuous-action.js";
  let currentMode = "";

  // Start with appropriate position
  if (distanceToMin < distanceToMax) {
    ns.print(`📈 [DECISION] Closer to MIN - Starting with LONG + GROW`);

    const playerMoney = ns.getServerMoneyAvailable("home");
    const maxShares = ns.stock.getMaxShares(symbol);
    const affordableShares = Math.floor((playerMoney * 0.8) / currentPrice);
    const sharesToBuy = Math.min(maxShares, affordableShares);

    if (sharesToBuy > 0) {
      const buyPrice = ns.stock.buyStock(symbol, sharesToBuy);
      if (buyPrice > 0) {
        ns.print(`✅ [${symbol}] BOUGHT LONG ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)}`);
      }
    }

    ns.exec(CONTINUOUS_SCRIPT, pServer, 1, target, "grow");
    currentMode = "grow";
    ns.print(`🚀 [${pServer}] Started continuous GROW on ${target}`);
  } else {
    ns.print(`📉 [DECISION] Closer to MAX - Starting with SHORT + HACK`);

    const playerMoney = ns.getServerMoneyAvailable("home");
    const maxShares = ns.stock.getMaxShares(symbol);
    const affordableShares = Math.floor((playerMoney * 0.8) / currentPrice);
    const sharesToBuy = Math.min(maxShares, affordableShares);

    if (sharesToBuy > 0) {
      const buyPrice = ns.stock.buyShort(symbol, sharesToBuy);
      if (buyPrice > 0) {
        ns.print(`✅ [${symbol}] BOUGHT SHORT ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)}`);
      }
    }

    ns.exec(CONTINUOUS_SCRIPT, pServer, 1, target, "hack");
    currentMode = "hack";
    ns.print(`🚀 [${pServer}] Started continuous HACK on ${target}`);
  }

  while (true) {
    const price = ns.stock.getPrice(symbol);
    const distanceToMin = price - minPrice;
    const distanceToMax = maxPrice - price;
    const percentFromMin = (distanceToMin / priceRange) * 100;
    const percentFromMax = (distanceToMax / priceRange) * 100;

    ns.print(`📊 [${symbol}] Price: $${ns.formatNumber(price)} | From MIN: ${percentFromMin.toFixed(1)}% | From MAX: ${percentFromMax.toFixed(1)}%`);

    // Update historical min/max if new extremes are reached
    if (price < minPrice) {
      minPrice = price;
      ns.print(`📉 [${symbol}] NEW HISTORICAL MIN: $${ns.formatNumber(minPrice)}`);
    }
    if (price > maxPrice) {
      maxPrice = price;
      ns.print(`📈 [${symbol}] NEW HISTORICAL MAX: $${ns.formatNumber(maxPrice)}`);
    }

    // Check if price is near MAX (within 5% of max)
    if (percentFromMax <= 5 && currentMode !== "hack") {
      ns.print(`📈 [${symbol}] Price near MAX - Switching to HACK mode`);

      // Sell all LONG positions
      const [longShares] = ns.stock.getPosition(symbol);
      if (longShares > 0) {
        const salePrice = ns.stock.sellStock(symbol, longShares);
        ns.print(`✅ [${symbol}] SOLD LONG ${longShares} shares @ $${ns.formatNumber(salePrice)}`);
      }

      // Buy SHORT positions
      const playerMoney = ns.getServerMoneyAvailable("home");
      const maxShares = ns.stock.getMaxShares(symbol);
      const affordableShares = Math.floor((playerMoney * 0.8) / price);
      const sharesToBuy = Math.min(maxShares, affordableShares);

      if (sharesToBuy > 0) {
        const buyPrice = ns.stock.buyShort(symbol, sharesToBuy);
        if (buyPrice > 0) {
          ns.print(`✅ [${symbol}] BOUGHT SHORT ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)}`);
        }
      }

      // Start HACK on p-server
      ns.exec(CONTINUOUS_SCRIPT, pServer, 1, target, "hack");
      currentMode = "hack";
      ns.print(`🚀 [${pServer}] Started continuous HACK on ${target}`);
    }
    // Check if price is near MIN (within 5% of min)
    else if (percentFromMin <= 5 && currentMode !== "grow") {
      ns.print(`📉 [${symbol}] Price near MIN - Switching to GROW mode`);

      // Sell all SHORT positions
      const [, , shortShares] = ns.stock.getPosition(symbol);
      if (shortShares > 0) {
        const salePrice = ns.stock.sellShort(symbol, shortShares);
        ns.print(`✅ [${symbol}] SOLD SHORT ${shortShares} shares @ $${ns.formatNumber(salePrice)}`);
      }

      // Buy LONG positions
      const playerMoney = ns.getServerMoneyAvailable("home");
      const maxShares = ns.stock.getMaxShares(symbol);
      const affordableShares = Math.floor((playerMoney * 0.8) / price);
      const sharesToBuy = Math.min(maxShares, affordableShares);

      if (sharesToBuy > 0) {
        const buyPrice = ns.stock.buyStock(symbol, sharesToBuy);
        if (buyPrice > 0) {
          ns.print(`✅ [${symbol}] BOUGHT LONG ${sharesToBuy} shares @ $${ns.formatNumber(buyPrice)}`);
        }
      }

      // Start GROW on p-server
      ns.exec(CONTINUOUS_SCRIPT, pServer, 1, target, "grow");
      currentMode = "grow";
      ns.print(`🚀 [${pServer}] Started continuous GROW on ${target}`);
    }

    await ns.sleep(10000);
  }
}
