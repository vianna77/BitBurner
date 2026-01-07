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
      
      // Check if solver file exists
      if (!ns.fileExists("/contracts/autoContractSolver.js")) {
        ns.print("❌ Solver file not found: /contracts/autoContractSolver.js");
        await ns.sleep(600000);
        continue;
      }
      
      // Check available RAM
      const requiredRam = ns.getScriptRam("/contracts/autoContractSolver.js");
      const availableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
      ns.print(`📊 RAM check: Required ${requiredRam}GB, Available ${availableRam}GB`);
      
      if (availableRam < requiredRam) {
        ns.print(`❌ Insufficient RAM: Need ${requiredRam}GB, have ${availableRam}GB`);
        ns.print("📝 TIP: Run 'run /contracts/autoContractSolver.js' manually when you have more RAM");
        // Check again in 30 minutes instead of 10
        await ns.sleep(1800000);
        continue;
      }
      
      if (!ns.isRunning("/contracts/autoContractSolver.js", "home")) {
        const pid = ns.run("/contracts/autoContractSolver.js");
        if (pid > 0) {
          ns.print(`✅ Contract solver started with PID: ${pid}`);
        } else {
          ns.print(`❌ Failed to start contract solver - Unknown error`);
        }
      } else {
        ns.print("⏳ Contract solver already running");
      }
    }

    // Wait 10 minutes
    await ns.sleep(600000);
  }
}
