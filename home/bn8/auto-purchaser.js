/** @param {ConfigData} data **/
export function autocomplete(data, args) {
  return data.stocks;
}

/** @param {NS} ns **/
export async function main(ns) {
  const sym = ns.args[0] || "MGCP";
  const useFullCash = (ns.args[1] === false || ns.args[1] === "false") ? false : true;
  ns.disableLog("ALL");

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
  };

  ns.print(`${t()} Starting ${sym} Auto-Trader...`);

  let firstPurchaseComplete = false;

  while (true) {
    const forecast = ns.stock.getForecast(sym);
    const position = ns.stock.getPosition(sym);
    const shares = position[0];
    const avgPrice = position[1];
    const sharesShort = position[2];
    const avgPriceShort = position[3];
    const cash = ns.getServerMoneyAvailable("home");

    // Trend: UP (Long)
    if (forecast >= 0.5) {
      // Close Short positions
      if (sharesShort > 0) {
        const executedPrice = ns.stock.sellShort(sym, sharesShort);
        if (executedPrice > 0) {
          const profit = (avgPriceShort - executedPrice) * sharesShort;
          const profitPct = ((avgPriceShort - executedPrice) / avgPriceShort) * 100;
          ns.print(`${t()} 💰 CLOSED SHORT: ${ns.formatNumber(profit)} (${profitPct.toFixed(2)}%)`);
        }
      }

      // Enter Long position
      if (shares === 0) {
        {
          const maxShares = ns.stock.getMaxShares(sym);
          const askPrice = ns.stock.getAskPrice(sym);

          let availableCash = cash - 100000;
          if (!useFullCash && !firstPurchaseComplete) {
            availableCash *= 0.5;
          }

          const canAfford = Math.floor(availableCash / askPrice);
          const toBuy = Math.min(canAfford, maxShares);

          if (toBuy > 0) {
            const executedPrice = ns.stock.buyStock(sym, toBuy);
            if (executedPrice > 0) {
              firstPurchaseComplete = true;
              ns.print(`${t()} 📈 ENTERED LONG: ${toBuy} shares at ${ns.formatNumber(executedPrice)}`);
            }
          }
        }
      }
    }
    // Trend: DOWN (Short)
    else {
      // Close Long positions
      if (shares > 0) {

        const executedPrice = ns.stock.sellStock(sym, shares);
        if (executedPrice > 0) {

          const profit = (executedPrice - avgPrice) * shares;
          const profitPct = ((executedPrice - avgPrice) / avgPrice) * 100;
          ns.print(`${t()} 💰 CLOSED LONG: ${ns.formatNumber(profit)} (${profitPct.toFixed(2)}%)`);
        }
      }

      // Enter Short position
      if (sharesShort === 0) {

        const maxShares = ns.stock.getMaxShares(sym);
        const bidPrice = ns.stock.getBidPrice(sym);

        let availableCash = cash - 100000;
        if (!useFullCash && !firstPurchaseComplete) availableCash *= 0.5;

        const canAfford = Math.floor(availableCash / bidPrice);
        const toBuyShort = Math.min(canAfford, maxShares);

        if (toBuyShort > 0) {
          const executedPrice = ns.stock.buyShort(sym, toBuyShort);
          if (executedPrice > 0) {
            firstPurchaseComplete = true;
            ns.print(`${t()} 📉 ENTERED SHORT: ${toBuyShort} shares at ${ns.formatNumber(executedPrice)}`);
          }
        }
      }
    }
    await ns.sleep(6000);
  }
}
