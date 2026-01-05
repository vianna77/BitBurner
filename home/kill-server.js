/**
 * KILL ALL SCRIPTS ON TARGET SERVERS
 * * DESCRIPTION:
 * This script takes one or more server names as arguments and kills all 
 * scripts currently running on those specific servers.
 * * USAGE:
 * run killServer.js [hostname1] [hostname2] ...
 */

/** @param {NS} ns */
export async function main(ns) {
  const targets = ns.args;

  if (targets.length === 0) {
    ns.tprint("Usage: run kill-server.js [hostname1] [hostname2] ... | ALL/all");
    ns.tprint("\nOptions:");
    ns.tprint("  ALL/all - Kill all scripts on all purchased servers");
    ns.tprint("\nPurchased servers:");
    const purchasedServers = ns.getPurchasedServers();
    if (purchasedServers.length === 0) {
      ns.tprint("  No purchased servers found.");
    } else {
      purchasedServers.forEach(server => ns.tprint(`  ${server}`));
    }
    return;
  }

  // Check if user wants to kill all on purchased servers
  if (targets.length === 1 && (targets[0].toLowerCase() === "all")) {
    const purchasedServers = ns.getPurchasedServers();
    if (purchasedServers.length === 0) {
      ns.tprint("No purchased servers found.");
      return;
    }
    
    ns.tprint(`Killing all scripts on ${purchasedServers.length} purchased servers...`);
    let totalKilled = 0;
    
    for (const server of purchasedServers) {
      const killedCount = ns.killall(server);
      totalKilled += killedCount;
      if (killedCount > 0) {
        ns.tprint(`${server}: Terminated ${killedCount} scripts`);
      }
    }
    
    ns.tprint(`Total: Terminated ${totalKilled} scripts across all purchased servers.`);
    return;
  }

  // Original logic for specific servers
  for (const target of targets) {
    if (!ns.serverExists(target)) {
      ns.tprint(`Error: Server '${target}' does not exist. Skipping...`);
      continue;
    }

    ns.tprint(`Attempting to kill all scripts on: ${target}`);
    
    // Kill all scripts on the target server
    const killedCount = ns.killall(target);

    if (killedCount) {
      ns.tprint(`Success: Terminated all scripts on ${target}.`);
    } else {
      ns.tprint(`Notice: No scripts were running on ${target}.`);
    }
  }
}

/**
 * Autocomplete function for Bitburner
 * @param {Object} data - The game data object
 * @param {string[]} args - Current command line arguments
 * @returns {string[]} List of server names for autocomplete
 */
export function autocomplete(data, args) {
  return [...data.servers];
}