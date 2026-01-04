/** @param {NS} ns */
export async function main(ns) {
  ns.tprint("=== GANG TASKS ===");
  const tasks = ns.gang.getTaskNames();
  tasks.forEach(task => {
    const stats = ns.gang.getTaskStats(task);
    ns.tprint(`${task}:`);
    ns.tprint(`  Money: ${stats.baseMoney}, Respect: ${stats.baseRespect}, Wanted: ${stats.baseWanted}`);
    ns.tprint(`  Stats: STR:${stats.strWeight} DEF:${stats.defWeight} DEX:${stats.dexWeight} AGI:${stats.agiWeight} CHA:${stats.chaWeight} HACK:${stats.hackWeight}`);
    ns.tprint("");
  });

  ns.tprint("=== GANG EQUIPMENT ===");
  const equipment = ns.gang.getEquipmentNames();
  equipment.forEach(item => {
    const cost = ns.gang.getEquipmentCost(item);
    const stats = ns.gang.getEquipmentStats(item);
    ns.tprint(`${item} ($${ns.formatNumber(cost)}):`);
    ns.tprint(`  STR:${stats.str} DEF:${stats.def} DEX:${stats.dex} AGI:${stats.agi} CHA:${stats.cha} HACK:${stats.hack}`);
    ns.tprint("");
  });
}