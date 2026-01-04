/** @param {NS} ns */
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
    if (seen.has(host)) {
      continue;
    }
    seen.add(host);

    for (const n of ns.scan(host)) {
      if (!seen.has(n)) stack.push(n);
    }

    // skip personal servers
    if (host.startsWith(PREFIX)) {
      continue;
    }
    // skip excluded
    if (EXCLUDE.has(host)) {
      continue;
    }

    servers.push(host);
  }

  const level = ns.getHackingLevel();
  
  // --- collect only servers you *can hack* ---
  const eligible = [];
  for (const server of servers) {
    const currentPservers = ns.getPurchasedServers();
    if (currentPservers.some(ps => ps === PREFIX + server)) {
      continue;
    }

    const req = ns.getServerRequiredHackingLevel(server);
    if (req <= level) {
      eligible.push({
        name: server,
        money: ns.getServerMaxMoney(server)
      });
    }
  }

  // --- DESCENDING by max money ---
  eligible.sort((a, b) => b.money - a.money);

  ns.tprint(`Found ${eligible.length} targets to name new servers.`);

  // ===============================================
  // VERIFICAÇÃO DE CUSTO TOTAL E EXIBIÇÃO
  // ===============================================
  const currentServersCount = ns.getPurchasedServers().length;
  const maxServers = ns.getPurchasedServerLimit();
  const numToBuy = Math.min(eligible.length, maxServers - currentServersCount);
  const totalCost = numToBuy * cost;
  const playerMoney = ns.getServerMoneyAvailable("home");

  ns.tprint("---------------------------------------");
  ns.tprint(`📊 PURCHASE PLAN:`);
  ns.tprint(`Max servers allowed: ${maxServers}`);
  ns.tprint(`Current servers: ${currentServersCount}`);
  ns.tprint(`Servers to buy: ${numToBuy}`);
  ns.tprint(`Total Cost:     ${ns.formatNumber(totalCost)}`);
  ns.tprint(`Your Money:     ${ns.formatNumber(playerMoney)}`);
  ns.tprint("---------------------------------------");

  if (numToBuy > 0 && playerMoney < totalCost) {
    ns.tprint(`🚨 ABORTING: Insufficient funds for ALL ${numToBuy} servers.`);
    return;
  } else if (numToBuy === 0) {
    ns.tprint(`⚠️ Nothing to buy (Limit reached or no targets found).`);
    return;
  }
  // ===============================================

  ns.tprint("--- Starting purchase process ---");

  // --- buy servers ---
  for (let i = 0; i < numToBuy; i++) {
    const server = eligible[i];
    const currentPservers = ns.getPurchasedServers();
    const count = currentPservers.length;
    const maxServers = ns.getPurchasedServerLimit();
    ns.tprint(`Current personal servers: ${count}/${maxServers}.`);
    
    if (count >= maxServers) {
      ns.tprint(`🚫 Maximum limit reached (${maxServers} servers).`);
      break;
    }

    const name = PREFIX + server.name;

    if (currentPservers.some(ps => ps === name)) {
      ns.tprint(`✅ Already own ${name}. Skipping.`);
      await ns.sleep(1000);
      continue;
    }

    ns.tprint(`[${count + 1}/${maxServers}] Attempting to buy ${name}...`);

    if (ns.getServerMoneyAvailable("home") < cost) {
      ns.tprint(`💸 Insufficient funds. Need ${ns.formatNumber(cost - ns.getServerMoneyAvailable("home"))} more.`);
      break;
    }

    const ok = ns.purchaseServer(name, TARGET_RAM);
    if (!ok) {
      ns.tprint(`❌ Purchase failed for ${name}. Proceeding.`);
      await ns.sleep(1000);
      continue;
    }

    ns.tprint(`🎉 PURCHASED: ${name} (${ns.formatRam(TARGET_RAM)})`);

    // --- MODIFIED: DYNAMIC SCRIPT COPYING ---
    const scriptsToCopy = ns.ls("home").filter(file => file.endsWith(".js"));

    if (scriptsToCopy.length > 0) {
      const success = await ns.scp(scriptsToCopy, name, "home");
      if (success) {
        ns.print(`✅ Copied ${scriptsToCopy.length} .js files to ${name}.`);
      } else {
        ns.print(`⚠️ Failed to copy some scripts to ${name}.`);
      }
    }
  }
  ns.tprint("--- Purchase process finished ---");
}