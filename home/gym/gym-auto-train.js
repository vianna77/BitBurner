// VERSION: 4.0.0
//
// PURPOSE: Automate gym training for multiple player stats until target value is reached
// PARAMETERS:
//   - targetValue (number): Target stat value to reach
//   - gym (string): Gym name (required)
//   - ...stats (string): One or more stats to train (strength, defense, dexterity, agility)
// DEPENDENCIES: Requires Singularity API access
// USAGE: run gym/gym-auto-train.js 100 "Powerhouse Gym" strength
//        run gym/gym-auto-train.js 80 "Crush Fitness Gym" strength dexterity defense agility

/** @param {NS} ns **/
export function autocomplete(data, args) {
  const gyms = [
    "Crush Fitness Gym",
    "Snap Fitness Gym",
    "Iron Gym",
    "Powerhouse Gym",
    "Millenium Fitness Gym"
  ];
  const stats = ["strength", "defense", "dexterity", "agility"];
  
  if (args.length <= 1) {
    return gyms;
  }
  return stats;
}

/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args.length < 3) {
    ns.tprint("❌ ERROR: Missing arguments.");
    ns.tprint("Usage: run gym/gym-auto-train.js <targetValue> <gym> <stat1> [stat2] [stat3] [stat4]");
    ns.tprint("Stats: strength, defense, dexterity, agility");
    return;
  }

  const targetValue = Number(ns.args[0]);
  const gym = String(ns.args[1]);
  const stats = ns.args.slice(2).map(s => String(s).toLowerCase());
  const validStats = ["strength", "defense", "dexterity", "agility"];

  if (isNaN(targetValue) || targetValue <= 0) {
    ns.tprint("❌ ERROR: Target value must be a positive number.");
    return;
  }

  for (const stat of stats) {
    if (!validStats.includes(stat)) {
      ns.tprint(`❌ ERROR: Invalid stat '${stat}'. Valid options: ${validStats.join(", ")}`);
      return;
    }
  }

  ns.tprint("=======================================");
  ns.tprint("🏋️ Gym Auto-Train (v4.0.0)");
  ns.tprint("---------------------------------------");
  ns.tprint(`Target: ${targetValue}`);
  ns.tprint(`Stats: ${stats.join(", ")}`);
  ns.tprint(`Gym: ${gym}`);
  ns.tprint("=======================================");

  for (const stat of stats) {
    const player = ns.getPlayer();
    const currentValue = player.skills[stat];

    if (currentValue >= targetValue) {
      ns.tprint(`🟡 ${stat} is already at ${currentValue} (target: ${targetValue})`);
      continue;
    }

    ns.tprint(`🏋️ Training ${stat}: ${currentValue} -> ${targetValue}`);
    const success = ns.singularity.gymWorkout(gym, stat, false);

    if (!success) {
      ns.tprint(`❌ Failed to start training ${stat}. Check gym access.`);
      continue;
    }

    while (ns.getPlayer().skills[stat] < targetValue) {
      await ns.sleep(10000);
    }

    ns.singularity.stopAction();
    ns.tprint(`✅ ${stat} complete! Reached ${ns.getPlayer().skills[stat]}`);
  }

  ns.tprint("✅ All training complete!");
}
