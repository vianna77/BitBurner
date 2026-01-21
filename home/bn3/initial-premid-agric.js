/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const division = "AgriCorp";
  const city = "Sector-12";

  // ======================
  // SETUP ÚNICO
  // ======================

  corp.sellMaterial(division, city, "Food", "MAX", "0");
  corp.sellMaterial(division, city, "Plants", "MAX", "0");

  if (corp.hasUnlock("Smart Supply"))
    corp.setSmartSupply(division, city, true);

  let jobsSet = false;

  // Cooldowns para evitar drenagem de caixa
  let lastWarehouseUpgrade = 0;
  let lastAdVert = 0;

  const WAREHOUSE_COOLDOWN = 5 * 60 * 1000; // 5 minutos
  const ADVERT_COOLDOWN = 10 * 60 * 1000;  // 10 minutos

  // ======================
  // LOOP
  // ======================
  while (true) {
    const office = corp.getOffice(division, city);
    const warehouse = corp.getWarehouse(division, city);
    const food = corp.getMaterial(division, city, "Food");
    const plants = corp.getMaterial(division, city, "Plants");
    const corpFunds = corp.getCorporation().funds;
    const now = Date.now();

    // ----------------------
    // FUNCIONÁRIOS
    // ----------------------
    if (!jobsSet && office.numEmployees >= 3) {
      corp.setAutoJobAssignment(division, city, "Operations", 1);
      corp.setAutoJobAssignment(division, city, "Engineer", 1);
      corp.setAutoJobAssignment(division, city, "Business", 1);
      jobsSet = true;
    }

    // ----------------------
    // WAREHOUSE (LUCRO REAL)
    // ----------------------
    if (
      warehouse.sizeUsed > warehouse.size * 0.8 &&
      corpFunds > 5e9 &&
      now - lastWarehouseUpgrade > WAREHOUSE_COOLDOWN
    ) {
      corp.upgradeWarehouse(division, city);
      lastWarehouseUpgrade = now;
    }

    // ----------------------
    // DEMANDA (AdVert)
    // ----------------------
    if (
      corpFunds > 1e10 &&
      now - lastAdVert > ADVERT_COOLDOWN
    ) {
      corp.hireAdVert(division);
      lastAdVert = now;
    }

    // ----------------------
    // ALERTA DE SUBDEMANDA
    // ----------------------
    if (food.stored > 100 || plants.stored > 100) {
      ns.print("WARN: Estoque acumulando. Aumente Business ou AdVert.");
    }

    // ----------------------
    // MANUTENÇÃO
    // ----------------------
    if (office.avgEnergy < 95)
      corp.buyTea(division, city);

    if (office.avgMorale < 95 && corpFunds > 5e6)
      corp.throwParty(division, city, 50000);

    await ns.sleep(20000);
  }
}
