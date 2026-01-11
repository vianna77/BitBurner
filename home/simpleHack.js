// VERSION: simpleHack.js v1.3.0
// DESCRIPTION: Single-target hacking script: Weaken at minSec+10 -> Grow to full -> Hack to empty.
// UPDATES: Simplified logic - weaken when sec > minSec+10, grow to full, hack to empty.

/** @param {NS} ns **/
export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.enableLog("hack");
  ns.enableLog("weaken");
  ns.enableLog("grow");

  // ============================================
  // SIMPLIFIED ARGUMENT VALIDATION
  // ============================================
  if (ns.args.length === 0 || ns.args[0] === "-h") {
    ns.tprint("==================================================================");
    ns.tprint("USAGE: run simpleHack.js <target>");
    ns.tprint("EXAMPLE: run simpleHack.js n00dles");
    ns.tprint("LOGIC: Weaken at minSec+10 -> Grow to full -> Hack to empty");
    ns.tprint("==================================================================");
    return;
  }

  const target = String(ns.args[0]);



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
  const secThreshold = minSec + 10; // Weaken when security > minSec + 10
  const maxMoney = ns.getServerMaxMoney(target); // Grow to full money

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
      `Sec: ${sec.toFixed(2)} / ${secThreshold} | ` +
      `Money: ${ns.formatNumber(money)} / ${ns.formatNumber(maxMoney)}`
    );
  };

  while (true) {
    const money = ns.getServerMoneyAvailable(target);
    const sec = ns.getServerSecurityLevel(target);

    // 1. WEAKEN when security > minSec + 10
    if (sec > secThreshold) {
      ns.print(`Starting WEAKEN: Sec ${sec.toFixed(2)} > ${secThreshold}.`);
      while (ns.getServerSecurityLevel(target) > secThreshold) {
        wCount++;
        logState("WEAKEN", wCount, ns.getServerMoneyAvailable(target), ns.getServerSecurityLevel(target));
        await ns.weaken(target);
      }
      continue;
    }

    // 2. GROW to full money
    if (money < maxMoney) {
      ns.print(`Starting GROW: Money ${ns.formatNumber(money)} < ${ns.formatNumber(maxMoney)}.`);
      while (ns.getServerMoneyAvailable(target) < maxMoney) {
        gCount++;
        logState("GROW", gCount, ns.getServerMoneyAvailable(target), ns.getServerSecurityLevel(target));
        await ns.grow(target);
      }
      continue;
    }

    // 3. HACK until empty
    if (money > 0) {
      ns.print("Starting HACK: Server has money.");
      while (ns.getServerMoneyAvailable(target) > 0) {
        hCount++;
        logState("HACK", hCount, ns.getServerMoneyAvailable(target), ns.getServerSecurityLevel(target));
        await ns.hack(target);
      }
    }

    // If there's nothing to do, wait briefly to avoid unnecessary cycles.
    await ns.sleep(500);
  }
}
