/**
 * PRO STOCK TRADER — REGIME AWARE + SCORE WEIGHTED (v3.0)
 *
 * Arquitetura:
 * 1) Regime Detection → decide QUANTO arriscar
 * 2) Score Ranking → decide ONDE alocar
 * 3) Position Sizing ponderado → distribui capital internamente
 *
 * Uso obrigatório:
 * run proTrader.js MAX_CAP ENABLE_SHORT AGGRESSION
 *
 * @param {NS} ns
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

  const BUY_THRESHOLD = 0.72 - AGGRESSION * 0.12;   // 0.72 → 0.60
  const SELL_THRESHOLD = 0.55 - AGGRESSION * 0.08; // 0.55 → 0.47
  const SHORT_THRESHOLD = 0.30 + AGGRESSION * 0.10;

  const BASE_MAX_POSITIONS = Math.round(10 - AGGRESSION * 4); // 10 → 6
  const BASE_EXPOSURE = 0.55 + AGGRESSION * 0.35;             // 55% → 90%
  const MAX_VOL = 0.15 + AGGRESSION * 0.20;                   // 15% → 35%

  const CYCLE_TIME = Math.round(9000 - AGGRESSION * 4000);

  // ============================================================
  // 3) STARTUP SUMMARY
  // ============================================================

  ns.tprint("=================================================");
  ns.tprint("PRO STOCK TRADER v3.0 — REGIME AWARE");
  ns.tprint(`MAX_CAP: ${ns.formatNumber(MAX_CAP)} (capital máximo alocável)`);
  ns.tprint(`AGGRESSION: ${AGGRESSION.toFixed(2)} (0.0 conservador → 1.0 agressivo)`);
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
    const f = ns.stock.getForecast(sym);
    const v = ns.stock.getVolatility(sym);
    if (v <= 0) return 0;
    return (f - 0.5) / v;
  }

  function getPosition(sym) {
    const [l, lAvg, s, sAvg] = ns.stock.getPosition(sym);
    return { l, lAvg, s, sAvg };
  }

  function unrealized(sym) {
    const p = getPosition(sym);
    const price = ns.stock.getPrice(sym);
    let u = 0;
    if (p.l > 0) u += (price - p.lAvg) * p.l;
    if (ENABLE_SHORT && p.s > 0) u += (p.sAvg - price) * p.s;
    return u;
  }

  // ============================================================
  // 5) REGIME DETECTION
  // ============================================================

  function detectRegime(ranked) {
    if (ranked.length === 0) return "NO_EDGE";

    const strong = ranked.filter(r => r.forecast >= BUY_THRESHOLD).length;
    const weak = ranked.filter(r => r.forecast <= SELL_THRESHOLD).length;

    if (strong >= 4) return "BULL";
    if (weak >= 4) return "BEAR";
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

    // ---------- LIQUIDATION ----------
    for (const o of ranked) {
      const f = o.forecast;

      if (o.pos.l > 0 && f < SELL_THRESHOLD) {
        ns.stock.sellStock(o.sym, o.pos.l);
        actions.push(`SELL ${o.sym}`);
      }

      if (ENABLE_SHORT && o.pos.s > 0 && f > SELL_THRESHOLD) {
        ns.stock.sellShort(o.sym, o.pos.s);
        actions.push(`COVER ${o.sym}`);
      }
    }

    // ---------- ENTRY ----------
    if (params.exposure === 0) {
      ns.print(`[REGIME] ${regime} — Trading disabled`);
    } else {
      const budget = Math.min(cash() * params.exposure, MAX_CAP);
      const candidates = ranked
        .filter(o => o.forecast > BUY_THRESHOLD && o.pos.l === 0)
        .slice(0, params.maxPos);

      const totalScore = candidates.reduce((a, c) => a + Math.max(c.score, 0.001), 0);

      for (const c of candidates) {
        const weight = c.score / totalScore;
        const alloc = budget * weight;
        const price = ns.stock.getPrice(c.sym);
        const shares = Math.floor(alloc / price);
        if (shares <= 0) continue;

        ns.stock.buyStock(c.sym, shares);
        actions.push(`BUY ${c.sym} | w=${weight.toFixed(2)}`);
      }
    }

    // ---------- LOG ----------
    const realized = 0;
    const unreal = symbols.reduce((a, s) => a + unrealized(s), 0);

    ns.print("=================================================");
    ns.print(`[REGIME] ${regime}`);
    actions.forEach(a => ns.print(a));
    ns.print(`[EXPOSURE] ${(params.exposure * 100).toFixed(1)}% | MaxPos ${params.maxPos}`);
    ns.print(`[PnL] Unrealized ${ns.formatNumber(unreal)}`);
    ns.print("=================================================");

    await ns.sleep(CYCLE_TIME);
  }
}
