/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const corp = ns.corporation;

  const DIV = "Foodies";
  const HQ = "Sector-12";

  const cityOrder = [
    "Sector-12",
    "Aevum",
    "Chongqing",
    "New Tokyo",
    "Ishima",
    "Volhaven",
  ];

  const OFFICE_SIZE = 9;
  const MIN_FUNDS_FOR_EXPANSION = 14e9; // 14 Bilhões garantidos antes de expandir
  const CHECK = 5000;

  function ensureCity(city) {
    let office;
    let funds = corp.getCorporation().funds;

    // Tenta obter o escritório para ver se a cidade já existe
    try {
      office = corp.getOffice(DIV, city);
    } catch {
      // Se a cidade NÃO existe, verifica se temos os 14B solicitados
      if (funds < MIN_FUNDS_FOR_EXPANSION) {
        ns.print(`💰 Waiting for 14B to expand to ${city} (Current: ${ns.formatNumber(funds)})`);
        return false;
      }

      corp.expandCity(DIV, city);
      corp.purchaseWarehouse(DIV, city);
      ns.print(`✅ Expanded ${DIV} to ${city} and purchased warehouse.`);
      office = corp.getOffice(DIV, city);
    }

    // Gerenciamento de Warehouse (caso a cidade já exista mas não tenha warehouse)
    try {
      corp.getWarehouse(DIV, city);
    } catch {
      if (corp.getCorporation().funds > 1e9) {
        corp.purchaseWarehouse(DIV, city);
      }
    }

    // Upgrade de Office Size
    office = corp.getOffice(DIV, city);
    if (office.size < OFFICE_SIZE) {
      const upgradeCost = corp.getUpgradeOfficeSizeCost(DIV, city, OFFICE_SIZE - office.size);
      if (corp.getCorporation().funds > upgradeCost) {
        corp.upgradeOfficeSize(DIV, city, OFFICE_SIZE - office.size);
        office = corp.getOffice(DIV, city);
      }
    }

    // Contratação de Funcionários
    while (office.numEmployees < OFFICE_SIZE) {
      if (!corp.hireEmployee(DIV, city)) break;
      office = corp.getOffice(DIV, city);
    }

    return true;
  }

  function expandCities() {
    for (const city of cityOrder) {
      // O script processa uma cidade por vez. Se não tiver os 14B para a próxima,
      // ele não tenta expandir as subsequentes até que o critério seja atendido.
      if (!ensureCity(city)) break;
    }
  }

  function handleProductsHQ() {
    const div = corp.getDivision(DIV);
    const products = div.products;

    if (products.length === 0) {
      startProduct(1);
      return;
    }

    const latestName = products[products.length - 1];
    const latestProd = corp.getProduct(DIV, HQ, latestName);

    const inDev = products.some(
      p => corp.getProduct(DIV, HQ, p).developmentProgress < 100
    );

    if (inDev) return;

    // DELAY LOGIC: Espera o produto ter qualidade/stats antes de rotacionar
    if (latestProd.developmentProgress >= 100) {
      if (latestProd.sName === "0") {
        corp.sellProduct(DIV, HQ, latestName, "MAX", "MP", true);
      }

      if (latestProd.stats.quality <= 0) {
        ns.print(`⏳ Waiting for ${latestName} to stabilize...`);
        return;
      }
    }

    if (products.length >= 3) {
      const oldest = products[0];
      ns.print(`🗑️ Cycling products. Discontinuing: ${oldest}`);
      corp.discontinueProduct(DIV, oldest);
    }

    let max = 0;
    for (const p of products) {
      const m = /Dish-(\d+)/.exec(p);
      if (m) max = Math.max(max, Number(m[1]));
    }

    startProduct(max + 1);
  }

  function startProduct(num) {
    const name = `Dish-${num}`;
    const invest = 5e8;
    const totalCost = invest * 2;

    if (corp.getCorporation().funds < totalCost) return;

    corp.makeProduct(DIV, HQ, name, invest, invest);
    ns.print(`🆕 Started development of ${name}`);
  }

  while (true) {
    expandCities();
    handleProductsHQ();

    const divInfo = corp.getDivision(DIV);
    ns.print("--------------------------------------");
    ns.print(`Division: ${DIV} | Cities: ${divInfo.cities.length}/${cityOrder.length}`);
    ns.print(`Profit: ${ns.formatNumber(divInfo.lastCycleRevenue - divInfo.lastCycleExpenses)}/s`);

    await ns.sleep(CHECK);
  }
}
