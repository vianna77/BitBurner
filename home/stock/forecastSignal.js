/**
 * VERSION: 1.0.0
 * Stock Forecast Signal Provider
 *
 * DESCRIPTION:
 * Monitors a specific stock symbol's forecast to determine market trend.
 * - Forecast > 0.5 (Bullish) -> Sends "GROW" command.
 * - Forecast < 0.5 (Bearish) -> Sends "HACK" command.
 *
 * LOGIC:
 * Checks the forecast every 6 seconds (standard stock tick).
 * Only writes to Port 85 if the trend changes (prevents spamming the port).
 * Designed to control smartMomentumMaker.js.
 *
 * PARAMETERS:
 * - symbol: The stock symbol to analyze (e.g., JGN, ECORP).
 *
 * PORT USAGE:
 * - Port 85: Output. Sends "GROW" or "HACK".
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length === 0) {
    ns.tprint("❌ USAGE: run stock/forecastSignal.js <symbol>");
    return;
  }

  const symbol = String(ns.args[0]);

  if (!ns.stock.getSymbols().includes(symbol)) {
    ns.tprint(`❌ ERROR: Symbol '${symbol}' is not valid.`);
    return;
  }

  ns.tprint(`✅ Signal Provider started for ${symbol}. Monitoring forecast changes...`);

  let lastCommand = "";

  while (true) {
    const forecast = ns.stock.getForecast(symbol);
    let currentCommand = "";

    // Determine command based on forecast direction
    if (forecast > 0.5) {
      currentCommand = "GROW";
    } else {
      currentCommand = "HACK";
    }

    // Only send command if the state has changed
    if (currentCommand !== lastCommand) {
      ns.print(`🔄 Trend Change detected (${forecast.toFixed(4)}). Switching to ${currentCommand}.`);

      await ns.writePort(85, currentCommand);
      lastCommand = currentCommand;
    }

    await ns.sleep(6000); // Wait for next stock market tick
  }
}
