/**
 * VERSION: 6.0.0
 * Smart Momentum Maker
 *
 * DESCRIPTION:
 * Optimized for stock market manipulation by creating clear price trends.
 * Uses RAM-aware thread calculation for maximum efficiency.
 *
 * STRATEGY:
 * 1. Weaken to minimum security
 * 2. HACK PHASE: Calculate optimal hack+weaken threads, use all available RAM
 * 3. GROW PHASE: Calculate optimal grow+weaken threads, use all available RAM
 * 4. Loop
 *
 * PARAMETERS:
 * - target: Server hostname to manipulate
 *
 * PORT USAGE:
 * - Port 80: Sends {target: "servername", phase: "HACK"/"GROW"} on state transitions only
 *   - GROW→HACK transition: Sends "HACK" (stock should sell, price will drop)
 *   - HACK→GROW transition: Sends "GROW" (stock should buy, price will rise)
 *
 * USAGE: run smart/smartMomentumMaker.js <target>
 */

export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  return [];
}

const HACK_PATH = "/smart/basic-hack.js";
const WEAKEN_PATH = "/smart/basic-weaken.js";
const GROW_PATH = "/smart/basic-grow.js";

const HACK_SECURITY = 0.002;
const GROW_SECURITY = 0.004;
const WEAKEN_SECURITY = 0.05;

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length === 0) {
    ns.tprint("❌ USAGE: smartMomentumMaker.js <target>");
    return;
  }

  const target = String(ns.args[0]);
  const thisServer = ns.getHostname();

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
  };

  ns.tprint(`${t()} [DEBUG] target=${target} | thisServer=${thisServer}`);

  if (!ns.fileExists(HACK_PATH) || !ns.fileExists(WEAKEN_PATH) || !ns.fileExists(GROW_PATH)) {
    ns.tprint(`${t()} ❌ FATAL ERROR: Missing scripts in /smart/ directory.`);
    return;
  }

  if (!ns.fileExists("Formulas.exe", "home")) {
    ns.tprint(`${t()} ❌ FATAL ERROR: Missing Formulas.exe - required for thread calculations.`);
    return;
  }

  const weakenRam = ns.getScriptRam(WEAKEN_PATH);
  const growRam = ns.getScriptRam(GROW_PATH);
  const hackRam = ns.getScriptRam(HACK_PATH);

  const getS = () => ns.getServer(target);
  const getP = () => ns.getPlayer();

  function isScriptRunning(scriptPath) {
    return ns.ps(thisServer).some(p => p.filename === scriptPath);
  }

  async function waitForScriptsToFinish(scriptPath) {
    while (isScriptRunning(scriptPath)) {
      await ns.sleep(500);
    }
  }

  ns.tprint(`${t()} 🚀 Starting Smart Momentum Maker on ${target}`);

  let currentState = "HACK";

  while (true) {
    ns.print(`${t()} Starting loop... again.`);
    const s = getS();
    const money = s.moneyAvailable;
    const maxMoney = s.moneyMax;
    const sec = s.hackDifficulty;
    const minSec = s.minDifficulty;

    ns.print(`${t()} [VALUES] money=${ns.formatNumber(money)}/${ns.formatNumber(maxMoney)} (${(money / maxMoney * 100).toFixed(1)}%) | sec=${sec.toFixed(2)}/${minSec.toFixed(2)}`);

    // PHASE 1: WEAKEN TO MINIMUM
    if (sec > minSec + 5) {
      ns.print(`${t()} [WEAKEN] Sec: ${sec.toFixed(2)} > Min: ${minSec.toFixed(2)}`);
      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      const threads = Math.floor(freeRam / weakenRam);

      if (threads > 0) {
        ns.exec(WEAKEN_PATH, thisServer, threads, target, Date.now());
        await ns.sleep(2000);
      } else {
        await ns.sleep(5000);
      }
      continue;
    } else {
      ns.print(`${t()} [DEBUG] WEAKEN SKIP: sec=${sec.toFixed(2)} <= minSec+5=${(minSec + 5).toFixed(2)}`);
    }

    // PHASE 2: HACK PHASE (drain money)
    if (currentState === "HACK") {
      if (isScriptRunning(GROW_PATH)) {
        ns.print(`${t()} ⏳ [WAITING] Waiting for GROW scripts to finish...`);
        await waitForScriptsToFinish(GROW_PATH);
        ns.print(`${t()} ✅ [READY] All GROW scripts finished. Starting HACK phase.`);
      }

      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      const player = getP();

      const hackPercent = ns.formulas.hacking.hackPercent(s, player);
      const stealRatio = 0.5;
      const hackIdeal = Math.max(1, Math.floor(stealRatio / hackPercent));
      const weakenIdeal = Math.max(1, Math.ceil((hackIdeal * HACK_SECURITY) / WEAKEN_SECURITY));

      const maxHackThreads = Math.floor(freeRam / hackRam);
      const hackThreads = Math.min(hackIdeal, maxHackThreads);
      const hackRamUsed = hackThreads * hackRam;
      const ramLeftAfterHack = freeRam - hackRamUsed;
      const maxWeakenThreads = Math.floor(ramLeftAfterHack / weakenRam);
      const weakenThreads = Math.min(weakenIdeal, maxWeakenThreads);

      const totalRamUsed = hackRamUsed + (weakenThreads * weakenRam);

      if (hackThreads > 0 && weakenThreads > 0) {
        ns.print(`${t()} 📉 [HACK PHASE] H=${hackThreads}/${hackIdeal} W=${weakenThreads}/${weakenIdeal} (${ns.formatRam(totalRamUsed)}) | Money: ${ns.formatNumber(money)} / ${ns.formatNumber(maxMoney)}`);

        ns.exec(HACK_PATH, thisServer, hackThreads, target, Date.now());
        ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, Date.now() + 1);

        ns.print(`${t()} ⏳ [HACK PHASE] Waiting for completion...`);
        await waitForScriptsToFinish(HACK_PATH);
        const afterHackMoney = getS().moneyAvailable;
        const afterHackPercent = (afterHackMoney / maxMoney * 100).toFixed(1);
        ns.print(`${t()} ✅ [HACK PHASE] Complete! Money after: ${ns.formatNumber(afterHackMoney)} / ${ns.formatNumber(maxMoney)} (${afterHackPercent}%)`);
        if (afterHackMoney < maxMoney * 0.1) {
          currentState = "GROW";
          ns.writePort(80, JSON.stringify({ target: target, phase: "GROW" }));
          ns.print(`${t()} 🔄 [STATE TRANSITION] HACK → GROW | 📡 Sent GROW to port 80`);
        }
      } else if (hackThreads > 0) {
        ns.print(`${t()} ⚠️ [HACK PHASE] Only hack fits - H=${hackThreads}/${hackIdeal}`);
        ns.exec(HACK_PATH, thisServer, hackThreads, target, Date.now());
        await waitForScriptsToFinish(HACK_PATH);
      } else {
        ns.print(`${t()} ❌ Not enough RAM for hack phase`);
        await ns.sleep(5000);
      }
      continue;
    } else {
      ns.print(`${t()} [DEBUG] HACK SKIP: currentState=${currentState}`);
    }

    // PHASE 3: GROW PHASE (fill money)
    if (currentState === "GROW") {
      if (isScriptRunning(HACK_PATH)) {
        ns.print(`${t()} ⏳ [WAITING] Waiting for HACK scripts to finish...`);
        await waitForScriptsToFinish(HACK_PATH);
        ns.print(`${t()} ✅ [READY] All HACK scripts finished. Starting GROW phase.`);
      }

      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      const player = getP();

      const growIdeal = Math.max(1, Math.ceil(ns.formulas.hacking.growThreads(s, player, maxMoney)));
      const weakenIdeal = Math.max(1, Math.ceil((growIdeal * GROW_SECURITY) / WEAKEN_SECURITY));

      const maxGrowThreads = Math.floor(freeRam / growRam);
      const growThreads = Math.min(growIdeal, maxGrowThreads);
      const growRamUsed = growThreads * growRam;

      const ramLeftAfterGrow = freeRam - growRamUsed;
      const maxWeakenThreads = Math.floor(ramLeftAfterGrow / weakenRam);
      const weakenThreads = Math.min(weakenIdeal, maxWeakenThreads);

      const totalRamUsed = growRamUsed + (weakenThreads * weakenRam);

      if (growThreads > 0 && weakenThreads > 0) {
        ns.print(`${t()} 📈 [GROW PHASE] G=${growThreads}/${growIdeal} W=${weakenThreads}/${weakenIdeal} (${ns.formatRam(totalRamUsed)}) | Money: ${ns.formatNumber(money)} / ${ns.formatNumber(maxMoney)}`);

        ns.exec(GROW_PATH, thisServer, growThreads, target, Date.now());
        ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, Date.now() + 1);

        ns.print(`${t()} ⏳ [GROW PHASE] Waiting for completion...`);
        await waitForScriptsToFinish(GROW_PATH);
        const afterGrowMoney = getS().moneyAvailable;
        const afterGrowPercent = (afterGrowMoney / maxMoney * 100).toFixed(1);
        ns.print(`${t()} ✅ [GROW PHASE] Complete! Money after: ${ns.formatNumber(afterGrowMoney)} / ${ns.formatNumber(maxMoney)} (${afterGrowPercent}%)`);
        if (afterGrowMoney >= maxMoney * 0.95) {
          currentState = "HACK";
          ns.writePort(80, JSON.stringify({ target: target, phase: "HACK" }));
          ns.print(`${t()} 🔄 [STATE TRANSITION] GROW → HACK | 📡 Sent HACK to port 80`);
        }
      } else if (growThreads > 0) {
        ns.print(`${t()} ⚠️ [GROW PHASE] Only grow fits - G=${growThreads}/${growIdeal}`);
        ns.exec(GROW_PATH, thisServer, growThreads, target, Date.now());
        await waitForScriptsToFinish(GROW_PATH);
      } else {
        ns.print(`${t()} ❌ Not enough RAM for grow phase`);
        await ns.sleep(5000);
      }
      continue;
    } else {
      ns.print(`${t()} [DEBUG] GROW SKIP: currentState=${currentState}`);
    }

    await ns.sleep(1000);
  }
}
