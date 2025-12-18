// VERSION: simpleHack.js v1.2.0
// DESCRIPTION: Single-target hacking script using pure threshold logic (W->G->H).
// UPDATES: Added versioning, terminal summaries, and optimized log output.

/** @param {NS} ns **/
export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  // ============================================
  // SIMPLIFIED ARGUMENT VALIDATION
  // ============================================
  if (ns.args.length === 0 || ns.args[0] === "-h") {
    ns.tprint("==================================================================");
    ns.tprint("USAGE: run simpleHack.js <target>");
    ns.tprint("EXAMPLE: run simpleHack.js n00dles");
    ns.tprint("LOGIC: Priority Weaken -> Grow to 30% -> Hack Loop");
    ns.tprint("==================================================================");
    return;
  }

  const target = String(ns.args[0]);

  // Encapsulated Port Checking and Cracking
  if (!checkAndNuke(ns, target)) {
    return;
  }

  // ============================================
  // INITIAL LOG AND THRESHOLDS
  // ============================================
  ns.tprint("--- Configuration ---");
  ns.tprint(`Target: ${target}`);
  ns.tprint("--------------------");
  ns.tprint(`Required Hacking: ${ns.getServerRequiredHackingLevel(target)}`);
  ns.tprint(`Money Max: ${ns.formatNumber(ns.getServerMaxMoney(target))}`);
  const minSec = ns.getServerMinSecurityLevel(target);
  ns.tprint(`Min Sec: ${minSec}`);
  ns.tprint("--------------------");

  // Control Thresholds
  const minSecTolerance = minSec + 1; // Security limit: 1 above minimum
  const minMoneyThreshold = ns.getServerMaxMoney(target) * 0.30; // Money limit: 50% of maximum

  // ============================================
  // FULL LOOP (Pure Threshold Logic)
  // ============================================
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");
  ns.print(`TARGET = ${target}`);

  let wCount = 0, gCount = 0, hCount = 0; // Global operation counters

  // Auxiliary log function
  const logState = (op, count, money, sec) => {
    ns.print(
      `${op}: ${count} | ` +
      `Sec: ${sec.toFixed(2)} / ${minSecTolerance} | ` +
      `Money: ${ns.formatNumber(money)} / ${ns.formatNumber(ns.getServerMaxMoney(target))}`
    );
  };

  while (true) {
    const money = ns.getServerMoneyAvailable(target);
    const sec = ns.getServerSecurityLevel(target);

    // 1. WEAKEN (Priority: High Security)
    // Runs in a loop until the security threshold is reached.
    if (sec > minSecTolerance) {
      ns.print(`Starting WEAKEN: Sec ${sec.toFixed(2)} > ${minSecTolerance}.`);

      // Inner loop that continues until the threshold is met
      while (ns.getServerSecurityLevel(target) > minSecTolerance) {
        wCount++;
        logState("WEAKEN", wCount, ns.getServerMoneyAvailable(target), ns.getServerSecurityLevel(target));
        await ns.weaken(target);
      }

      continue; // Re-evaluate server conditions
    }

    // 2. GROW (Priority: Low Money)
    // Runs in a loop until the money threshold is reached.
    if (money < minMoneyThreshold) {
      ns.print(`Starting GROW: Money ${ns.formatNumber(money)} < ${ns.formatNumber(minMoneyThreshold)}.`);

      // Inner loop that continues until the threshold is met
      while (ns.getServerMoneyAvailable(target) < minMoneyThreshold) {
        gCount++;
        logState("GROW", gCount, ns.getServerMoneyAvailable(target), ns.getServerSecurityLevel(target));
        await ns.grow(target);
      }

      continue; // Re-evaluate server conditions (since grow increases security)
    }

    // 3. HACK (Optimal Condition)
    // Runs in a loop until security rises OR money drops below the threshold.
    if (sec <= minSecTolerance && money >= minMoneyThreshold) {
      ns.print("Starting HACK: Server is ready.");

      // Inner loop that runs as long as optimal conditions are maintained
      while (ns.getServerSecurityLevel(target) <= minSecTolerance && ns.getServerMoneyAvailable(target) >= minMoneyThreshold) {
        hCount++;
        logState("HACK", hCount, ns.getServerMoneyAvailable(target), ns.getServerSecurityLevel(target));
        await ns.hack(target);
      }
    }

    // If there's nothing to do, wait briefly to avoid unnecessary cycles.
    await ns.sleep(500);
  }
}

// ============================================
// CRACKING AUXILIARY FUNCTION
// ============================================
function checkAndNuke(ns, target) {
  // Checks if the target is accessible
  if (ns.getServerMaxRam(target) < 0) {
    ns.tprint(`ERROR: Target ${target} is not a valid hacking target.`);
    return false;
  }

  if (ns.hasRootAccess(target)) {
    ns.print(`Root access already established on ${target}.`);
    return true;
  }

  const needed = ns.getServerNumPortsRequired(target);
  const crackers = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe"
  ];

  const availableCrackers = crackers.filter(tool => ns.fileExists(tool, "home"));
  const have = availableCrackers.length;

  if (have < needed) {
    ns.tprint("ERROR: Not enough port-cracking programs.");
    ns.tprint(`Target ${target} requires ${needed} ports open, but you can only open ${have}.`);
    ns.tprint("Install more port tools before running this script.");
    return false;
  }

  // Crack and NUKE
  availableCrackers.forEach(tool => {
    switch (tool) {
      case "BruteSSH.exe": ns.brutessh(target); break;
      case "FTPCrack.exe": ns.ftpcrack(target); break;
      case "relaySMTP.exe": ns.relaysmtp(target); break;
      case "HTTPWorm.exe": ns.httpworm(target); break;
      case "SQLInject.exe": ns.sqlinject(target); break;
    }
  });

  ns.nuke(target);

  if (!ns.hasRootAccess(target)) {
    ns.tprint("ERROR: NUKE failed or hacking level is too low.");
    return false;
  }

  return true;
}
