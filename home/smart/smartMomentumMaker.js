/**
 * VERSION: 1.0.0
 * Smart Momentum Maker
 *
 * DESCRIPTION:
 * Optimized for stock market manipulation by creating clear price trends.
 *
 * STRATEGY:
 * 1. Weaken to minimum security
 * 2. HACK PHASE: Launch 1-thread hack + 1-thread weaken pairs with 4s spacing until money empty
 * 3. GROW PHASE: Launch 1-thread grow + 1-thread weaken pairs with 4s spacing until money full
 * 4. Loop
 *
 * PARAMETERS:
 * - target: Server hostname to manipulate
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
const BATCH_DELAY = 4000;

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

  if (!ns.fileExists(HACK_PATH) || !ns.fileExists(WEAKEN_PATH) || !ns.fileExists(GROW_PATH)) {
    ns.tprint(`${t()} ❌ FATAL ERROR: Missing scripts in /smart/ directory.`);
    return;
  }

  const weakenRam = ns.getScriptRam(WEAKEN_PATH);
  const growRam = ns.getScriptRam(GROW_PATH);
  const hackRam = ns.getScriptRam(HACK_PATH);
  const batchRam = hackRam + weakenRam;

  const getS = () => ns.getServer(target);

  function isScriptRunning(scriptPath) {
    return ns.ps(thisServer).some(p => p.filename === scriptPath);
  }

  async function waitForScriptsToFinish(scriptPath) {
    while (isScriptRunning(scriptPath)) {
      await ns.sleep(500);
    }
  }

  ns.tprint(`${t()} 🚀 Starting Smart Momentum Maker on ${target}`);

  while (true) {
    const s = getS();
    const money = s.moneyAvailable;
    const maxMoney = s.moneyMax;
    const sec = s.hackDifficulty;
    const minSec = s.minDifficulty;

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
    }

    // PHASE 2: HACK PHASE (drain money)
    if (money > maxMoney * 0.1) {
      // Wait for any GROW scripts to finish before starting HACK
      if (isScriptRunning(GROW_PATH)) {
        ns.print(`${t()} ⏳ [WAITING] Waiting for GROW scripts to finish...`);
        await waitForScriptsToFinish(GROW_PATH);
        ns.print(`${t()} ✅ [READY] All GROW scripts finished. Starting HACK phase.`);
      }

      ns.print(`${t()} 📉 [HACK PHASE] Money: ${ns.formatNumber(money)} / ${ns.formatNumber(maxMoney)}`);

      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      const maxBatches = Math.floor(freeRam / batchRam);

      if (maxBatches > 0) {
        for (let i = 0; i < maxBatches; i++) {
          const timestamp = Date.now() + i;
          ns.exec(HACK_PATH, thisServer, 1, target, timestamp);
          ns.exec(WEAKEN_PATH, thisServer, 1, target, timestamp + 1);
          await ns.sleep(BATCH_DELAY);
        }
      } else {
        await ns.sleep(5000);
      }
      continue;
    }

    // PHASE 3: GROW PHASE (fill money)
    if (money < maxMoney * 0.95) {
      // Wait for any HACK scripts to finish before starting GROW
      if (isScriptRunning(HACK_PATH)) {
        ns.print(`${t()} ⏳ [WAITING] Waiting for HACK scripts to finish...`);
        await waitForScriptsToFinish(HACK_PATH);
        ns.print(`${t()} ✅ [READY] All HACK scripts finished. Starting GROW phase.`);
      }
      ns.print(`${t()} 📈 [GROW PHASE] Money: ${ns.formatNumber(money)} / ${ns.formatNumber(maxMoney)}`);

      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      const growBatchRam = growRam + weakenRam;
      const maxBatches = Math.floor(freeRam / growBatchRam);

      if (maxBatches > 0) {
        for (let i = 0; i < maxBatches; i++) {
          const timestamp = Date.now() + i;
          ns.exec(GROW_PATH, thisServer, 1, target, timestamp);
          ns.exec(WEAKEN_PATH, thisServer, 1, target, timestamp + 1);
          await ns.sleep(BATCH_DELAY);
        }
      } else {
        await ns.sleep(5000);
      }
      continue;
    }

    // Money is full, restart hack phase
    await ns.sleep(1000);
  }
}
