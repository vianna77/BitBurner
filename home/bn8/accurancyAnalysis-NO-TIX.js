// VERSION: 1.0.0
//
// PURPOSE:
// Analyzes stock market trends based on momentum and reversal patterns. It tracks if a stock
// tends to continue its price movement (momentum) or reverse it (reversal).
// This script does not use getForecast and relies only on price history.
//
// PARAMETERS: None
//
// DEPENDENCIES:
// Requires TIX API access for stock data functions (getPrice, getSymbols, etc.).

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
  };

  const symbols = ns.stock.getSymbols();
  const filteredStocks = [];
  const trackingData = {};

  // Phase 1: Monitor ALL stocks (No Volatility check)
  for (const sym of symbols) {
    filteredStocks.push(sym);
    trackingData[sym] = {
      lastPrice: ns.stock.getPrice(sym),
      lastMovement: null, // 'up', 'down', or 'stable'
      momentumTicks: 0,   // Ticks where movement was same as previous
      reversalTicks: 0,   // Ticks where movement was opposite of previous
      totalTicks: 0,      // Total ticks with a previous movement to compare to
      history: [],        // Sliding window of predictability
    };
  }

  ns.print(`${t()} Monitoring ${filteredStocks.length} stocks for momentum/reversal patterns (Filter: > 60% Accuracy).`);

  let iterations = 0;
  const REPORT_INTERVAL = 10; // 10 * 6s = 60 seconds

  while (true) {
    await ns.sleep(6000);
    iterations++;

    for (const sym of filteredStocks) {
      const data = trackingData[sym];
      const currentPrice = ns.stock.getPrice(sym);
      let currentMovement = 'stable';
      if (currentPrice > data.lastPrice) {
        currentMovement = 'up';
      } else if (currentPrice < data.lastPrice) {
        currentMovement = 'down';
      }

      // Only analyze if there was a previous movement and the current one is not stable
      if (data.lastMovement && data.lastMovement !== 'stable' && currentMovement !== 'stable') {
        data.totalTicks++;

        // Check for momentum or reversal
        if (currentMovement === data.lastMovement) {
          data.momentumTicks++;
        } else {
          data.reversalTicks++;
        }

        // For the sliding window, "success" means the stock followed its dominant long-term pattern
        const momentumRate = data.momentumTicks / data.totalTicks;
        let success = false;
        if (momentumRate > 0.5) { // If momentum is the dominant pattern
          if (currentMovement === data.lastMovement) {
            success = true;
          }
        } else { // If reversal is the dominant pattern
          if (currentMovement !== data.lastMovement) {
            success = true;
          }
        }
        data.history.push(success);
        if (data.history.length > 10) {
          data.history.shift();
        }
      }

      // Update state for the next tick
      data.lastPrice = currentPrice;
      if (currentMovement !== 'stable') {
        data.lastMovement = currentMovement;
      }
    }

    // Phase 2: Sorted Report every 10 ticks
    if (iterations >= REPORT_INTERVAL) {
      ns.print(`${t()} --- TREND REPORT (Momentum vs. Reversal) ---`);

      // Sort symbols by "predictability" (how strong the dominant trend is)
      const sortedList = [...filteredStocks].sort((a, b) => {
        const dataA = trackingData[a];
        const dataB = trackingData[b];
        const predictabilityA = dataA.totalTicks > 0 ? Math.max(dataA.momentumTicks, dataA.reversalTicks) / dataA.totalTicks : 0;
        const predictabilityB = dataB.totalTicks > 0 ? Math.max(dataB.momentumTicks, dataB.reversalTicks) / dataB.totalTicks : 0;
        return predictabilityB - predictabilityA;
      });

      for (const sym of sortedList) {
        const data = trackingData[sym];
        if (data.totalTicks > 0) {
          const momentumAccuracy = (data.momentumTicks / data.totalTicks) * 100;
          const reversalAccuracy = (data.reversalTicks / data.totalTicks) * 100;
          const dominantTrend = momentumAccuracy >= reversalAccuracy ? 'Momentum' : 'Reversal';
          const dominantAccuracy = Math.max(momentumAccuracy, reversalAccuracy);

          const windowCount = data.history.filter(val => val === true).length;
          const windowAccuracy = data.history.length > 0 ? (windowCount / data.history.length) * 100 : 0;

          if (dominantAccuracy > 60) {
            ns.print(`${t()} 🟡 ${sym} | Dominant: ${dominantTrend} (${dominantAccuracy.toFixed(1)}%) | Window: ${windowAccuracy.toFixed(1)}% | Mom: ${momentumAccuracy.toFixed(1)}% | Rev: ${reversalAccuracy.toFixed(1)}% (${data.totalTicks} ticks)`);

            // Check for Long positions in Reversal trends
            const [shares] = ns.stock.getPosition(sym);
            if (shares > 0 && dominantTrend === 'Reversal') {
              ns.run("beep.js", 1, `Check stock symbol ${sym}`);
            }
          }
        }
      }
      iterations = 0;
    }
  }
}
