/** * Script for purchasing and initializing a server.
 * @param {NS} ns 
 * @param {import(".").NS} ns
 **/

// --- NEW: AUTOCOMPLETE FUNCTION ---
// Allows Bitburner to suggest purchasable server names when typing
export function autocomplete(data, args) {
  // Returns the names of all servers you already know
  return data.servers;
}

export async function main(ns) {
  // Capture arguments
  const baseName = String(ns.args[0]);

  // --- HELP BLOCK ---
  if (baseName === "undefined" || baseName === "null" || baseName.trim() === "" || !ns.args.length) {
    ns.tprint("-------------------------------------------------------");
    ns.tprint("             💰 HELP: PURCHASE SERVER 💰               ");
    ns.tprint("-------------------------------------------------------");
    ns.tprint(`Usage: run ${ns.getScriptName()} [Base Name] [RAM (optional)]`);
    ns.tprint("-------------------------------------------------------");
    ns.tprint("EXPECTED PARAMETERS:");
    ns.tprint(" 1. Base Name (string): The base name of the server (the prefix 'p-' will be added automatically).");
    ns.tprint("    Example: 'run ${ns.getScriptName()} server-01'");
    ns.tprint("");
    ns.tprint(" 2. RAM (number, optional): The amount of RAM in GB for the server.");
    ns.tprint("    If omitted, the default value is 1024 GB (1 TB).");
    ns.tprint("-------------------------------------------------------");
    return;
  }

  // --- NEW: ADDS THE PREFIX 'p-' TO AVOID CONFLICTS ---
  const finalName = `p-${baseName}`;

  // If args[1] exists, use it. Otherwise, default = 1024 GB (1 TB)
  const TARGET_RAM = ns.args[1] ? Number(ns.args[1]) : 1024;

  const cost = ns.getPurchasedServerCost(TARGET_RAM);
  if (ns.getServerMoneyAvailable("home") < cost) {
    ns.tprint(`❌ Insufficient funds. Required: ${ns.formatNumber(cost, "0.00a")}`);
    return;
  }

  // Pass the finalName (with prefix) to the purchase function
  const hostname = ns.purchaseServer(finalName, TARGET_RAM);
  if (!hostname) {
    ns.tprint("❌ ERROR: Could not purchase the server. Check if the name already exists or if the RAM is invalid.");
    return;
  }

  ns.tprint(`✅ Server Purchased: ${hostname} with ${TARGET_RAM}GB RAM.`);

  // Scripts to copy after creation
  const scriptsToCopy = [
    "simpleHack.js",
    "crippler.js",
    "availableThreads.js",
    "invester.js",
    "basic-grow.js",
    "basic-hack.js",
    "basic-weaken.js",
    "smartBatch.js"
  ];

  await ns.scp(scriptsToCopy, hostname);
  ns.tprint(`📁 Copied ${scriptsToCopy.length} hacking scripts to ${hostname}.`);
}
