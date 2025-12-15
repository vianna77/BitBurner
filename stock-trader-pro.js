/**
 * PRO STOCK TRADER — ENDGAME VERSION
 * Long-only por padrão, Short opcional
 * Requer: WSE + 4S Data
 *
 * Uso:
 * run proTrader.js [MAX_CAP] [ENABLE_SHORT]
 *
 * Ex:
 * run proTrader.js 50000000000 false
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  // ============================================================
  // CONFIGURAÇÃO
  // ============================================================

  const MAX_CAP = ns.args[0] ? Number(ns.args[0]) : 1e12; // limite total alocável
  const ENABLE_SHORT = ns.args[1] === true || ns.args[1] === "true";

  const BUY_THRESHOLD = 0.65;
  const SELL_THRESHOLD = 0.52;
  const SHORT_THRESHOLD = 0.35;

  const MAX_VOLATILITY = 0.25;
  const TARGET_PORTFOLIO_EXPOSURE = 0.80; // 80% do cash
  const MAX_POSITIONS = 8;
  const CYCLE_TIME = 5000;

  // ============================================================
  // CHECKS
  // ============================================================

  if (!ns.stock.hasWSEAccount() || !ns.stock.has4SData()) {
    ns.tprint("ERRO: Requer WSE + 4S Data.");
    return;
  }

  // ============================================================
  // ESTRUTURAS
  // ============================================================

  const pnl = {}; // por símbolo

  const symbols = ns.stock.getSymbols();

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  function getCash() {
    return ns.getServerMoneyAvailable("home");
  }

  function getScore(sym) {
    const forecast = ns.stock.getForecast(sym);
    const vol = ns.stock.getVolatility(sym);
    if (vol <= 0) return 0;
    return (forecast - 0.5) / vol;
  }

  function getPosition(sym) {
    const [lShares, lAvg, sShares, sAvg] = ns.stock.getPosition(sym);
    return { lShares, lAvg, sShares, sAvg };
  }

  function unrealizedPnL(sym) {
    const pos = getPosition(sym);
    const price = ns.stock.getPrice(sym);
    let p = 0;

    if (pos.lShares > 0) {
      p += (price - pos.lAvg) * pos.lShares;
    }
    if (ENABLE_SHORT && pos.sShares > 0) {
      p += (pos.sAvg - price) * pos.sShares;
    }
    return p;
  }

  // ============================================================
  // LOOP PRINCIPAL
  // ============================================================

  while (true) {
    const cash = getCash();
    const maxExposure = Math.min(cash * TARGET_PORTFOLIO_EXPOSURE, MAX_CAP);
    const perPositionCap = maxExposure / MAX_POSITIONS;

    let totalInvested = 0;
    let actions = [];

    // ============================================================
    // 1) LIQUIDAÇÃO
    // ============================================================

    for (const sym of symbols) {
      const pos = getPosition(sym);
      const forecast = ns.stock.getForecast(sym);
      const price = ns.stock.getPrice(sym);

      // LONG — SELL
      if (pos.lShares > 0 && forecast < SELL_THRESHOLD) {
        const sellPrice = ns.stock.sellStock(sym, pos.lShares);
        if (sellPrice > 0) {
          const profit = (sellPrice - pos.lAvg) * pos.lShares;
          pnl[sym] = (pnl[sym] || 0) + profit;
          actions.push(`SELL ${sym} | Profit: ${ns.formatNumber(profit)}`);
        }
      }

      // SHORT — COVER
      if (ENABLE_SHORT && pos.sShares > 0 && forecast > SELL_THRESHOLD) {
        const coverPrice = ns.stock.sellShort(sym, pos.sShares);
        if (coverPrice > 0) {
          const profit = (pos.sAvg - coverPrice) * pos.sShares;
          pnl[sym] = (pnl[sym] || 0) + profit;
          actions.push(`COVER ${sym} | Profit: ${ns.formatNumber(profit)}`);
        }
      }
    }

    // ============================================================
    // 2) RANKING DE OPORTUNIDADES
    // ============================================================

    const ranked = symbols
      .map(sym => ({
        sym,
        forecast: ns.stock.getForecast(sym),
        vol: ns.stock.getVolatility(sym),
        score: getScore(sym),
        pos: getPosition(sym)
      }))
      .filter(o => o.vol > 0 && o.vol < MAX_VOLATILITY)
      .sort((a, b) => b.score - a.score);

    // ============================================================
    // 3) ENTRADAS
    // ============================================================

    let openPositions = ranked.filter(o => o.pos.lShares > 0 || o.pos.sShares > 0).length;

    for (const o of ranked) {
      if (openPositions >= MAX_POSITIONS) break;
      if (o.pos.lShares > 0 || o.pos.sShares > 0) continue;

      const price = ns.stock.getPrice(o.sym);
      const sizeCap = Math.min(perPositionCap, cash);
      const shares = Math.floor(sizeCap / price);
      if (shares <= 0) continue;

      // LONG
      if (o.forecast > BUY_THRESHOLD) {
        const cost = ns.stock.buyStock(o.sym, shares);
        if (cost > 0) {
          actions.push(`BUY ${o.sym} | Shares: ${shares}`);
          openPositions++;
        }
      }

      // SHORT
      else if (ENABLE_SHORT && o.forecast < SHORT_THRESHOLD) {
        const margin = ns.stock.buyShort(o.sym, shares);
        if (margin > 0) {
          actions.push(`SHORT ${o.sym} | Shares: ${shares}`);
          openPositions++;
        }
      }
    }

    // ============================================================
    // 4) LOG
    // ============================================================

    let realized = Object.values(pnl).reduce((a, b) => a + b, 0);
    let unrealized = symbols.reduce((a, s) => a + unrealizedPnL(s), 0);

    ns.print("=================================================");
    actions.forEach(a => ns.print(a));
    ns.print(`Cash: ${ns.formatNumber(getCash())}`);
    ns.print(`Realized PnL: ${ns.formatNumber(realized)}`);
    ns.print(`Unrealized PnL: ${ns.formatNumber(unrealized)}`);
    ns.print(`Total PnL: ${ns.formatNumber(realized + unrealized)}`);
    ns.print("=================================================");

    await ns.sleep(CYCLE_TIME);
  }
}
