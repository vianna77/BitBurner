/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  ns.disableLog("corporation.nextUpdate");

  const corp = ns.corporation;
  const DIV = "Foodies";

  if (!corp.hasCorporation()) {
    ns.tprint("ERROR: No corporation");
    return;
  }

  ensureSmartSupply(ns, corp, DIV);

  while (true) {
    handleOffices(ns, corp, DIV);
    logProductsByCity(ns, corp, DIV);
    await corp.nextUpdate();
  }
}

/* ---------------- SMART SUPPLY ---------------- */

function ensureSmartSupply(ns, corp, div) {
  if (!corp.hasUnlock("Smart Supply")) {
    const cost = corp.getUnlockCost("Smart Supply");
    if (corp.getCorporation().funds < cost) return;
    corp.purchaseUnlock("Smart Supply");
    ns.print("Smart Supply purchased");
  }

  const division = corp.getDivision(div);
  for (const city of division.cities) {
    corp.setSmartSupply(div, city, true);
  }
}

/* ---------------- OFFICES ---------------- */

function handleOffices(ns, corp, div) {
  const division = corp.getDivision(div);

  for (const city of division.cities) {
    const office = corp.getOffice(div, city);

    const energy = office.avgEnergy;
    const morale = office.avgMorale;

    ns.print(
      `[Office ${city}] Energy=${fmt(energy)} / ${office.maxEnergy} ` +
      `Morale=${fmt(morale)} / ${office.maxMorale}`
    );

    if (!Number.isFinite(energy) || !Number.isFinite(morale)) continue;

    if (energy < office.maxEnergy * 0.9) {
      corp.buyTea(div, city);
      ns.print(`[Office ${city}] buyTea()`);
    }

    if (morale < office.maxMorale * 0.9) {
      corp.throwParty(div, city, 500_000);
      ns.print(`[Office ${city}] throwParty()`);
    }
  }
}

/* ---------------- PRODUCTS ---------------- */

function logProductsByCity(ns, corp, div) {
  const division = corp.getDivision(div);

  for (const city of division.cities) {
    for (const productName of division.products) {
      const prod = corp.getProduct(div, city, productName);

      const revenue =
        Number.isFinite(prod.revenue) ? prod.revenue : 0;
      const expenses =
        Number.isFinite(prod.expenses) ? prod.expenses : 0;

      const profit = revenue - expenses;

      ns.print(
        `[${city}] ${productName} | Profit=${ns.formatNumber(profit)}`
      );
    }
  }
}

/* ---------------- UTILS ---------------- */

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "N/A";
}
