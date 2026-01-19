/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
  };

  const symbols = ns.stock.getSymbols();
  const filteredStocks = [];
  const trackingData = {};

  // Phase 1: Filter by Volatility < 0.7%
  for (const sym of symbols) {
    const vol = ns.stock.getVolatility(sym);
    if (vol < 0.007) {
      filteredStocks.push(sym);
      trackingData[sym] = {
        history: [],
        lastPrice: ns.stock.getPrice(sym),
        lastForecast: ns.stock.getForecast(sym),
        totalSuccesses: 0,
        totalTicks: 0
      };
    }
  }

  ns.print(`${t()} Monitoring ${filteredStocks.length} stocks with volatility < 0.7%`);

  let iterations = 0;
  const REPORT_INTERVAL = 10; // 10 * 6s = 60 seconds

  while (true) {
    await ns.sleep(6000);
    iterations++;
    for (const sym of filteredStocks) {
      const currentPrice = ns.stock.getPrice(sym);
      const currentForecast = ns.stock.getForecast(sym);
      const data = trackingData[sym];
      const priceIncreased = currentPrice > data.lastPrice;
      const priceDecreased = currentPrice < data.lastPrice;

      let wasAccurate = false;
      if (data.lastForecast > 0.5 && priceIncreased) {
        wasAccurate = true;
      }
      else if (data.lastForecast < 0.5 && priceDecreased) {
        wasAccurate = true;
      }

      // Update Global Statistics
      data.totalTicks++;
      if (wasAccurate) {
        data.totalSuccesses++;
      }

      // Update Sliding Window (10 positions)
      data.history.push(wasAccurate);
      if (data.history.length > 10) {
        data.history.shift();
      }

      data.lastPrice = currentPrice;
      data.lastForecast = currentForecast;

    }

    // Phase 2: Sorted Report every 10 ticks
    if (iterations >= REPORT_INTERVAL) {
      ns.print(`${t()} --- RELIABILITY REPORT (Sorted by Lifetime) ---`);

      // Sort symbols by Lifetime Accuracy descending
      const sortedList = [...filteredStocks].sort((a, b) => {
        const accA = trackingData[a].totalSuccesses / trackingData[a].totalTicks;
        const accB = trackingData[b].totalSuccesses / trackingData[b].totalTicks;
        return accB - accA;

      });

      for (const sym of sortedList) {
        const data = trackingData[sym];
        if (data.history.length > 0) {
          const windowCount = data.history.filter(val => val === true).length;
          const windowAccuracy = (windowCount / data.history.length) * 100;
          const lifetimeAccuracy = (data.totalSuccesses / data.totalTicks) * 100;
          const statusEmoji = windowAccuracy >= 70 ? "✅" : "❌";
          ns.print(`${t()} ${statusEmoji} ${sym} | Lifetime: ${lifetimeAccuracy.toFixed(1)}% | Window: ${windowAccuracy.toFixed(1)}% (${data.totalSuccesses}/${data.totalTicks} ticks)`);
        }
      }
      iterations = 0;
    }
  }
}
