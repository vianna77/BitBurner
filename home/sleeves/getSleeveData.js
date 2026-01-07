/**
 * VERSION: 1.0.0
 * SLEEVE DATA RETRIEVER
 *
 * DESCRIPTION:
 * Retrieves comprehensive sleeve data including stats and current task.
 *
 * PORT USAGE:
 * - Port 10: Writes JSON object with sleeve stats and task information
 *
 * USAGE:
 * run getSleeveData.js [sleeveIndex]
 * - sleeveIndex: Index of the sleeve to retrieve data for (0-based)
 */

/** @param {NS} ns */
export async function main(ns) {
  const i = ns.args[0];
  const sleeveInfo = ns.sleeve.getSleeve(i);

  const data = {
    stats: {
      shock: sleeveInfo.shock,
      sync: sleeveInfo.sync,
      strength: sleeveInfo.skills.strength,
      defense: sleeveInfo.skills.defense,
      dexterity: sleeveInfo.skills.dexterity,
      agility: sleeveInfo.skills.agility,
      hp: sleeveInfo.hp.current,
      memory: sleeveInfo.memory,
      city: sleeveInfo.city
    },
    task: ns.sleeve.getTask(i)
  };

  ns.print(`Full data object for Sleeve ${i}: ${JSON.stringify(data)}`);

  ns.writePort(10, JSON.stringify(data));
}
