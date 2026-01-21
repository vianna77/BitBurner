/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const division = "AgriCorp";
  const city = "Sector-12";

  // CONFIGURAÇÕES
  const TARGET_OFFICE = 12; // tamanho desejado do office
  const JOBS = {
    Operations: 4,
    Engineer: 3,
    Business: 5,
  };
  const CHECK_INTERVAL = 10000; // 10s
  const TEA_THRESHOLD = 95;
  const PARTY_THRESHOLD = 95;
  const PARTY_COST = 50000;

  // SETUP INICIAL
  corp.sellMaterial(division, city, "Food", "MAX", "MP");
  corp.sellMaterial(division, city, "Plants", "MAX", "MP");

  if (corp.hasUnlock("Smart Supply")) {
    corp.setSmartSupply(division, city, true);
  }

  while (true) {
    // ---------------------
    // GET STATE
    // ---------------------
    const office = corp.getOffice(division, city);
    const warehouse = corp.getWarehouse(division, city);
    const div = corp.getDivision(division);
    const corpInfo = corp.getCorporation();

    // ---------------------
    // 1. OFFICE EXPANSION
    // ---------------------
    if (office.size < TARGET_OFFICE) {
      corp.upgradeOfficeSize(division, city, TARGET_OFFICE - office.size);
    }

    // ---------------------
    // 2. HIRING (VERIFICANDO RETORNO)
    // ---------------------
    let hired = true;
    while (office.numEmployees < office.size && hired) {
      hired = corp.hireEmployee(division, city); // retorna false se não conseguiu contratar
    }

    // Atualiza office para checar funcionários reais
    const updatedOffice = corp.getOffice(division, city);
    const unassigned = updatedOffice.employeeJobs["Unassigned"] ?? 0;

    // ---------------------
    // 3. JOB ASSIGNMENT SE HOUVER UNASSIGNED
    // ---------------------
    if (unassigned > 0) {
      for (const [job, target] of Object.entries(JOBS)) {
        const current = updatedOffice.employeeJobs[job] ?? 0;
        if (current < target) {
          corp.setAutoJobAssignment(
            division,
            city,
            job,
            Math.min(target, current + unassigned)
          );
        }
      }
    }

    // ---------------------
    // 4. WAREHOUSE UPGRADE
    // ---------------------
    if (warehouse.sizeUsed > warehouse.size * 0.7 && corpInfo.funds > 5e9) {
      corp.upgradeWarehouse(division, city);
    }

    // ---------------------
    // 5. ADVERT / DEMANDA
    // ---------------------
    if (corpInfo.funds > 1e10) {
      corp.hireAdVert(division);
    }

    // ---------------------
    // 6. MANUTENÇÃO
    // ---------------------
    if (office.avgEnergy < TEA_THRESHOLD) {
      corp.buyTea(division, city);
    }

    if (office.avgMorale < PARTY_THRESHOLD && corpInfo.funds > 5e6) {
      corp.throwParty(division, city, PARTY_COST);
    }

    // ---------------------
    // 7. LOG DE STATUS
    // ---------------------
    const profit = div.lastCycleRevenue - div.lastCycleExpenses;

    ns.print(
      `Food: ${div.products.includes("Food") ? div.products.indexOf("Food") : 0} | ` +
      `Plants: ${div.products.includes("Plants") ? div.products.indexOf("Plants") : 0} | ` +
      `Rev: ${ns.formatNumber(div.lastCycleRevenue)} | ` +
      `Exp: ${ns.formatNumber(div.lastCycleExpenses)} | ` +
      `Profit: ${ns.formatNumber(profit)} | ` +
      `Emp: ${updatedOffice.numEmployees} | ` +
      `Unassigned: ${unassigned} | ` +
      `WH: ${ns.formatNumber(warehouse.sizeUsed)}/${ns.formatNumber(warehouse.size)}`
    );

    await ns.sleep(CHECK_INTERVAL);
  }
}
