// VERSION: Cluster Deployer v1.1.1
// DESCRIPTION: Deploys simpleHack.js to all "p-" servers. 
//              Checks if script is already running before deployment.

/** @param {NS} ns **/
export async function main(ns) {
  const servers = ns.getPurchasedServers();
  const script = "simpleHack.js";

  // Terminal Summary
  ns.tprint("==================================================================");
  ns.tprint("SCRIPT: Cluster Deployer v1.1.1");
  ns.tprint("FUNCTION: Optimizes and deploys simpleHack.js to 'p-' clusters.");
  ns.tprint("LOGIC: Skipping if running. Attempting (Free RAM / Script RAM) + 1.");
  ns.tprint("==================================================================");

  for (const server of servers) {
    if (!server.startsWith("p-")) continue;

    // Define target by stripping "p-" and suffix like "-0"
    var target = server.slice(2);
    target = target.replace(/-\d+$/, "");

    if (ns.isRunning(script, "p-"+target, target.toString())) {
      ns.tprint(`SKIPPED: ["p-"${target}] ${script} is already running.`);
      continue;
    }

    // Ensure the script exists on the target server
    if (!ns.fileExists(script, server)) {
      ns.scp(script, server);
    }

    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.getServerUsedRam(server);
    const freeRam = maxRam - usedRam;
    const ramSimple = ns.getScriptRam(script);

    const tSimple = Math.floor(freeRam / ramSimple);

    if (tSimple > 0) {
      // Attempt 1: tSimple + 1
      let pid = ns.exec(script, server, tSimple + 1, target);

      if (pid !== 0) {
        ns.tprint(`SUCCESS: [${server}] running ${script} with ${tSimple + 1} threads targeting ${target}.`);
      } else {
        // Fallback Attempt 2: tSimple
        pid = ns.exec(script, server, tSimple, target);
        
        if (pid !== 0) {
          ns.tprint(`SUCCESS: [${server}] running ${script} with ${tSimple} threads targeting ${target}.`);
        } else {
          ns.tprint(`ERROR: Failed to execute ${script} on ${server} even with ${tSimple} threads.`);
        }
      }
    } else {
      ns.tprint(`SKIPPED: [${server}] Not enough RAM for ${script}.`);
    }
  }
  ns.tprint("==================================================================");
  ns.tprint("Deployment cycle complete.");
}
