/** * PROBLEM: Calculate Reputation gain vs Number of Levels in Infiltration.
 * FIXED: Added safety checks for undefined properties and corrected property names.
 * @param {NS} ns 
 */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  const locations = [
    "ECorp", "MegaCorp", "KuaiGong International", "Four Sigma", "NWO",
    "Blade Industries", "OmniTek Incorporated", "Bachman & Associates",
    "Clarke Incorporated", "Fulcrum Technologies", "Solaris Space Systems",
    "Global Pharmaceuticals", "AeroCorp", "DeltaOne", "Universal Energy",
    "DefComm", "Galactic Cybersystems", "Icarus Microsystems", "Helios Labs",
    "Vitalife", "Storm Technologies", "Alpha Enterprises", "Omega Software",
    "Central Intelligence", "National Security Agency", "Watchdog",
    "Companions of Fortune", "Synapse", "The Covenant", "Iron Gym", "Powerhouse Gym",
    "CompuTek", "LexoCorp", "SysCore Securities", "Omnia Cybersystems"
  ];

  const results = [];

  for (const locName of locations) {
    try {
      const data = ns.infiltration.getInfiltration(locName);

      // Safety check: ensure the location has infiltration data
      if (!data || !data.reward) {
        continue;
      }

      // Infiltration API uses 'maxClearanceLevel' for levels 
      // and 'tradeRep' for the faction reward.
      const levels = data.maxClearanceLevel || 0;
      const repReward = data.reward.tradeRep || 0;
      const soaReward = data.reward.SoARep || 0;
      const city = data.location.city || "Unknown";

      if (levels > 0) {
        results.push({
          name: locName,
          city: city,
          levels: levels,
          rep: repReward,
          soa: soaReward,
          ratio: repReward / levels,
          soaRatio: soaReward / levels
        });
      }
    } catch (e) {
      continue;
    }
  }

  // Sort by ratio descending
  results.sort((a, b) => b.ratio - a.ratio);

  ns.print(`${"Company".padEnd(25)} | ${"City".padEnd(15)} | ${"Levels".padEnd(6)} | ${"Reputation".padEnd(10)} | ${"Ratio".padEnd(8)} | ${"SoA Rep".padEnd(8)} | ${"SoA Ratio"}`);
  ns.print("-".repeat(110));

  for (const res of results) {
    const nameStr = res.name.padEnd(25);
    const cityStr = res.city.padEnd(15);
    const levelsStr = (res.levels || 0).toString().padEnd(6);
    const repStr = ns.formatNumber(res.rep || 0).padEnd(10);
    const ratioStr = ns.formatNumber(res.ratio || 0).padEnd(8);
    const soaStr = ns.formatNumber(res.soa || 0).padEnd(8);
    const soaRatioStr = ns.formatNumber(res.soaRatio || 0);

    ns.print(`${nameStr} | ${cityStr} | ${levelsStr} | ${repStr} | ${ratioStr} | ${soaStr} | ${soaRatioStr}`);
  }
}