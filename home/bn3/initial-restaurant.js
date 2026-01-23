/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const CITY = "Sector-12";
  const PRODUCT = "Dish-1";

  const OFFICE_SIZE = 9;
  const INVESTMENT = 5e8;
  const CHECK = 5000;

  function ensureOffice() {
    let office;
    try {
      office = corp.getOffice(DIV, CITY);
    } catch {
      corp.expandCity(DIV, CITY);
      corp.purchaseWarehouse(DIV, CITY);
      office = corp.getOffice(DIV, CITY);
    }

    if (office.size < OFFICE_SIZE) {
      corp.upgradeOfficeSize(DIV, CITY, OFFICE_SIZE - office.size);
    }

    while (office.numEmployees < OFFICE_SIZE) {
      corp.hireEmployee(DIV, CITY);
    }
  }

  function resetJobs() {
    const jobs = [
      "Operations",
      "Engineer",
      "Business",
      "Management",
      "Research & Development",
      "Intern",
    ];
    for (const job of jobs) {
      corp.setAutoJobAssignment(DIV, CITY, job, 0);
    }
  }

  function assignJobs(devComplete) {
    resetJobs();

    if (!devComplete) {
      // 🔧 FASE DE DESENVOLVIMENTO
      corp.setAutoJobAssignment(DIV, CITY, "Management", 1);
      corp.setAutoJobAssignment(DIV, CITY, "Engineer", 8);
    } else {
      // 💰 FASE DE OPERAÇÃO
      corp.setAutoJobAssignment(DIV, CITY, "Operations", 4);
      corp.setAutoJobAssignment(DIV, CITY, "Engineer", 3);
      corp.setAutoJobAssignment(DIV, CITY, "Management", 1);
      corp.setAutoJobAssignment(DIV, CITY, "Business", 1);
    }
  }

  function ensureProduct() {
    const div = corp.getDivision(DIV);
    if (!div.products.includes(PRODUCT)) {
      corp.makeProduct(DIV, CITY, PRODUCT, INVESTMENT, INVESTMENT);
    }
  }

  function handleSales(p) {
    if (p.developmentProgress < 100) {
      corp.sellProduct(DIV, CITY, PRODUCT, "0", "0");
    } else {
      corp.sellProduct(DIV, CITY, PRODUCT, "MAX", "MP", true);
    }
  }

  function boostMorale() {
    const office = corp.getOffice(DIV, CITY);
    if (office.avgEnergy < 95) corp.buyTea(DIV, CITY);
    if (office.avgMorale < 95) corp.throwParty(DIV, CITY, 50000);
  }

  function logState(p) {
    const div = corp.getDivision(DIV);
    ns.print("================================");
    ns.print(`DEV ${PRODUCT} | ${p.developmentProgress.toFixed(1)}%`);
    ns.print(
      `Rev: ${ns.formatNumber(div.lastCycleRevenue)} | ` +
      `Profit: ${ns.formatNumber(div.lastCycleRevenue - div.lastCycleExpenses)}`
    );
  }

  while (true) {
    ensureOffice();
    ensureProduct();

    const p = corp.getProduct(DIV, CITY, PRODUCT);
    assignJobs(p.developmentProgress >= 100);
    handleSales(p);
    boostMorale();
    logState(p);

    await ns.sleep(CHECK);
  }
}
