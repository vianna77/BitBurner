// VERSION: 1.0.0
/**
 * Bladeburner Travel
 * Allows traveling between cities in Bladeburner.
 * Usage: run bn7/bb-travel.js [City]
 * If City is not provided, opens a selection menu.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const CITIES = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
  let destination = ns.args[0];

  // If no argument, ask via prompt
  if (!destination) {
    destination = await ns.prompt("Select Bladeburner destination:", {
      type: "select",
      choices: CITIES
    });
  }

  // If cancelled or not chosen
  if (!destination) {
    ns.tprint("🟡 Travel cancelled.");
    return;
  }

  // Validation
  if (!CITIES.includes(destination)) {
    ns.tprint(`❌ Error: '${destination}' is not a valid city.`);
    ns.tprint(`Valid cities: ${CITIES.join(", ")}`);
    return;
  }

  const currentCity = ns.bladeburner.getCity();
  if (currentCity === destination) {
    ns.tprint(`🟡 You are already in ${destination}.`);
    return;
  }

  // Try to travel
  if (ns.bladeburner.switchCity(destination)) {
    ns.tprint(`✅ Bladeburner: Moved to ${destination}.`);
  } else {
    ns.tprint(`❌ Failed to move to ${destination}. Check if you have enough actions.`);
  }
}

export function autocomplete(data, args) {
  return ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
}
