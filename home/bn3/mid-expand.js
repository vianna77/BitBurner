/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const division = "AgriCorp";
  const cityOrder = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];
  const TARGET_OFFICE = 12;
  const JOBS = { Operations: 4, Engineer: 3, Business: 5 };
  const CHECK_INTERVAL = 10000;
  const EXPANSION_COST = 4e9; // 4B mínimo por cidade
  const MATERIALS = ["Water", "Chemicals"];
  const PRODUCTS = ["Food", "Plants"];
  let smartSupplyEnabled = {};

  for (const city of cityOrder) smartSupplyEnabled[city] = false;

  while (true) {
    const corpInfo = corp.getCorporation();

    for (const city of cityOrder) {
      // ======================
      // EXPANSÃO CONDICIONAL
      // ======================
      let office = null;
      try {
        office = corp.getOffice(division, city);
      } catch { office = null; }

      if (!office) {
        if (corpInfo.funds >= EXPANSION_COST) {
          corp.expandCity(division, city);
          ns.print(`✅ Office expanded to ${city}`);
        } else {
          ns.print(`💰 Waiting to expand to ${city} (need 4B)`);
          continue; // Não dá para expandir, pula para próxima cidade
        }
      }

      office = corp.getOffice(division, city); // Atualiza office
      const warehouse = corp.getWarehouse(division, city);

      // ======================
      // OFFICE SIZE + CONTRATAÇÃO
      // ======================
      if (office.size < TARGET_OFFICE) {
        corp.upgradeOfficeSize(division, city, TARGET_OFFICE - office.size);
      }

      while (office.numEmployees < TARGET_OFFICE) {
        const hired = corp.hireEmployee(division, city);
        if (!hired) break; // Sem dinheiro ou limite atingido
      }

      // ======================
      // JOB ASSIGNMENT
      // ======================
      let unassigned = office.employeeJobs["Unassigned"];
      for (const job of Object.keys(JOBS)) {
        const assign = Math.min(JOBS[job], unassigned);
        if (assign > 0) {
          corp.setAutoJobAssignment(division, city, job, assign);
          unassigned -= assign;
        }
      }

      // ======================
      // VENDA DE PRODUTOS
      // ======================
      for (const product of PRODUCTS) {
        corp.sellMaterial(division, city, product, "MAX", "MP");
      }

      // ======================
      // SMART SUPPLY
      // ======================
      if (!smartSupplyEnabled[city]) {
        let ready = true;
        for (const mat of MATERIALS) {
          const m = corp.getMaterial(division, city, mat);
          if (m.stored === 0) ready = false;
        }
        if (ready && corp.hasUnlock("Smart Supply")) {
          corp.setSmartSupply(division, city, true);
          smartSupplyEnabled[city] = true;
          ns.print(`💡 Smart Supply ENABLED in ${city}`);
        }
      }

      // ======================
      // MANUTENÇÃO
      // ======================
      if (office.avgEnergy < 95) corp.buyTea(division, city);
      if (office.avgMorale < 95 && corpInfo.funds > 5e6)
        corp.throwParty(division, city, 50000);

      // ======================
      // STATUS
      // ======================
      const divInfo = corp.getDivision(division);
      ns.print(
        `${city} | Food: ${corp.getMaterial(division, city, "Food").stored.toFixed(1)} | ` +
        `Plants: ${corp.getMaterial(division, city, "Plants").stored.toFixed(1)} | ` +
        `Rev: ${ns.formatNumber(divInfo.lastCycleRevenue)} | ` +
        `Exp: ${ns.formatNumber(divInfo.lastCycleExpenses)} | ` +
        `Profit: ${ns.formatNumber(divInfo.lastCycleRevenue - divInfo.lastCycleExpenses)} | ` +
        `Emp: ${office.numEmployees} | Unassigned: ${office.employeeJobs["Unassigned"]} | ` +
        `WH: ${warehouse.sizeUsed.toFixed(1)}/${warehouse.size}`
      );
    }

    await ns.sleep(CHECK_INTERVAL);
  }
}
