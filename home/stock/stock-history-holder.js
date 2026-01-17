// VERSION: 2.2.3
//
// PURPOSE: Track stock price history and trade autonomously based on min/max patterns
// PARAMETERS: None (autonomous operation)
// USAGE: run stock/stock-history-holder.js
//
// STRATEGY:
// - Collects 30 minutes of price data before trading (DEBUG MODE)
// - Buy SHORT when price approaches historical MAX and stabilizes for 12s
// - Buy LONG when price approaches historical MIN and stabilizes for 12s
// - Sell only with 5%+ profit

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const symbols = ns.stock.getSymbols();
  const history = {};
  const signals = {};
  const WINDOW = 60 * 60 * 1000;
  const COLLECT_TIME = 10 * 60 * 1000; // DEBUG: 10 minutes
  const THRESHOLD = 0.05;
  const MIN_PROFIT = 0.05;
  const CONFIRM_TIME = 12000;

  for (const sym of symbols) {
    history[sym] = { prices: [], position: null, buyPrice: 0, lastMin: 0, lastMax: 0 };
  }

  ns.print(`🔍 Collecting 30 minutes of price data for ${symbols.length} stocks...`);

  const collectStart = Date.now();
  while (Date.now() - collectStart < COLLECT_TIME) {
    const now = Date.now();
    for (const sym of symbols) {
      const price = ns.stock.getPrice(sym);
      history[sym].prices.push({ price, time: now });
    }
    const remaining = Math.floor((COLLECT_TIME - (Date.now() - collectStart)) / 60000);
    ns.print(`🕒 ${remaining} min remaining`);

    for (const sym of symbols) {
      if (history[sym].prices.length > 0) {
        const prices = history[sym].prices.map(p => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        ns.print(`  [${sym}] MIN: $${ns.formatNumber(min)} | MAX: $${ns.formatNumber(max)}`);
      }
    }

    await ns.sleep(10000);
  }

  ns.print(`✅ Data collection complete. Starting trading...`);

  for (const sym of symbols) {
    const prices = history[sym].prices.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    ns.print(`📊 [${sym}] MIN: $${ns.formatNumber(min)} | MAX: $${ns.formatNumber(max)}`);
  }

  while (true) {
    const now = Date.now();

    for (const sym of symbols) {
      const price = ns.stock.getPrice(sym);
      const h = history[sym];

      h.prices.push({ price, time: now });
      h.prices = h.prices.filter(p => now - p.time < WINDOW);

      const min = Math.min(...h.prices.map(p => p.price));
      const max = Math.max(...h.prices.map(p => p.price));
      const range = max - min;

      const [longShares, longAvg, shortShares, shortAvg] = ns.stock.getPosition(sym);

      if (min !== h.lastMin || max !== h.lastMax) {
        let msg = `📊 [${sym}] MIN: $${ns.formatNumber(min)}`;
        if (longShares > 0) {
          const profitAtMin = ((min - longAvg) / longAvg * 100).toFixed(1);
          msg += ` (${profitAtMin}%)`;
        }
        msg += ` | MAX: $${ns.formatNumber(max)}`;
        if (shortShares > 0) {
          const profitAtMax = ((shortAvg - max) / shortAvg * 100).toFixed(1);
          msg += ` (${profitAtMax}%)`;
        }
        ns.print(msg);
        h.lastMin = min;
        h.lastMax = max;
      }
      const distToMax = (max - price) / range;
      const distToMin = (price - min) / range;

      if (longShares > 0 && distToMax <= THRESHOLD && price >= longAvg * (1 + MIN_PROFIT)) {
        ns.stock.sellStock(sym, longShares);
        const profit = ((price - longAvg) / longAvg * 100).toFixed(1);
        const distPct = (distToMax * 100).toFixed(1);
        const msg = `✅ [${sym}] SOLD LONG ${longShares} @ $${ns.formatNumber(price)} (+${profit}%) | MAX: $${ns.formatNumber(max)} (${distPct}% away)`;
        ns.print(msg);
        ns.toast(msg, "success", 15000);
        h.position = null;
      }

      if (shortShares > 0 && distToMin <= THRESHOLD && price <= shortAvg * (1 - MIN_PROFIT)) {
        ns.stock.sellShort(sym, shortShares);
        const profit = ((shortAvg - price) / shortAvg * 100).toFixed(1);
        const distPct = (distToMin * 100).toFixed(1);
        const msg = `✅ [${sym}] SOLD SHORT ${shortShares} @ $${ns.formatNumber(price)} (+${profit}%) | MIN: $${ns.formatNumber(min)} (${distPct}% away)`;
        ns.print(msg);
        ns.toast(msg, "success", 15000);
        h.position = null;
      }

      if (distToMax <= THRESHOLD && h.position !== "short" && shortShares === 0) {
        if (!signals[sym] || signals[sym].type !== "short") {
          signals[sym] = { type: "short", time: now, price };
        } else if (price > signals[sym].price) {
          signals[sym] = { type: "short", time: now, price };
        } else if (now - signals[sym].time >= CONFIRM_TIME) {
          const money = ns.getServerMoneyAvailable("home");
          const shares = Math.min(ns.stock.getMaxShares(sym), Math.floor(money * 0.1 / price));
          if (shares > 0 && ns.stock.buyShort(sym, shares) > 0) {
            h.position = "short";
            h.buyPrice = price;
            const distPct = (distToMax * 100).toFixed(1);
            const msg = `📉 [${sym}] BOUGHT SHORT ${shares} @ $${ns.formatNumber(price)} | MAX: $${ns.formatNumber(max)} (${distPct}% away)`;
            ns.print(msg);
            ns.toast(msg, "info", 15000);
            signals[sym] = null;
          }
        }
      } else if (distToMin <= THRESHOLD && h.position !== "long" && longShares === 0) {
        if (!signals[sym] || signals[sym].type !== "long") {
          signals[sym] = { type: "long", time: now, price };
        } else if (price < signals[sym].price) {
          signals[sym] = { type: "long", time: now, price };
        } else if (now - signals[sym].time >= CONFIRM_TIME) {
          const money = ns.getServerMoneyAvailable("home");
          const shares = Math.min(ns.stock.getMaxShares(sym), Math.floor(money * 0.1 / price));
          if (shares > 0 && ns.stock.buyStock(sym, shares) > 0) {
            h.position = "long";
            h.buyPrice = price;
            const distPct = (distToMin * 100).toFixed(1);
            const msg = `📈 [${sym}] BOUGHT LONG ${shares} @ $${ns.formatNumber(price)} | MIN: $${ns.formatNumber(min)} (${distPct}% away)`;
            ns.print(msg);
            ns.toast(msg, "info", 15000);
            signals[sym] = null;
          }
        }
      } else {
        signals[sym] = null;
      }
    }

    await ns.sleep(500);
  }
}
