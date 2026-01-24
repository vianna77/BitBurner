/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const HQ = "Sector-12";

  const cityOrder = [
    "Sector-12",
    "Aevum",
    "Chongqing",
    "New Tokyo",
    "Ishima",
    "Volhaven",
  ];

  const OFFICE_SIZE = 9;
  const MIN_FUNDS_FOR_EXPANSION = 14e9;
  const CHECK = 5000;

  const PRODUCT_THRESHOLD_RATIO = 0.6;

  function ensureCity(city) {
    let office;
    let funds = corp.getCorporation().funds;

    try {
      office = corp.getOffice(DIV, city);
    } catch {
      if (funds < MIN_FUNDS_FOR_EXPANSION) {
        ns.print(`💰 Waiting for 14B to expand to ${city} (Current: ${ns.formatNumber(funds)})`);
        return false;
      }
      corp.expandCity(DIV, city);
      corp.purchaseWarehouse(DIV, city);
    }

    try {
      corp.getWarehouse(DIV, city);
    } catch {
      if (corp.getCorporation().funds > 1e9) {
        corp.purchaseWarehouse(DIV, city);
      }
    }

    office = corp.getOffice(DIV, city);
    if (office.size < OFFICE_SIZE) {
      const cost = corp.getUpgradeOfficeSizeCost(
        DIV,
        city,
        OFFICE_SIZE - office.size
      );
      if (corp.getCorporation().funds > cost) {
        corp.upgradeOfficeSize(DIV, city, OFFICE_SIZE - office.size);
      }
    }

    office = corp.getOffice(DIV, city);
    while (office.numEmployees < OFFICE_SIZE) {
      if (!corp.hireEmployee(DIV, city)) break;
    }

    return true;
  }

  function expandCities() {
    for (const city of cityOrder) {
      if (!ensureCity(city)) break;
    }
  }

  function productScore(prod) {
    const s = prod.stats;
    return s.quality * s.demand / Math.max(s.competition, 1);
  }

  function logProductsByCity(products) {
    ns.print("=== PRODUCT SNAPSHOT ===");

    for (const city of cityOrder) {
      if (!corp.getDivision(DIV).cities.includes(city)) continue;

      ns.print(`City: ${city}`);
      for (const p of products) {
        const prod = corp.getProduct(DIV, HQ, p);
        const s = prod.stats;
        const score = productScore(prod);

        const status =
          prod.developmentProgress < 100 ? "DEV" : "SELL";

        ns.print(
          `  ${p} | ${status}` +
          ` | Q:${s.quality.toFixed(2)}` +
          ` D:${s.demand.toFixed(2)}` +
          ` C:${s.competition.toFixed(2)}` +
          ` Score:${score.toFixed(2)}`
        );
      }
    }
  }

  function handleProductsHQ() {
    const div = corp.getDivision(DIV);
    const products = div.products;

    if (products.length === 0) {
      startProduct(1);
      return;
    }

    const inDev = products.some(
      p => corp.getProduct(DIV, HQ, p).developmentProgress < 100
    );
    if (inDev) return;

    let best = null;
    let worst = null;
    let bestScore = 0;
    let worstScore = Infinity;

    for (const p of products) {
      const prod = corp.getProduct(DIV, HQ, p);
      if (prod.developmentProgress < 100) continue;

      if (prod.sName === "0") {
        corp.sellProduct(DIV, HQ, p, "MAX", "MP", true);
      }

      if (prod.stats.quality <= 0) return;

      const score = productScore(prod);

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
      if (score < worstScore) {
        worstScore = score;
        worst = p;
      }
    }

    logProductsByCity(products);

    if (
      products.length >= 3 &&
      worst &&
      best &&
      worstScore < bestScore * PRODUCT_THRESHOLD_RATIO
    ) {
      ns.print(`🗑️ Discontinuing ${worst}`);
      corp.discontinueProduct(DIV, worst);
    }

    let max = 0;
    for (const p of products) {
      const m = /Dish-(\d+)/.exec(p);
      if (m) max = Math.max(max, Number(m[1]));
    }

    startProduct(max + 1);
  }

  function startProduct(num) {
    const name = `Dish-${num}`;
    const invest = 5e8;
    if (corp.getCorporation().funds < invest * 2) return;
    corp.makeProduct(DIV, HQ, name, invest, invest);
  }

  while (true) {
    expandCities();
    handleProductsHQ();

    const divInfo = corp.getDivision(DIV);
    ns.print("--------------------------------------");
    ns.print(`Division: ${DIV}`);
    ns.print(
      `Profit: ${ns.formatNumber(
        divInfo.lastCycleRevenue - divInfo.lastCycleExpenses
      )}/s`
    );

    await ns.sleep(CHECK);
  }
}
