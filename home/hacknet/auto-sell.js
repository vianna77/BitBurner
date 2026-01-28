// VERSION: 1.0.0
/**
 * Auto Sell Hashes Daemon
 * Monitors hash capacity and sells 95% of hashes when near max capacity (95%).
 *
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // Configuration
  const TRIGGER_THRESHOLD = 0.95; // Trigger when 95% full
  const SELL_PERCENT = 0.95;      // Sell 95% of current hashes

  ns.print("=======================================");
  ns.print("      AUTO SELL HASHES DAEMON");
  ns.print("=======================================");
  ns.print(`Trigger: > ${(TRIGGER_THRESHOLD * 100).toFixed(0)}% Capacity`);
  ns.print(`Action:  Sell ${(SELL_PERCENT * 100).toFixed(0)}% of Hashes`);

  while (true) {
    const capacity = ns.hacknet.hashCapacity();

    // If we have no capacity (no servers), wait longer
    if (capacity === 0) {
      await ns.sleep(5000);
      continue;
    }

    const currentHashes = ns.hacknet.numHashes();

    // Check if we are near the limit
    if (currentHashes >= capacity * TRIGGER_THRESHOLD) {
      const cost = ns.hacknet.hashCost("Sell for Money");

      if (cost > 0) {
        // Calculate how many times we can sell
        const hashesToSpend = currentHashes * SELL_PERCENT;
        const count = Math.floor(hashesToSpend / cost);

        if (count > 0) {
          // Note: We pass undefined as the second argument (target)
          // because it's required to reach the third argument (count).
          ns.hacknet.spendHashes("Sell for Money", undefined, count);
          ns.print(`💸 Sold ${count}x batches. Hashes: ${ns.formatNumber(currentHashes)} -> ${ns.formatNumber(ns.hacknet.numHashes())}`);
        }
      }
    }

    await ns.sleep(1000);
  }
}
