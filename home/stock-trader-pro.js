/**
 * PRO STOCK TRADER — REGIME AWARE + SCORE WEIGHTED (v3.0)
 * INTEGRATED WITH INDIVIDUAL MONITOR
 * * USAGE: run proTrader.js MAX_CAP ENABLE_SHORT AGGRESSION
 * EXAMPLE: run proTrader.js 1e12 true 0.7
 * * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // ============================================================
  // 1) PARAMETER VALIDATION
  // ============================================================

  if (ns.args.length !== 3) {
    ns.tprint("ERROR: Invalid arguments.");
    ns.tprint("USAGE: run proTrader.js MAX_CAP ENABLE_SHORT AGGRESSION");
    ns.tprint("EXAMPLE: run proTrader.js 1e12 true 0.7");
    return;
  }

  const MAX_CAP = Number(ns.args[0]);
  const ENABLE_SHORT = ns.args[1] === true || ns.args[1] === "true";
  const AGGRESSION = Number(ns.args[2]);

  if (!Number.isFinite(MAX_CAP) || MAX_CAP <= 0) {
    ns.tprint("ERROR: MAX_CAP must be a positive number.");
    return;
  }
  if (!Number.isFinite(AGGRESSION) || AGGRESSION < 0 || AGGRESSION > 1) {
    ns.tprint("ERROR: AGGRESSION must be between 0.0 and 1.0.");
    return;
  }

  if (!ns.stock.hasWSEAccount() || !ns.stock.has4SData()) {
    ns.tprint("ERROR: Requires WSE account and 4S Data.");
    return;
  }

  ns.ui.openTail();

  // ============================================================
  // 2) AGGRESSION MAPPING
  // ============================================================

  const BUY_THRESHOLD = 0.72 - AGGRESSION * 0.12; 
  const SELL_THRESHOLD = 0.55 - AGGRESSION * 0.08;
  const SHORT_THRESHOLD = 0.30 + AGGRESSION * 0.10;

  const BASE_MAX_POSITIONS = Math.round(10 - AGGRESSION * 4);
  const BASE_EXPOSURE = 0.55 + AGGRESSION * 0.35;
  const MAX_VOL = 0.15 + AGGRESSION * 0.20;

  const CYCLE_TIME = Math.round(9000 - AGGRESSION * 4000);

  // ============================================================
  // 3) STARTUP SUMMARY
  // ============================================================

  ns.tprint("=================================================");
  ns.tprint("PRO STOCK TRADER v3.0 — REGIME AWARE");
  ns.tprint(`MAX_CAP: ${ns.formatNumber(MAX_CAP)}`);
  ns.tprint(`AGGRESSION: ${AGGRESSION.toFixed(2)}`);
  ns.tprint(`BUY / SELL / SHORT: ${BUY_THRESHOLD.toFixed(3)} / ${SELL_THRESHOLD.toFixed(3)} / ${SHORT_THRESHOLD.toFixed(3)}`);
  ns.tprint(`BASE EXPOSURE: ${(BASE_EXPOSURE * 100).toFixed(1)}%`);
  ns.tprint(`BASE MAX POSITIONS: ${BASE_MAX_POSITIONS}`);
  ns.tprint("=================================================");

  // ============================================================
  // 4) HELPERS
  // ============================================================

  const symbols = ns.stock.getSymbols();

  function cash() {
    return ns.getServerMoneyAvailable("home");
  }

  function getScore(sym) {
    const forecast = ns.stock.getForecast(sym);
    const volatility = ns.stock.getVolatility(sym);
    if (volatility <= 0) {
      return 0;
    }
    return (forecast - 0.5) / volatility;
  }

  function getPosition(sym) {
    const [longShares, longAvgPrice, shortShares, shortAvgPrice] = ns.stock.getPosition(sym);
    return { l: longShares, lAvg: longAvgPrice, s: shortShares, sAvg: shortAvgPrice };
  }

  function unrealized(sym) {
    const position = getPosition(sym);
    const price = ns.stock.getPrice(sym);
    let unrealizedPnL = 0;
    if (position.l > 0) {
      unrealizedPnL += (price - position.lAvg) * position.l;
    }
    if (ENABLE_SHORT && position.s > 0) {
      unrealizedPnL += (position.sAvg - price) * position.s;
    }
    return unrealizedPnL;
  }

  // ============================================================
  // 5) REGIME DETECTION
  // ============================================================

  function detectRegime(ranked) {
    if (ranked.length === 0) {
      return "NO_EDGE";
    }

    const strongStocks = ranked.filter(stock => stock.forecast >= BUY_THRESHOLD).length;
    const weakStocks = ranked.filter(stock => stock.forecast <= SELL_THRESHOLD).length;

    if (strongStocks >= 4) {
      return "BULL";
    }
    if (weakStocks >= 4) {
      return "BEAR";
    }
    return "NEUTRAL";
  }

  function regimeParams(regime) {
    if (regime === "BULL") {
      return {
        exposure: BASE_EXPOSURE,
        maxPos: BASE_MAX_POSITIONS
      };
    }
    if (regime === "NEUTRAL") {
      return {
        exposure: BASE_EXPOSURE * 0.4,
        maxPos: Math.max(2, Math.floor(BASE_MAX_POSITIONS * 0.4))
      };
    }
    return {
      exposure: 0,
      maxPos: 0
    };
  }

  // ============================================================
  // 6) MAIN LOOP
  // ============================================================

  while (true) {
    const ranked = symbols
      .map(sym => ({
        sym,
        forecast: ns.stock.getForecast(sym),
        vol: ns.stock.getVolatility(sym),
        score: getScore(sym),
        pos: getPosition(sym)
      }))
      .filter(o => o.vol > 0 && o.vol <= MAX_VOL)
      .sort((a, b) => b.score - a.score);

    const regime = detectRegime(ranked);
    const params = regimeParams(regime);

    let actions = [];

    // ---------- LIQUIDATION + MONITOR SEND ----------
    for (const stockData of ranked) {
      const forecast = stockData.forecast;
      const price = ns.stock.getPrice(stockData.sym);

      if (stockData.pos.l > 0 && forecast < SELL_THRESHOLD) {
        const sellPrice = ns.stock.sellStock(stockData.sym, stockData.pos.l);
        
        if (sellPrice > 0) {
          const actualAmount = sellPrice * stockData.pos.l;
          const profit = (sellPrice - stockData.pos.lAvg) * stockData.pos.l;
          ns.writePort(1, { source: "STOCK", amount: actualAmount });
          actions.push(`✅ SELL ${stockData.sym} | Shares: ${stockData.pos.l} | Price: $${sellPrice.toFixed(2)} | P&L: ${profit >= 0 ? '+' : ''}${ns.formatNumber(profit)}`);
        } else {
          actions.push(`❌ SELL FAILED ${stockData.sym} | Shares: ${stockData.pos.l} | Reason: Transaction failed`);
        }
      }

      if (ENABLE_SHORT && stockData.pos.s > 0 && forecast > SELL_THRESHOLD) {
        const coverPrice = ns.stock.sellShort(stockData.sym, stockData.pos.s);
        
        if (coverPrice > 0) {
          const actualProfit = (stockData.pos.sAvg - coverPrice) * stockData.pos.s;
          const totalReturn = stockData.pos.sAvg * stockData.pos.s + actualProfit;
          ns.writePort(1, { source: "STOCK", amount: totalReturn });
          actions.push(`✅ COVER ${stockData.sym} | Shares: ${stockData.pos.s} | Price: $${coverPrice.toFixed(2)} | P&L: ${actualProfit >= 0 ? '+' : ''}${ns.formatNumber(actualProfit)}`);
        } else {
          actions.push(`❌ COVER FAILED ${stockData.sym} | Shares: ${stockData.pos.s} | Reason: Transaction failed`);
        }
      }
    }

    // ---------- ENTRY ----------
    if (params.exposure === 0) {
      ns.print(`[REGIME] ${regime} — Trading disabled`);
    } else {
      const availableCash = cash();
      const budget = Math.min(availableCash * params.exposure, MAX_CAP);
      const candidates = ranked
        .filter(stockData => stockData.forecast > BUY_THRESHOLD && stockData.pos.l === 0)
        .slice(0, params.maxPos);

      if (candidates.length === 0) {
        actions.push(`📊 No buy candidates found (${ranked.length} stocks analyzed)`);
      } else {
        const totalScore = candidates.reduce((accumulator, candidate) => accumulator + Math.max(candidate.score, 0.001), 0);
        actions.push(`💰 Budget: ${ns.formatNumber(budget)} | Candidates: ${candidates.length}/${params.maxPos}`);

        for (const candidate of candidates) {
          const weight = candidate.score / totalScore;
          const allocation = budget * weight;
          const price = ns.stock.getPrice(candidate.sym);
          const shares = Math.floor(allocation / price);
          
          if (shares <= 0) {
            actions.push(`⚠️ SKIP ${candidate.sym} | Insufficient allocation: ${ns.formatNumber(allocation)}`);
            continue;
          }

          const buyPrice = ns.stock.buyStock(candidate.sym, shares);
          
          if (buyPrice > 0) {
            const actualCost = buyPrice * shares;
            actions.push(`✅ BUY ${candidate.sym} | Shares: ${shares} | Price: $${buyPrice.toFixed(2)} | Cost: ${ns.formatNumber(actualCost)} | Weight: ${(weight * 100).toFixed(1)}%`);
          } else {
            actions.push(`❌ BUY FAILED ${candidate.sym} | Shares: ${shares} | Reason: Insufficient funds or market closed`);
          }
        }
      }
    }

    // ---------- LOG ----------
    const currentCash = cash();
    const unrealizedPnL = symbols.reduce((accumulator, symbol) => accumulator + unrealized(symbol), 0);
    
    // Calculates total money spent out of pocket (cost basis)
    const totalSpent = symbols.reduce((accumulator, symbol) => {
      const position = getPosition(symbol);
      return accumulator + (position.l * position.lAvg + position.s * position.sAvg);
    }, 0);

    // Count active positions
    const activePositions = symbols.filter(symbol => {
      const position = getPosition(symbol);
      return position.l > 0 || position.s > 0;
    }).length;

    const totalPortfolio = currentCash + totalSpent + unrealizedPnL;
    const roiPercent = totalSpent > 0 ? (unrealizedPnL / totalSpent) * 100 : 0;

    ns.print("=================================================");
    ns.print(`🎯 [REGIME] ${regime} | Cycle: ${Math.floor(Date.now() / CYCLE_TIME) % 1000}`);
    
    if (actions.length > 0) {
      actions.forEach(a => ns.print(a));
    } else {
      ns.print(`💤 No actions taken this cycle`);
    }
    
    ns.print(`📊 [MARKET] Active Positions: ${activePositions} | Exposure: ${(params.exposure * 100).toFixed(1)}% | Max: ${params.maxPos}`);
    ns.print(`💰 [CASH] Available: ${ns.formatNumber(currentCash)} | Invested: ${ns.formatNumber(totalSpent)} / ${ns.formatNumber(MAX_CAP)}`);
    ns.print(`📈 [P&L] Unrealized: ${unrealizedPnL >= 0 ? '+' : ''}${ns.formatNumber(unrealizedPnL)} (${roiPercent >= 0 ? '+' : ''}${roiPercent.toFixed(2)}%) | Portfolio: ${ns.formatNumber(totalPortfolio)}`);
    ns.print("=================================================");

    await ns.sleep(CYCLE_TIME);
  }
}