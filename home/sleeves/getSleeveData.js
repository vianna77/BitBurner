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