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
    manageProducts(ns, corp, DIV);
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

    // 1. HIRE & ASSIGN (Fix "nem tendo que pagar funcionarios")
    if (office.numEmployees < office.size) {
      while (office.numEmployees < office.size) {
        corp.hireEmployee(div, city);
      }
      // Auto assign basic setup for Restaurant
      // Operations/Kitchen, Engineer, Business, Management
      const share = Math.floor(office.size / 4);
      if (share > 0) {
        corp.setAutoJobAssignment(div, city, "Operations", share);
        corp.setAutoJobAssignment(div, city, "Engineer", share);
        corp.setAutoJobAssignment(div, city, "Business", share);
        corp.setAutoJobAssignment(div, city, "Management", office.size - (share * 3));
      }
    }

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

function manageProducts(ns, corp, div) {
  const division = corp.getDivision(div);
  const products = division.products;
  const mainCity = "Sector-12"; // Development HQ

  // 1. MONITOR & SELL
  let isDeveloping = false;

  for (const prodName of products) {
    const prod = corp.getProduct(div, mainCity, prodName);

    if (prod.developmentProgress < 100) {
      isDeveloping = true;
      ns.print(`🛠️ [DEV] ${prodName}: ${prod.developmentProgress.toFixed(1)}%`);
    } else {
      // Ensure it is selling (Fix "profit zero")
      if (prod.sCost !== "MP") {
        for (const city of division.cities) {
          corp.sellProduct(div, city, prodName, "MAX", "MP", true);
        }
      }
      // Log profit from main city as sample
      ns.print(`✅ [SELL] ${prodName} | Rating: ${(prod.rating || 0).toFixed(0)} | Sell: ${ns.formatNumber(prod.actualSellAmount || 0)}`);
    }
  }

  // 2. CYCLE PRODUCTS (Create New / Delete Old)
  if (!isDeveloping) {
    // If full (3 products), delete oldest
    if (products.length >= 3) {
      const oldest = products[0];
      ns.print(`🗑️ Discontinuing old product: ${oldest}`);
      corp.discontinueProduct(div, oldest);
    }

    // Create new
    const funds = corp.getCorporation().funds;
    const invest = Math.max(1e7, Math.min(funds * 0.1, 1e9)); // 10% of funds, max 1B
    const newName = "Dish " + (Date.now() % 10000); // Unique name
    ns.print(`🆕 Starting development: ${newName} (Invest: ${ns.formatNumber(invest)})`);
    corp.makeProduct(div, mainCity, newName, invest, invest);
  }
}

/* ---------------- UTILS ---------------- */

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "N/A";
}
