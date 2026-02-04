/** @param {NS} ns */
export async function main(ns) {
  const corp = ns.corporation;
  const divisionName = "AgriCorp";

  while (true) {
    const division = corp.getDivision(divisionName);
    
    for (const city of division.cities) {
      const office = corp.getOffice(divisionName, city);

      if (office.avgEnergy < 90) {
        corp.buyTea(divisionName, city);
      }

      if (office.avgMorale < 90) {
        corp.throwParty(divisionName, city, 100_000);
      }
    }
    await ns.asleep(1000);
  }
}
