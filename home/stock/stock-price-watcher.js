/**
 * @version 1.0.0
 * @description
 * This script monitors stock prices in real-time, tracking the last 10 price points for each stock symbol.
 * Every 10 ticks (60 seconds), it analyzes this historical data. If a stock's price has
 * increased more than 6 times within that 10-tick window, it is flagged as having an
 * upward trend. A table is displayed showing these trending stocks, including the symbol,
 * the number of price increases, the first price in the window, and the most recent price.
 *
 * @param {NS} ns - The Netscript API.
 */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();
  ns.ui.resizeTail(1000, 443);
  ns.ui.moveTail(600, 50);
  ns.clearLog();

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
  };

  const symbols = ns.stock.getSymbols();
  const priceHistory = new Map();
  symbols.forEach(sym => priceHistory.set(sym, []));

  // This map now stores stocks we've detected we own, and their fixed starting price.
  const ownedStocks = new Map();
  let tickCounter = 0;
  const ANALYSIS_INTERVAL = 10;

  ns.print(`${t()} 📈 Starting stock price watcher...`);
  ns.print(`${t()} Portfolio will be scanned every ${ANALYSIS_INTERVAL * 6} seconds.`);

  while (true) {
    // 1. Update prices for all symbols
    for (const sym of symbols) {
      const price = ns.stock.getPrice(sym);
      const history = priceHistory.get(sym);
      history.push(price);
      if (history.length > ANALYSIS_INTERVAL) {
        history.shift();
      }
    }

    tickCounter++;

    if (tickCounter >= ANALYSIS_INTERVAL) {
      // -- New Logic: Dynamically update portfolio every cycle --
      const currentPortfolio = new Set();
      for (const sym of symbols) {
        if (ns.stock.getPosition(sym)[0] > 0) {
          currentPortfolio.add(sym);
        }
      }

      // Check for newly purchased stocks
      for (const sym of currentPortfolio) {
        if (!ownedStocks.has(sym)) {
          const initialPrice = ns.stock.getPrice(sym);
          ownedStocks.set(sym, { initialPrice });
          ns.print(`${t()} ✅ Detected new purchase of ${sym}. Locking price at ${ns.formatNumber(initialPrice, 2)}`);
        }
      }

      // Check for sold stocks
      for (const sym of ownedStocks.keys()) {
        if (!currentPortfolio.has(sym)) {
          ns.print(`${t()} 🟡 Detected sale of ${sym}. It will no longer be pinned.`);
          ownedStocks.delete(sym);
        }
      }

      const reportableStocks = [];

      for (const sym of symbols) {
        const history = priceHistory.get(sym);
        if (history.length < ANALYSIS_INTERVAL) {
          continue; // Not enough data
        }

        let riseCount = 0;
        for (let i = 1; i < history.length; i++) {
          if (history[i] > history[i - 1]) {
            riseCount++;
          }
        }

        const isOwnedAndTracked = ownedStocks.has(sym);
        const currentPrice = history[history.length - 1];

        const startPrice = isOwnedAndTracked ? ownedStocks.get(sym).initialPrice : history[0];
        const percentGain = ((currentPrice / startPrice) - 1) * 100;

        if (isOwnedAndTracked) {
          reportableStocks.push({
            symbol: sym,
            rises: riseCount,
            startPrice: startPrice,
            endPrice: currentPrice,
            percentGain: percentGain,
          });
        } else if (riseCount > 6) {
          reportableStocks.push({
            symbol: sym,
            rises: riseCount,
            startPrice: startPrice,
            endPrice: currentPrice,
            percentGain: percentGain,
          });
        }
      }

      // 3. Display the results
      ns.clearLog();
      ns.print(`${t()} 📊 Stock Trend Analysis (Last ${ANALYSIS_INTERVAL} Ticks)`);
      ns.print("=".repeat(80));

      if (reportableStocks.length > 0) {
        reportableStocks.sort((a, b) => b.percentGain - a.percentGain);

        ns.print(
          "| Symbol | Rises | Start Price | End Price   | % Gain      |"
        );
        ns.print(
          "|--------|-------|-------------|-------------|-------------|"
        );

        for (const stock of reportableStocks) {
          const symStr = (ownedStocks.has(stock.symbol) ? '✅ ' : '  ') + stock.symbol.padEnd(6);
          const risesStr = stock.rises.toString().padEnd(5);
          const startPriceStr = ns.formatNumber(stock.startPrice, 2, 1000).padEnd(11);
          const endPriceStr = ns.formatNumber(stock.endPrice, 2, 1000).padEnd(11);
          const gainStr = ((stock.percentGain > 0 ? '+' : '') + ns.formatNumber(stock.percentGain, 2) + '%').padStart(11);

          ns.print(
            `| ${symStr} | ${risesStr} | ${startPriceStr} | ${endPriceStr} | ${gainStr} |`
          );
        }
      } else {
        ns.print("No significant trends or owned stocks to report in the last cycle.");
      }
      ns.print("=".repeat(80));

      tickCounter = 0; // Reset counter
    }

    await ns.sleep(6000); // Wait for the next market tick
  }
}
