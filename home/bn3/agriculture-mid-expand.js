/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const division = "AgriCorp";
  const restaurantDiv = "Foodies";

  const cityOrder = [
    "Sector-12",
    "Aevum",
    "Chongqing",
    "New Tokyo",
    "Ishima",
    "Volhaven",
  ];

  const TARGET_OFFICE = 6;
  const JOBS = { Engineer: 2, Business: 2 };
  const CHECK_INTERVAL = 10000;

  const EXPANSION_COST = 4e9;
  const WAREHOUSE_COST = 1e9;
  const PROFIT_THRESHOLD = 500000;

  const smartSupplyEnabled = Object.fromEntries(
    cityOrder.map(c => [c, false])
  );

  function restaurantExistsInCity(city) {
    try {
      const div = corp.getDivision(restaurantDiv);
      return div.cities.includes(city);
    } catch {
      return false;
    }
  }

  while (true) {
    const corpInfo = corp.getCorporation();
    const hasExportUnlock = corp.hasUnlock("Export");
    ns.print("--------------------------------------");

    for (const city of cityOrder) {
      let office;
      try {
        office = corp.getOffice(division, city);
      } catch {
        if (corpInfo.funds < EXPANSION_COST) {
          ns.print(`💰 Waiting to expand to ${city} (need 4B)`);
          continue;
        }
        corp.expandCity(division, city);
        office = corp.getOffice(division, city);
        ns.print(`✅ Office expanded to ${city}`);
      }

      let warehouse;
      try {
        warehouse = corp.getWarehouse(division, city);
      } catch {
        if (corpInfo.funds < WAREHOUSE_COST) continue;
        corp.purchaseWarehouse(division, city);
        warehouse = corp.getWarehouse(division, city);
        ns.print(`✅ Warehouse purchased in ${city}`);
      }

      if (office.size < TARGET_OFFICE) {
        corp.upgradeOfficeSize(division, city, TARGET_OFFICE - office.size);
        office = corp.getOffice(division, city);
      }

      while (office.numEmployees < TARGET_OFFICE) {
        if (!corp.hireEmployee(division, city)) break;
        office = corp.getOffice(division, city);
      }

      let unassigned = office.employeeJobs["Unassigned"];
      for (const job of Object.keys(JOBS)) {
        const assign = Math.min(JOBS[job], unassigned);
        if (assign > 0) {
          corp.setAutoJobAssignment(division, city, job, assign);
          unassigned -= assign;
        }
      }

      // --------- MATERIAL LOGIC (DYNAMIC FLUSH & EXPORT) ----------
      const warehouseFilled = warehouse.sizeUsed / warehouse.size;
      const foodMat = corp.getMaterial(division, city, "Food");
      const plantsMat = corp.getMaterial(division, city, "Plants");

      // PLANTS LOGIC
      if (warehouseFilled > 0.9 && plantsMat.stored > 0) {
        const sellRate = plantsMat.stored * 0.9;
        corp.sellMaterial(division, city, "Plants", sellRate, "MP");
        ns.print(`🟡 Flush Plants in ${city}: Selling ${ns.formatNumber(sellRate)}`);
      } else {
        corp.sellMaterial(division, city, "Plants", "MAX", "MP");
      }

      // FOOD LOGIC (SEND WHAT IT PRODUCES)
      if (restaurantExistsInCity(city) && hasExportUnlock) {
        // Export exactly what is being produced
        const prodRate = foodMat.production.toFixed(2);
        corp.exportMaterial(division, city, restaurantDiv, city, "Food", prodRate);

        if (warehouseFilled > 0.9 && foodMat.stored > 0) {
          const flushRate = foodMat.stored * 0.9;
          corp.sellMaterial(division, city, "Food", flushRate, "MP");
          ns.print(`🟡 Flush Food in ${city}: Selling ${ns.formatNumber(flushRate)}`);
        } else {
          // Sell 0 to market to ensure all production goes to Export
          corp.sellMaterial(division, city, "Food", "0", "MP");
        }
      } else {
        if (warehouseFilled > 0.9 && foodMat.stored > 0) {
          const sellRate = foodMat.stored * 0.9;
          corp.sellMaterial(division, city, "Food", sellRate, "MP");
          ns.print(`🟡   Flush Food in ${city}: Selling ${ns.formatNumber(sellRate)}`);
        } else {
          corp.sellMaterial(division, city, "Food", "MAX", "MP");
        }
      }

      // --------- SMART SUPPLY ----------
      if (!smartSupplyEnabled[city] && corp.hasUnlock("Smart Supply")) {
        corp.setSmartSupply(division, city, true);
        smartSupplyEnabled[city] = true;
      }

      // --------- MAINTENANCE ----------
      const divInfo = corp.getDivision(division);
      const lastProfit = divInfo.lastCycleRevenue - divInfo.lastCycleExpenses;
      if (lastProfit > PROFIT_THRESHOLD) {
        if (office.avgEnergy < 90) corp.buyTea(division, city);
        if (office.avgMorale < 90) corp.throwParty(division, city, 50000);
      }

      // --------- STATUS LOGS ----------
      ns.print(
        `${city} | Food: ${foodMat.stored.toFixed(1)} | ` +
        `Plants: ${plantsMat.stored.toFixed(1)} | ` +
        `Rev: ${ns.formatNumber(divInfo.lastCycleRevenue)} | ` +
        `Exp: ${ns.formatNumber(divInfo.lastCycleExpenses)} | ` +
        `Profit: ${ns.formatNumber(lastProfit)} | ` +
        `Emp: ${office.numEmployees} | Unassigned: ${office.employeeJobs["Unassigned"]} | ` +
        `WH: ${warehouse.sizeUsed.toFixed(1)}/${warehouse.size}`
      );
    }

    await ns.sleep(CHECK_INTERVAL);
  }
}
