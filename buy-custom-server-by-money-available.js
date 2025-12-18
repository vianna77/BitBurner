/** * Script: comp_purchase.js (Purchase and Provisioner of Home Servers)
 * This script automates the purchase and initial configuration of Personal Servers (p-servers).
 * It attempts to buy servers named after the most profitable machines you can hack,
 * until the limit of 25 servers is reached.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // ===============================================
  // MANDATORY RAM ARGUMENT CHECK
  // ===============================================
  if (ns.args.length === 0) {
    ns.tprint("==================================================================");
    ns.tprint("🚨 ERROR: RAM argument is MANDATORY.");
    ns.tprint(" ");
    ns.tprint("Usage: run comp_purchase.js [RAM_GB]");
    ns.tprint(" ");
    ns.tprint("This script purchases Personal Servers (p-servers) with the specified RAM.");
    ns.tprint("RAM must be a power of 2, e.g., 8, 16, 32, 64, 128, 256, 512, 1024...");
    ns.tprint(" ");
    ns.tprint("Example: run comp_purchase.js 256");
    ns.tprint("Pairs well with run-simplehack-on-pservers.js or smart scripts.");
    ns.tprint("==================================================================");
    return;
  }

  const TARGET_RAM = Number(ns.args[0]);

  // RAM validity check
  if (isNaN(TARGET_RAM) || TARGET_RAM < 2 || (TARGET_RAM & (TARGET_RAM - 1)) !== 0) {
    ns.tprint(`🚨 ERROR: Invalid RAM (${ns.args[0]}). Use a power of 2 (e.g., 128, 512, 2048).`);
    return;
  }

  const PREFIX = "p-";
  const EXCLUDE = new Set([
    ".", "CSEC", "I.I.I.I", "avmnite-02h", "darkweb", "home", "run4theh111z"
  ]);

  const cost = ns.getPurchasedServerCost(TARGET_RAM);
  ns.tprint(`✅ Configuration: Servers with ${ns.formatRam(TARGET_RAM)} RAM.`);
  ns.tprint(`💰 Cost per server: ${ns.formatNumber(cost)}`);
  ns.tprint("--- Starting search for eligible targets ---");

  // --- discover all servers ---
  const seen = new Set();
  const stack = ["home"];
  const servers = [];

  while (stack.length > 0) {
    const host = stack.pop();
    if (seen.has(host)) continue;
    seen.add(host);

    for (const n of ns.scan(host)) {
      if (!seen.has(n)) stack.push(n);
    }

    // skip personal servers
    if (host.startsWith(PREFIX)) continue;
    // skip excluded
    if (EXCLUDE.has(host)) continue;

    servers.push(host);
  }

  const level = ns.getHackingLevel();
  const owned = new Set(ns.getPurchasedServers());

  // --- collect only servers you *can hack* ---
  const eligible = [];
  for (const s of servers) {
    if (owned.has(s)) continue;

    const req = ns.getServerRequiredHackingLevel(s);
    if (req <= level) {
      eligible.push({
        name: s,
        money: ns.getServerMoneyAvailable(s)
      });
    }
  }

  // --- DESCENDING by max money ---
  eligible.sort((a, b) => b.money - a.money);

  ns.tprint(`Found ${eligible.length} targets to name new servers.`);
  ns.tprint("--- Starting purchase process ---");

  // --- buy servers ---
  for (const s of eligible) {
    const count = ns.getPurchasedServers().length;
    ns.tprint(`Current personal servers: ${count}/25.`);
    
    if (count >= 25) {
      ns.tprint("🚫 Maximum limit reached (25 servers).");
      break;
    }

    const name = PREFIX + s.name;

    // Check if server already exists
    if (owned.has(name)) {
      ns.tprint(`✅ Already own ${name}. Skipping.`);
      continue;
    }

    ns.tprint(`Attempting to buy ${name} (Based on ${s.name})...`);

    if (ns.getServerMoneyAvailable("home") < cost) {
      ns.tprint(`💸 Insufficient funds. Need ${ns.formatNumber(cost - ns.getServerMoneyAvailable("home"))} more.`);
      break;
    }

    const ok = ns.purchaseServer(name, TARGET_RAM);
    if (!ok) {
      ns.tprint(`❌ Purchase failed for ${name}. Proceeding.`);
      continue;
    }

    ns.tprint(`🎉 PURCHASED: ${name} (${ns.formatRam(TARGET_RAM)})`);

    // --- Copying scripts ---
    const scriptsToCopy = [
      "simpleHack.js", "crippler.js", "invester.js", "availableThreads.js",
      "/smart/basic-grow.js", "/smart/basic-hack.js", "/smart/basic-weaken.js", "/smart/smartBatch.js"
    ];

    let copySuccess = true;
    for (const script of scriptsToCopy) {
      if (!await ns.scp(script, name)) {
        ns.print(`WARNING: Failed to copy ${script} to ${name}.`);
        copySuccess = false;
      }
    }

    if (copySuccess) {
      ns.tprint(`Scripts successfully copied to ${name}.`);
    } else {
      ns.tprint(`Scripts copied (with errors) to ${name}.`);
    }

    owned.add(name);
  }
  ns.tprint("--- Purchase process finished ---");
}
