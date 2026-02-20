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

  let tickCounter = 0;
  const ANALYSIS_INTERVAL = 10; // Analyze every 10 ticks

  ns.print(`${t()} 📈 Starting stock price watcher...`);
  ns.print(`${t()} Will analyze data every ${ANALYSIS_INTERVAL} ticks (${ANALYSIS_INTERVAL * 6} seconds).`);

  while (true) {
    // 1. Update prices for all symbols
    for (const sym of symbols) {
      const price = ns.stock.getPrice(sym);
      const history = priceHistory.get(sym);
      history.push(price);
      if (history.length > ANALYSIS_INTERVAL) {
        history.shift(); // Keep only the last 10 prices
      }
    }

    tickCounter++;

    // 2. Analyze and report every 10 ticks
    if (tickCounter >= ANALYSIS_INTERVAL) {
      const risingStocks = [];

      for (const sym of symbols) {
        const history = priceHistory.get(sym);
        if (history.length < ANALYSIS_INTERVAL) {
          continue; // Not enough data to analyze
        }

        let riseCount = 0;
        for (let i = 1; i < history.length; i++) {
          if (history[i] > history[i - 1]) {
            riseCount++;
          }
        }

        if (riseCount > 6) {
          risingStocks.push({
            symbol: sym,
            rises: riseCount,
            startPrice: history[0],
            endPrice: history[history.length - 1],
          });
        }
      }

      // 3. Display the results in a table
      ns.clearLog();
      ns.print(`${t()} 📊 Stock Trend Analysis (Last ${ANALYSIS_INTERVAL} Ticks)`);
      ns.print("=".repeat(60));

      if (risingStocks.length > 0) {
        risingStocks.sort((a, b) => b.rises - a.rises); // Sort by most rises

        ns.print(
          "| Symbol | Rises | Start Price | End Price   |"
        );
        ns.print(
          "|--------|-------|-------------|-------------|"
        );

        for (const stock of risingStocks) {
          const symStr = stock.symbol.padEnd(6);
          const risesStr = stock.rises.toString().padEnd(5);
          const startPriceStr = ns.formatNumber(stock.startPrice, 2, 1000).padEnd(11);
          const endPriceStr = ns.formatNumber(stock.endPrice, 2, 1000).padEnd(11);

          ns.print(
            `| ${symStr} | ${risesStr} | ${startPriceStr} | ${endPriceStr} |`
          );
        }
      } else {
        ns.print("No significant upward trends detected in the last cycle.");
      }
       ns.print("=".repeat(60));

      tickCounter = 0; // Reset counter after analysis
    }

    await ns.sleep(6000); // Wait for the next market tick
  }
}
