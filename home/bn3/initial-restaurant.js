/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const CITY = "Sector-12";
  const PRODUCT = "Dish-1";

  const OFFICE_SIZE = 9;
  const INVEST = 5e8;
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
    for (const j of jobs) {
      corp.setAutoJobAssignment(DIV, CITY, j, 0);
    }
  }

  function assignDevJobs() {
    const office = corp.getOffice(DIV, CITY);
    resetJobs();

    const total = office.numEmployees;
    const mgmt = 1;
    const rd = Math.max(1, Math.floor((total - mgmt) * 0.7));
    const eng = total - mgmt - rd;

    corp.setAutoJobAssignment(DIV, CITY, "Management", mgmt);
    corp.setAutoJobAssignment(DIV, CITY, "Research & Development", rd);
    corp.setAutoJobAssignment(DIV, CITY, "Engineer", eng);
  }

  function assignSalesJobs() {
    resetJobs();
    corp.setAutoJobAssignment(DIV, CITY, "Management", 1);
    corp.setAutoJobAssignment(DIV, CITY, "Engineer", 3);
    corp.setAutoJobAssignment(DIV, CITY, "Business", 3);
    corp.setAutoJobAssignment(DIV, CITY, "Operations", 2);
  }

  function ensureProduct() {
    const div = corp.getDivision(DIV);
    if (!div.products.includes(PRODUCT)) {
      corp.makeProduct(DIV, CITY, PRODUCT, INVEST, INVEST);
    }
  }

  function handleProduct() {
    const p = corp.getProduct(DIV, CITY, PRODUCT);

    if (p.developmentProgress < 100) {
      assignDevJobs();
      corp.sellProduct(DIV, CITY, PRODUCT, "0", "0");
    } else {
      assignSalesJobs();
      corp.sellProduct(DIV, CITY, PRODUCT, "MAX", "MP", true);
    }
  }

  function log() {
    const div = corp.getDivision(DIV);
    const p = corp.getProduct(DIV, CITY, PRODUCT);
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
    handleProduct();
    log();
    await ns.sleep(CHECK);
  }
}
