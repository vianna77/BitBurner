// VERSION: Network Scanner v1.2.1
// DESCRIPTION: Scans network for unrooted targets, showing RAM, Money, and Port requirements.
// UPDATES: Full English translation of logs and UI elements.

/** @param {NS} ns **/
export async function main(ns) {
  // Timestamp Helper HH:MM
  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}]`;
  };

  // --- Script Header / Purpose ---
  ns.tprint(`${t()} ==================================================================`);
  ns.tprint(`${t()} 📡 NETWORK SCANNER: UNROOTED TARGET IDENTIFIER v1.2.1`);
  ns.tprint(`${t()} `);
  ns.tprint(`${t()} Purpose: Identifies servers matching hacking level without root access.`);
  ns.tprint(`${t()} Status: ✅ = Ready to NUKE | ❌ = Missing Port Hackers.`);
  ns.tprint(`${t()} ==================================================================`);

  const level = ns.getHackingLevel();

  // Counts how many port-breaking programs the player owns
  const getPortHackerCount = () => {
    const hackers = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
    return hackers.filter(h => ns.fileExists(h, "home")).length;
  };

  const myHackers = getPortHackerCount();

  /** Scans the entire network to find all reachable hosts. */
  const scanAll = () => {
    const visited = new Set(["home"]);
    const stack = ["home"];
    const list = [];

    while (stack.length > 0) {
      const host = stack.pop();
      for (const nxt of ns.scan(host)) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          stack.push(nxt);
          list.push(nxt);
        }
      }
    }
    return list;
  };

  const servers = scanAll();

  // Filter servers: must be hackable based on level and lacking root access
  const list = [];
  for (const s of servers) {
    const req = ns.getServerRequiredHackingLevel(s);
    if (req <= level && !ns.hasRootAccess(s)) {
      const money = ns.getServerMoneyAvailable(s);
      const ram = ns.getServerMaxRam(s);
      const portsReq = ns.getServerNumPortsRequired(s);
      list.push({ name: s, money, ram, portsReq });
    }
  }

  // Sort by moneyAvailable ASCENDING
  list.sort((a, b) => a.money - b.money);

  // Print Results
  if (list.length === 0) {
    ns.tprint(`${t()} ✅ No unrooted targets found for your current hacking level.`);
  } else {
    ns.tprint(`${t()} Found ${list.length} potential targets (Your Port Hackers: ${myHackers}):`);
    for (const s of list) {
      // Check if we have enough hackers for this server
      const canNuke = myHackers >= s.portsReq;
      const statusEmoji = canNuke ? "✅" : "❌";

      const nameStr = s.name.padEnd(18);
      const moneyStr = `Money: ${ns.formatNumber(s.money, 2).padStart(8)}`;
      const ramStr = `RAM: ${s.ram.toString().padStart(3)}GB`;
      const portStr = `Ports: ${s.portsReq}`;

      ns.tprint(`${t()} ${statusEmoji} ${nameStr} | ${moneyStr} | ${ramStr} | ${portStr}`);
    }
  }
  ns.tprint(`${t()} ------------------------------------------------------------------`);
}
