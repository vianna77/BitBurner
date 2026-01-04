/** @param {NS} ns */
export async function main(ns) {
  const members = ns.gang.getMemberNames();
  
  if (members.length > 0) {
    ns.tprint("=== MEMBER INFO STRUCTURE ===");
    const memberInfo = ns.gang.getMemberInformation(members[0]);
    ns.tprint(JSON.stringify(memberInfo, null, 2));
    
    ns.tprint("\n=== ASCENSION RESULT STRUCTURE ===");
    const ascResult = ns.gang.getAscensionResult(members[0]);
    ns.tprint(JSON.stringify(ascResult, null, 2));
  }
  
  ns.tprint("\n=== GANG INFO STRUCTURE ===");
  const gangInfo = ns.gang.getGangInformation();
  ns.tprint(JSON.stringify(gangInfo, null, 2));
  
  ns.tprint("\n=== TASK STATS EXAMPLE ===");
  const taskStats = ns.gang.getTaskStats("Human Trafficking");
  ns.tprint(JSON.stringify(taskStats, null, 2));
}