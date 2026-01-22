/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const CITY = "Sector-12";

  const OFFICE_SIZE = 6;
  const JOBS = { Operations: 2, Engineer: 2, Business: 2 };

  // Targets adjusted to be meaningful for production bonus
  const MAT_TARGETS = {
    Hardware: 10,
    "AI Cores": 10,
    "Real Estate": 50,
  };

  const PRODUCT_COST = 5e8;
  const MAX_PRODUCTS = 3;

  let productId = 1;

  while (true) {
    if (!corp.hasDivision(DIV)) return;

    if (!corp.hasWarehouse(DIV, CITY)) {
      corp.purchaseWarehouse(DIV, CITY);
    }

    corp.setSmartSupply(DIV, CITY, true);
    const wh = corp.getWarehouse(DIV, CITY);

    // Passive materials logic
    for (const mat in MAT_TARGETS) {
      const cur = corp.getMaterial(DIV, CITY, mat).stored;
      const target = MAT_TARGETS[mat];
      // Buy 1 unit per second until target is met
      corp.buyMaterial(DIV, CITY, mat, cur < target ? 1 : 0);
    }

    // Office
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

    if (office.avgEnergy < 90) corp.buyTea(DIV, CITY);
    if (office.avgMorale < 90) corp.throwParty(DIV, CITY, 50000);

    // PRODUCT LOGIC
    const div = corp.getDivision(DIV);
    let developing = false;

    for (const p of div.products) {
      const prod = corp.getProduct(DIV, CITY, p);

      if (prod.developmentProgress < 100) {
        developing = true;
      } else if (prod.sCost === 0) {
        corp.sellProduct(DIV, CITY, p, "MAX", "MP", true);
      }
    }

    // Product Management: Create or Replace
    if (!developing && corp.getCorporation().funds > PRODUCT_COST * 2) {
      if (div.products.length < MAX_PRODUCTS) {
        const name = `Dish-${productId++}`;
        corp.makeProduct(DIV, CITY, name, PRODUCT_COST, PRODUCT_COST);
        ns.print(`🍳 Developing: ${name}`);
      } else {
        // Replace oldest product to keep menu fresh and quality high
        const oldest = div.products[0];
        corp.discontinueProduct(DIV, oldest);
        ns.print(`♻️ Retired ${oldest} to improve menu quality`);
      }
    }

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
