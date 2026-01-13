/** * Smart Batch No Formula (V1.1)
 * Executa sequencialmente Hack, Grow e Weaken monitorando o término dos PIDs.
 * * @param {NS} ns
 */
export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  return [];
}

const HACK_PATH = "/smart/basic-hack.js";
const WEAKEN_PATH = "/smart/basic-weaken.js";
const GROW_PATH = "/smart/basic-grow.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length === 0) {
    ns.tprint("USAGE: smartBatchNoFormula.js <target>");
    return;
  }

  const target = String(ns.args[0]);
  const thisServer = ns.getHostname();

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
  };

  // --- FILE CHECK ---
  if (!ns.fileExists(HACK_PATH) || !ns.fileExists(WEAKEN_PATH) || !ns.fileExists(GROW_PATH)) {
    ns.tprint(`${t()} ❌ FATAL ERROR: Missing scripts in /smart/ directory.`);
    return;
  }

  const weakenRam = ns.getScriptRam(WEAKEN_PATH);
  const growRam = ns.getScriptRam(GROW_PATH);
  const hackRam = ns.getScriptRam(HACK_PATH);

  // --- HELPER FUNCTIONS ---
  const getS = () => ns.getServer(target);

  async function waitProcess(pid) {
    if (pid === 0) return;
    while (ns.isRunning(pid)) {
      await ns.sleep(500);
    }
  }

  async function runMaxThreads(path, ramUsage, label) {
    const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
    let threads = Math.floor(freeRam / ramUsage);

    // REDUCE THREADS BY 1
    threads = Math.max(0, threads - 1);

    if (threads > 0) {
      ns.print(`${t()} [${label}] Executing with ${threads} threads.`);
      const pid = ns.exec(path, thisServer, threads, target, 0);
      return pid;
    }
    return 0;
  }

  ns.tprint(`${t()} Starting SmartBatchNoFormula on ${target}`);

  while (true) {
    const s = getS();
    const money = s.moneyAvailable;
    const maxMoney = s.moneyMax;
    const sec = s.hackDifficulty;
    const minSec = s.minDifficulty;

    // 1. PRIORIDADE: SECURITY (WEAKEN)
    if (sec > minSec + 10.00) {
      ns.print(`${t()} [WEAKEN] Sec: ${sec.toFixed(3)} > Min: ${minSec.toFixed(3)}. Reason: High Security.`);
      const pid = await runMaxThreads(WEAKEN_PATH, weakenRam, "WEAKEN-EXEC");
      if (pid === 0) {
        ns.print(`${t()} [WAIT] Low RAM for Weaken.`);
        await ns.sleep(2000);
      } else {
        await waitProcess(pid);
      }
      continue;
    }

    // 2. PRIORIDADE: MONEY (GROW)
    if (money < maxMoney) {
      ns.print(`${t()} [GROW] Money: ${ns.formatNumber(money)} < Max: ${ns.formatNumber(maxMoney)}. Reason: Target not saturated.`);
      const pid = await runMaxThreads(GROW_PATH, growRam, "GROW-EXEC");
      if (pid === 0) {
        ns.print(`${t()} [WAIT] Low RAM for Grow.`);
        await ns.sleep(2000);
      } else {
        await waitProcess(pid);
      }
      continue;
    }

    // 3. EXECUÇÃO: HACK
    const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
    let threads = Math.floor(freeRam / hackRam);

    // REDUCE THREADS BY 1
    threads = Math.max(0, threads - 1);

    if (threads > 0) {
      ns.print(`${t()} [HACK] Money/Sec OK. Executing Hack with ${threads} threads.`);
      const pid = ns.exec(HACK_PATH, thisServer, threads, target, 0);
      if (pid === 0) {
        ns.print(`${t()} [WAIT] Low RAM for Hack.`);
        await ns.sleep(2000);
      } else {
        await waitProcess(pid);
      }
    } else {
      ns.print(`${t()} [WAIT] Low RAM for Hack.`);
      await ns.sleep(2000);
    }

    await ns.sleep(100);
  }
}
