export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const CITY = "Sector-12";

  const OFFICE_SIZE = 6;
  const JOBS = { Operations: 2, Engineer: 2, Business: 2 };

  // Materiais mínimos só para bônus inicial
  const MAT_TARGETS = {
    Hardware: 5,
    "AI Cores": 5,
    "Real Estate": 20,
  };

  const BASE_PRODUCT_COST = 5e8;
  const MAX_PRODUCTS = 2; // menos produtos = menos burn
  let productId = 1;

  while (true) {
    if (!corp.hasDivision(DIV)) return;

    /* ---------- WAREHOUSE ---------- */
    if (!corp.hasWarehouse(DIV, CITY)) {
      corp.purchaseWarehouse(DIV, CITY);
    }

    corp.setSmartSupply(DIV, CITY, true);
    const wh = corp.getWarehouse(DIV, CITY);

    // Compra lenta e controlada de materiais
    for (const mat in MAT_TARGETS) {
      const cur = corp.getMaterial(DIV, CITY, mat).stored;
      corp.buyMaterial(DIV, CITY, mat, cur < MAT_TARGETS[mat] ? 0.5 : 0);
    }

    /* ---------- OFFICE ---------- */
    let office = corp.getOffice(DIV, CITY);

    if (office.size < OFFICE_SIZE) {
      corp.upgradeOfficeSize(DIV, CITY, OFFICE_SIZE - office.size);
    }

    while (office.numEmployees < OFFICE_SIZE) {
      corp.hireEmployee(DIV, CITY);
      office = corp.getOffice(DIV, CITY);
    }

    for (const job in JOBS) {
      corp.setAutoJobAssignment(DIV, CITY, job, JOBS[job]);
    }

    if (office.avgEnergy < 85) corp.buyTea(DIV, CITY);
    if (office.avgMorale < 85) corp.throwParty(DIV, CITY, 20000);

    /* ---------- PRODUCT CORE ---------- */
    const div = corp.getDivision(DIV);
    const corpFunds = corp.getCorporation().funds;

    let developing = false;
    let bestRating = 0;

    for (const p of div.products) {
      const prod = corp.getProduct(DIV, CITY, p);

      if (prod.developmentProgress < 100) {
        developing = true;
      } else {
        if (prod.sCost === 0) {
          corp.sellProduct(DIV, CITY, p, "MAX", "MP", true);
        }
        bestRating = Math.max(bestRating, prod.rating);
      }
    }

    // Investimento escalável, mas conservador
    const invest = Math.min(
      Math.max(corpFunds * 0.05, BASE_PRODUCT_COST),
      2e9
    );

    // Criar produto SOMENTE se sobreviver ao burn
    if (!developing && corpFunds > invest * 2) {
      if (div.products.length < MAX_PRODUCTS) {
        const name = `Dish-${productId++}`;
        corp.makeProduct(DIV, CITY, name, invest, invest);
        ns.print(`🍳 Developing ${name} | Invest: ${ns.formatNumber(invest)}`);
      } else {
        // Substituir só se produto for claramente pior
        const oldest = div.products[0];
        const oldProd = corp.getProduct(DIV, CITY, oldest);

        if (oldProd.rating < bestRating * 0.75) {
          corp.discontinueProduct(DIV, oldest);
          ns.print(`♻️ Retired ${oldest}`);
        }
      }
    }

    /* ---------- LOG ---------- */
    const profit = div.lastCycleRevenue - div.lastCycleExpenses;
    ns.print(
      `Rev: ${ns.formatNumber(div.lastCycleRevenue)} | ` +
      `Profit: ${ns.formatNumber(profit)} | ` +
      `Products: ${div.products.length} | ` +
      `WH: ${wh.sizeUsed.toFixed(0)}/${wh.size}`
    );

    await ns.sleep(5000);
  }
}
