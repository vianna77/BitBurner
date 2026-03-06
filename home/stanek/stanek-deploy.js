/**
 * VERSION 1.0.0
 * 
 * This script automatically deploys stanek-charge.js to all servers matching the pattern "p-s#"
 * where # is a number, and runs it with the corresponding fragment number.
 * 
 * Example: Server "p-s3" will run stanek-charge.js with fragment parameter 3
 * 
 * The script calculates the maximum available threads for each server and uses that value.
 * 
 * Dependencies:
 * - /stanek/stanek-charge.js must already exist on target servers
 * 
 * Usage:
 * run stanek-deploy.js
 */

/**
 * @param {NS} ns
 */
export async function main(ns) {
  const scriptPath = "/stanek/stanek-charge.js";
  const scriptRam = ns.getScriptRam(scriptPath);
  const pattern = /^p-s(\d+)$/;

  const allServers = ns.getPurchasedServers();
  const matchingServers = allServers.filter(server => pattern.test(server));

  if (matchingServers.length === 0) {
    ns.tprint("🟡 No servers found matching pattern 'p-s#'");
    return;
  }

  ns.tprint(`⚡ Found ${matchingServers.length} servers matching pattern 'p-s#'`);

  for (const server of matchingServers) {
    const match = server.match(pattern);
    const fragmentNumber = parseInt(match[1]);
    
    if (ns.isRunning(scriptPath, server, fragmentNumber)) {
      ns.tprint(`⏭️ ${server}: Already running fragment ${fragmentNumber}, skipping`);
      continue;
    }

    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.getServerUsedRam(server);
    const availableRam = maxRam - usedRam;
    const maxThreads = Math.floor(availableRam / scriptRam);

    if (maxThreads < 1) {
      ns.tprint(`🔶 ${server}: Not enough RAM (available: ${availableRam.toFixed(2)}GB, needed: ${scriptRam.toFixed(2)}GB)`);
      continue;
    }

    const pid = ns.exec(scriptPath, server, maxThreads, fragmentNumber);
    
    if (pid === 0) {
      ns.tprint(`❌ ${server}: Failed to start script`);
    } else {
      ns.tprint(`✅ ${server}: Running fragment ${fragmentNumber} with ${maxThreads} threads (PID: ${pid})`);
    }
  }

  ns.tprint("⚡ Deployment complete!");
}
