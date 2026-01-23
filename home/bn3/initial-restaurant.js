/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const CITY = "Sector-12";

  const OFFICE_SIZE = 9;
  const DEV_INVEST = 5e8;   // por lado
  const CHECK = 5000;

  // JOB SPLITS
  const DEV_JOBS = {
    Operations: 0,
    Engineer: 8,
    Business: 0,
    Management: 1,
    "Research & Development": 0,
  };

  const PROD_JOBS = {
    Operations: 4,
    Engineer: 3,
    Business: 1,
    Management: 1,
    "Research & Development": 0,
  };

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

  function setJobs(jobMap) {
    for (const job of Object.keys(jobMap)) {
      corp.setAutoJobAssignment(DIV, CITY, job, 0);
    }
    for (const [job, count] of Object.entries(jobMap)) {
      corp.setAutoJobAssignment(DIV, CITY, job, count);
    }
  }

  function currentProduct() {
    const div = corp.getDivision(DIV);
    return div.products.length > 0
      ? div.products[div.products.length - 1]
      : null;
  }

  function startNextProduct() {
    const div = corp.getDivision(DIV);
    const nextIndex = div.products.length + 1;
    const name = `Dish-${nextIndex}`;

    const funds = corp.getCorporation().funds;
    const cost = DEV_INVEST * 2;

    if (funds < cost) {
      ns.print(
        `⏸ Waiting funds for ${name}: ` +
        `${ns.formatNumber(funds)} / ${ns.formatNumber(cost)}`
      );
      return;
    }

    corp.makeProduct(DIV, CITY, name, DEV_INVEST, DEV_INVEST);
    ns.print(`🆕 Started development of ${name}`);
  }

  function handleProducts() {
    const productName = currentProduct();

    if (!productName) {
      setJobs(DEV_JOBS);
      startNextProduct();
      return;
    }

    const p = corp.getProduct(DIV, CITY, productName);

    if (p.developmentProgress < 100) {
      setJobs(DEV_JOBS);
      corp.sellProduct(DIV, CITY, productName, "0", "0");
      return;
    }

    // Produto pronto
    setJobs(PROD_JOBS);
    corp.sellProduct(DIV, CITY, productName, "MAX", "MP", true);

    // Cria o próximo se não houver outro em dev
    const div = corp.getDivision(DIV);
    if (div.products.length === 1 || p.developmentProgress === 100) {
      startNextProduct();
    }
  }

  function maintainMorale() {
    const office = corp.getOffice(DIV, CITY);
    if (office.avgEnergy < 90) corp.buyTea(DIV, CITY);
    if (office.avgMorale < 90) corp.throwParty(DIV, CITY, 50000);
  }

  function logState() {
    const div = corp.getDivision(DIV);
    const name = currentProduct();
    let dev = "-";

    if (name) {
      dev = corp.getProduct(DIV, CITY, name).developmentProgress.toFixed(1);
    }

    ns.print("================================");
    ns.print(`DEV ${name ?? "NONE"} | ${dev}%`);
    ns.print(
      `Rev: ${ns.formatNumber(div.lastCycleRevenue)} | ` +
      `Profit: ${ns.formatNumber(div.lastCycleRevenue - div.lastCycleExpenses)}`
    );
  }

  while (true) {
    ensureOffice();
    handleProducts();
    maintainMorale();
    logState();
    await ns.sleep(CHECK);
  }
}
