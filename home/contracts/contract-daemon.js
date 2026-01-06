// VERSION: 1.0.0
/**
 * Simple daemon that checks for contracts every 10 minutes
 * @param {NS} ns 
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "contracts/contract-daemon.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: contract-finder-daemon.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }

  while (true) {
    const visited = new Set();
    const queue = ["home"];
    let foundContract = false;

    // Scan entire network
    while (queue.length > 0) {
      const server = queue.shift();
      if (visited.has(server)) continue;
      visited.add(server);

      // Check for contracts
      const contracts = ns.ls(server).filter(f => f.endsWith(".cct"));
      if (contracts.length > 0) {
        foundContract = true;
        break;
      }

      // Add neighbors
      queue.push(...ns.scan(server).filter(s => !visited.has(s)));
    }

    // If contract found, run solver
    if (foundContract) {
      ns.print("📋 Contract found! Running solver...");
      ns.run("/contracts/autoContractSolver.js");
    }

    // Wait 10 minutes
    await ns.sleep(600000);
  }
}