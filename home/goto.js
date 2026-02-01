// VERSION: 1.6.0
//
// PURPOSE: Navigate to any server in the network and optionally install backdoor
// PARAMETERS:
//   - target_server (string): Name of the target server to connect to
//   - do_backdoor (boolean, default: true): Whether to install backdoor on target (requires root access)
// DEPENDENCIES: Requires Singularity API access
// USAGE: run goto.js n00dles
//        run goto.js CSEC true
//        run goto.js foodnstuff false

/** @param {NS} ns **/
export function autocomplete(data, args) {
  // Provides autocomplete for server names in the terminal
  return data.servers;
}

/** @param {NS} ns **/
export async function main(ns) {
  // --- SCRIPT SUMMARY AND INTENTION ---
  ns.tprint("=======================================");
  ns.tprint("🚀 Goto Script (v1.6.0)");
  ns.tprint("---------------------------------------");
  ns.tprint("Intention: Find path from home, auto-connect and propagate.");
  ns.tprint("Parameters: [target_server] [do_backdoor (default: true)]");
  ns.tprint("=======================================");

  if (ns.args.length === 0) {
    ns.tprint("❌ ERROR: No target server specified.");
    return;
  }

  const target = String(ns.args[0]);

  // If argument is undefined (not passed), assume true.
  // If passed, check if it's different from false.
  const doBackdoor = ns.args[1] === undefined ? true : (ns.args[1] !== false && ns.args[1] !== "false");

  const scriptName = ns.getScriptName();
  const currentServer = ns.getHostname();
  const visited = new Set();
  const queue = [["home"]];

  // --- PATHFINDING LOGIC (Always starts from home) ---
  let finalPath = null;
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const path = queue[queueIndex++];
    const host = path[path.length - 1];

    if (host === target) {
      finalPath = path;
      break;
    }

    for (const next of ns.scan(host)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  // --- EXECUTION ---
  if (finalPath) {
    ns.tprint(`✅ Path found: ${finalPath.join(" -> ")}`);

    // NEW: If not on home, connect to home first to reset navigation context
    if (currentServer !== "home") {
      ns.tprint("Resetting connection to 'home' before starting path...");
      const backHome = ns.singularity.connect("home");
      if (!backHome) {
        ns.tprint("❌ ERROR: Could not connect back to home.");
        return;
      }
    }

    // Navigate through the path
    for (const node of finalPath) {
      // Propagation logic: Copy script to next node if it doesn't exist there
      if (node !== "home" && !ns.fileExists(scriptName, node)) {
        await ns.scp(scriptName, node, "home");
        ns.tprint(`Testing propagation: ${scriptName} copied to ${node}`);
      }

      const success = ns.singularity.connect(node);
      if (!success) {
        ns.tprint(`❌ ERROR: Failed to connect to ${node}.`);
        return;
      }
    }
    ns.tprint(`🏁 Successfully connected to ${target}.`);

    // Backdoor logic with Admin check
    if (doBackdoor) {
      const serverInfo = ns.getServer(target);
      ns.tprint("=== SERVER INFO DEBUG ===");
      ns.tprint(JSON.stringify(serverInfo, null, 2));
      ns.tprint("=========================");
      const isPlayerServer = serverInfo.organizationName === "";

      if (isPlayerServer) {
        ns.tprint(`🟡 Skipping backdoor: ${target} is a player-owned server.`);
      } else if (ns.hasRootAccess(target)) {
        ns.tprint(`Attempting to install backdoor on ${target}...`);
        await ns.singularity.installBackdoor();
        ns.tprint("Backdoor installation process completed.");
      } else {
        ns.tprint(`🟡 WARNING: Cannot install backdoor. Root access (Admin) required on ${target}.`);
      }
    }

  } else {
    ns.tprint(`❌ Target server '${target}' not found in the network.`);
  }
}
