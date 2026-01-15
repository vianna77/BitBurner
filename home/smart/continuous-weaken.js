// VERSION: 1.1.0
//
// PURPOSE: Continuously weaken a target server
// PARAMETERS: target - Server hostname to weaken
// USAGE: run smart/continuous-weaken.js <target>

export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length === 0) {
    ns.tprint("❌ USAGE: continuous-weaken.js <target>");
    return;
  }

  const target = String(ns.args[0]);
  const thisServer = ns.getHostname();
  const WEAKEN_PATH = "/smart/basic-weaken.js";

  if (!ns.fileExists(WEAKEN_PATH)) {
    ns.tprint("❌ ERROR: Missing /smart/basic-weaken.js");
    return;
  }

  const weakenRam = ns.getScriptRam(WEAKEN_PATH);

  ns.print(`🔒 Starting continuous weaken on ${target}`);

  let currentPid = 0;

  while (true) {
    if (currentPid === 0 || !ns.isRunning(currentPid)) {
      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      const threads = Math.floor((freeRam / 3) / weakenRam);

      if (threads > 0) {
        currentPid = ns.exec(WEAKEN_PATH, thisServer, threads, target, Date.now());
        ns.print(`🔒 Executed weaken with ${threads} threads (PID: ${currentPid})`);
      }
    }

    await ns.sleep(5000);
  }
}
