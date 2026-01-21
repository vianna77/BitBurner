/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const division = "AgriCorp";
  const cityOrder = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];
  const TARGET_OFFICE = 6; // Começa menor para reduzir gastos
  const JOBS = { Engineer: 2, Business: 2 }; // Produção mínima inicial
  const CHECK_INTERVAL = 10000;
  const EXPANSION_COST = 4e9;
  const WAREHOUSE_COST = 1e9;
  const PRODUCTS = ["Food", "Plants"];
  const PROFIT_THRESHOLD = 500000;

  let smartSupplyEnabled = {};
  for (const city of cityOrder) smartSupplyEnabled[city] = false;

  while (true) {
    const corpInfo = corp.getCorporation();
    ns.print("--------------------------------------");

    for (const city of cityOrder) {
      let office = null;
      try { office = corp.getOffice(division, city); } catch { office = null; }

      // EXPAND OFFICE SE NÃO EXISTE
      if (!office) {
        if (corpInfo.funds >= EXPANSION_COST) {
          corp.expandCity(division, city);
          ns.print(`✅ Office expanded to ${city}`);
        } else {
          ns.print(`💰 Waiting to expand to ${city} (need 4B)`);
          continue;
        }
      }

      office = corp.getOffice(division, city);

      // COMPRA WAREHOUSE SE NÃO EXISTE
      let warehouse = null;
      try { warehouse = corp.getWarehouse(division, city); } catch { warehouse = null; }

      if (!warehouse) {
        if (corpInfo.funds >= WAREHOUSE_COST) {
          corp.purchaseWarehouse(division, city);
          warehouse = corp.getWarehouse(division, city);
          ns.print(`✅ Warehouse purchased in ${city}`);
        } else {
          ns.print(`💰 Waiting for funds to buy warehouse in ${city}`);
          continue;
        }
      }

      // UPGRADES DE OFFICE
      if (office.size < TARGET_OFFICE) {
        corp.upgradeOfficeSize(division, city, TARGET_OFFICE - office.size);
        office = corp.getOffice(division, city);
      }

      // CONTRATAÇÃO
      while (office.numEmployees < TARGET_OFFICE) {
        const hired = corp.hireEmployee(division, city);
        if (!hired) break;
        office = corp.getOffice(division, city);
      }

      // JOB ASSIGNMENT BASEADO EM UNASSIGNED
      let unassigned = office.employeeJobs["Unassigned"];
      for (const job of Object.keys(JOBS)) {
        const assign = Math.min(JOBS[job], unassigned);
        if (assign > 0) {
          corp.setAutoJobAssignment(division, city, job, assign);
          unassigned -= assign;
        }
      }

      // VENDA DE PRODUTOS
      for (const product of PRODUCTS) {
        corp.sellMaterial(division, city, product, "MAX", "MP");
      }

      // SMART SUPPLY IMEDIATO
      if (!smartSupplyEnabled[city]) {
        if (corp.hasUnlock("Smart Supply")) {
          corp.setSmartSupply(division, city, true);
          smartSupplyEnabled[city] = true;
          ns.print(`💡 Smart Supply ENABLED immediately in ${city}`);
        }
      }

      // MANUTENÇÃO SÓ SE LUCRATIVO
      const divInfo = corp.getDivision(division);
      const lastProfit = divInfo.lastCycleRevenue - divInfo.lastCycleExpenses;
      if (lastProfit > PROFIT_THRESHOLD) {
        if (office.avgEnergy < 90) corp.buyTea(division, city);
        if (office.avgMorale < 90) corp.throwParty(division, city, 50000);
      }

      // LOG
      ns.print(
        `${city} | Food: ${corp.getMaterial(division, city, "Food").stored.toFixed(1)} | ` +
        `Plants: ${corp.getMaterial(division, city, "Plants").stored.toFixed(1)} | ` +
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
