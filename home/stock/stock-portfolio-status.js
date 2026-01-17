// VERSION 1.0.1
// Script: Portfolio Status Display
// Purpose: Shows current stock portfolio with profit/loss for each position and total
// Parameters: None
// Usage: run portfolio-status.js

/** @param {NS} ns */
export async function main(ns) {
  const stocks = ns.stock.getSymbols();
  let totalValue = 0;
  let totalCost = 0;
  let positions = [];

  ns.tprint("📊 PORTFOLIO STATUS");
  ns.tprint("=".repeat(80));

  for (const sym of stocks) {
    const position = ns.stock.getPosition(sym);
    const [longShares, longPrice, shortShares, shortPrice] = position;

    if (longShares > 0) {
      const currentPrice = ns.stock.getAskPrice(sym);
      const cost = longShares * longPrice;
      const value = longShares * currentPrice;
      const profit = value - cost;
      const profitPercent = ((profit / cost) * 100).toFixed(2);

      positions.push({
        sym,
        shares: longShares,
        avgPrice: longPrice,
        currentPrice,
        profit,
        profitPercent
      });

      totalCost += cost;
      totalValue += value;

      const emoji = profit >= 0 ? "✅" : "🔶";
      ns.tprint(`${emoji} ${sym}`);
      ns.tprint(`   Shares: ${ns.formatNumber(longShares, 0)}`);
      ns.tprint(`   Avg Price: $${ns.formatNumber(longPrice, 2)} | Current: $${ns.formatNumber(currentPrice, 2)}`);
      ns.tprint(`   P/L: $${ns.formatNumber(profit, 2)} (${profitPercent}%)`);
      ns.tprint("");
    }
  }

  if (positions.length === 0) {
    ns.tprint("❌ No positions found in portfolio");
    return;
  }

  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = ((totalProfit / totalCost) * 100).toFixed(2);
  const emoji = totalProfit >= 0 ? "✅" : "🔶";

  ns.tprint("=".repeat(80));
  ns.tprint(`${emoji} TOTAL PORTFOLIO`);
  ns.tprint(`   Total Cost: $${ns.formatNumber(totalCost, 2)}`);
  ns.tprint(`   Current Value: $${ns.formatNumber(totalValue, 2)}`);
  ns.tprint(`   Total P/L: $${ns.formatNumber(totalProfit, 2)} (${totalProfitPercent}%)`);
  ns.tprint(`   Positions: ${positions.length}`);
}
