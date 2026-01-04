/** @param {NS} ns **/
export function autocomplete(data, args) {
  // Provides autocomplete for server names in the terminal
  return data.servers;
}

/** @param {NS} ns **/
export async function main(ns) {
  // --- SCRIPT SUMMARY AND INTENTION ---
  ns.tprint("=======================================");
  ns.tprint("🚀 Goto Script (v1.2)");
  ns.tprint("---------------------------------------");
  ns.tprint("Intention: Find path from home, auto-connect and propagate.");
  ns.tprint("Parameters: [target_server]");
  ns.tprint("=======================================");

  if (ns.args.length === 0) {
    ns.tprint("❌ ERROR: No target server specified.");
    return;
  }

  const target = String(ns.args[0]);
  const scriptName = ns.getScriptName();
  const currentServer = ns.getHostname();
  const visited = new Set();
  const queue = [["home"]];

  // --- PATHFINDING LOGIC (Always starts from home) ---
  let finalPath = null;
  while (queue.length) {
    const path = queue.shift();
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
  } else {
    ns.tprint(`❌ Target server '${target}' not found in the network.`);
  }
}
