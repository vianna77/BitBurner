// VERSION 1.1.0
//
// Stock Price Monitor - Detects price trends
//
// PURPOSE:
//   Monitors all stock symbols and tracks their price history.
//   Alerts when a stock price changes significantly compared to the baseline (first recorded price).
//
// PARAMETERS:
//   threshold (number, default: 5) - Percentage change to trigger alert (absolute value)
//   interval (number, default: 6000) - Time between checks in milliseconds
//   historySize (number, default: 10) - Number of historical prices to keep per symbol
//
// USAGE:
//   run stock-monitor.js
//   run stock-monitor.js 3 5000 20

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.ui.openTail();

  const threshold = ns.args[0] || 5;
  const interval = ns.args[1] || 6000;
  const historySize = ns.args[2] || 10;

  const history = {};
  const symbols = ns.stock.getSymbols();

  ns.tprint(`📊 Starting stock monitor - Threshold: ${threshold}%, Interval: ${interval}ms`);

  while (true) {
    for (const sym of symbols) {
      const price = ns.stock.getPrice(sym);

      if (!history[sym]) {
        history[sym] = [];
      }

      if (history[sym].length > 0) {
        const firstPrice = history[sym][0];
        const change = ((price - firstPrice) / firstPrice) * 100;

        if (Math.abs(change) >= threshold) {
          if (change > 0) {
            ns.print(`🚀 ${sym} surging: +${change.toFixed(2)}% ($${firstPrice.toFixed(2)} → $${price.toFixed(2)})`);
          } else {
            ns.print(`📉 ${sym} dropping: ${change.toFixed(2)}% ($${firstPrice.toFixed(2)} → $${price.toFixed(2)})`);
          }
        }
      }

      history[sym].push(price);
      if (history[sym].length > historySize) {
        history[sym].shift();
      }
    }

    await ns.sleep(interval);
  }
}
