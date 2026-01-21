/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const division = "AgriCorp";
  const city = "Sector-12";

  // ======================
  // CONFIG
  // ======================
  const TARGET_OFFICE_SIZE = 6;
  const JOBS = {
    Operations: 2,
    Engineer: 2,
    Business: 2,
  };

  const MIN_WATER = 20;
  const MIN_CHEM = 20;
  const SELL_THRESHOLD = 5;
  const CHECK_INTERVAL = 10000;

  let smartSupplyEnabled = false;
  let sellingEnabled = false;

  // ======================
  // INITIAL SETUP
  // ======================
  if (!corp.hasWarehouse(division, city)) {
    corp.purchaseWarehouse(division, city);
  }

  // Disable selling initially (must accumulate first)
  corp.sellMaterial(division, city, "Food", 0, "MP");
  corp.sellMaterial(division, city, "Plants", 0, "MP");

  // ======================
  // LOOP
  // ======================
  while (true) {
    const office = corp.getOffice(division, city);
    const water = corp.getMaterial(division, city, "Water");
    const chem = corp.getMaterial(division, city, "Chemicals");
    const food = corp.getMaterial(division, city, "Food");
    const plants = corp.getMaterial(division, city, "Plants");

    const corpInfo = corp.getCorporation();
    const divInfo = corp.getDivision(division);

    // ----------------------
    // OFFICE SIZE + HIRING
    // ----------------------
    if (office.size < TARGET_OFFICE_SIZE) {
      corp.upgradeOfficeSize(
        division,
        city,
        TARGET_OFFICE_SIZE - office.size
      );
    }

    while (office.numEmployees < TARGET_OFFICE_SIZE) {
      corp.hireEmployee(division, city);
    }

    for (const job in JOBS) {
      corp.setAutoJobAssignment(division, city, job, JOBS[job]);
    }

    // ----------------------
    // INPUT BOOTSTRAP
    // ----------------------
    if (!smartSupplyEnabled) {
      corp.buyMaterial(
        division,
        city,
        "Water",
        water.stored < MIN_WATER ? 1 : 0
      );

      corp.buyMaterial(
        division,
        city,
        "Chemicals",
        chem.stored < MIN_CHEM ? 1 : 0
      );
    }

    // ----------------------
    // ENABLE SELLING (MP ONLY)
    // ----------------------
    if (
      !sellingEnabled &&
      (food.stored >= SELL_THRESHOLD || plants.stored >= SELL_THRESHOLD)
    ) {
      corp.sellMaterial(division, city, "Food", "MAX", "MP");
      corp.sellMaterial(division, city, "Plants", "MAX", "MP");
      sellingEnabled = true;
    }

    // ----------------------
    // SMART SUPPLY (ONLY AFTER PROFIT)
    // ----------------------
    const lastProfit =
      divInfo.lastCycleRevenue - divInfo.lastCycleExpenses;

    if (
      lastProfit > 0 &&
      !smartSupplyEnabled &&
      corp.hasUnlock("Smart Supply")
    ) {
      corp.setSmartSupply(division, city, true);
      smartSupplyEnabled = true;
    }

    // ----------------------
    // MAINTENANCE
    // ----------------------
    if (office.avgEnergy < 95) {
      corp.buyTea(division, city);
    }

    if (office.avgMorale < 95 && corpInfo.funds > 5e6) {
      corp.throwParty(division, city, 50000);
    }

    // ----------------------
    // STATUS LOG
    // ----------------------
    ns.print(
      `Food: ${food.stored.toFixed(2)} | ` +
      `Plants: ${plants.stored.toFixed(2)} | ` +
      `Rev: ${ns.formatNumber(divInfo.lastCycleRevenue)} | ` +
      `Exp: ${ns.formatNumber(divInfo.lastCycleExpenses)} | ` +
      `Profit: ${ns.formatNumber(lastProfit)}`
    );

    await ns.sleep(CHECK_INTERVAL);
  }
}
