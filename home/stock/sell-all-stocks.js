// VERSION 2.0.0

/**
 * Sell All Stocks - Complete Portfolio Liquidation
 * 
 * Sells all LONG positions and covers all SHORT positions in the stock market.
 * Requires user confirmation via popup before executing.
 * 
 * Parameters: None
 * 
 * Dependencies:
 * - Requires WSE Account (Wall Street Exchange)
 * - Requires TIX API access for stock operations
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.tprint("--- 💰 Starting Total Liquidation ---");

  if (!ns.stock.hasWSEAccount()) {
    ns.tprint("❌ ERROR: Requires 4S Market Data Tix API to sell positions. Please purchase the upgrade.");
    return;
  }

  const confirmed = await ns.prompt("⚠️ Confirm selling ALL stock positions?");
  if (!confirmed) {
    ns.tprint("🟡 Operation cancelled by user.");
    return;
  }

  const symbols = ns.stock.getSymbols();
  let totalProfit = 0;

  for (const sym of symbols) {
    const pos = ns.stock.getPosition(sym);
    const sharesLong = pos[0];
    const avgPriceLong = pos[1];
    const sharesShort = pos[2];
    const avgPriceShort = pos[3];

    if (sharesLong > 0) {
      const salePrice = ns.stock.sellStock(sym, sharesLong);
      const profit = (salePrice - avgPriceLong) * sharesLong;
      totalProfit += profit;
      ns.tprint(`✅ SOLD ${sym} [LONG]: Shares: ${ns.formatNumber(sharesLong)}, Profit: ${ns.formatNumber(profit)}`);
    }

    if (sharesShort > 0) {
      const coverPrice = ns.stock.sellShort(sym, sharesShort);
      const profit = (avgPriceShort - coverPrice) * sharesShort;
      totalProfit += profit;
      ns.tprint(`✅ COVERED ${sym} [SHORT]: Shares: ${ns.formatNumber(sharesShort)}, Profit: ${ns.formatNumber(profit)}`);
    }
  }

  ns.tprint("----------------------------------");
  ns.tprint(`✅ LIQUIDATION COMPLETE. Total Profit/Loss: ${ns.formatNumber(totalProfit)}`);
  ns.tprint("💵 Your capital is now fully available.");
}
