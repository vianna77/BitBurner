/**
 * Smart Batch (V2.2 - Added File Existence and Pre-Batch RAM Check).
 * Preps the target and starts a synchronized batch (Hack/Weaken/Grow/Weaken)
 * using Formulas.exe and running the scripts from /smart/ directory.
 *
 * @param {NS} ns
 */
export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  return [];
}

// ============================================================
// CONFIGURAÇÃO DE PATHS
// ============================================================
const HACK_PATH = "/smart/basic-hack.js";
const WEAKEN_PATH = "/smart/basic-weaken.js";
const GROW_PATH = "/smart/basic-grow.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length === 0 || ns.args[0] === "-h") {
    ns.tprint("USAGE: smartBatch.js <target>");
    return;
  }

  const thisServer = ns.getHostname();
  const target = String(ns.args[0]);

  // ============================================================
  // --- DEBUG VARS & VERIFICAÇÕES DE ARQUIVO ---
  // ============================================================
  ns.tprint("--- DEBUG VARS & FILE CHECK ---");
  ns.tprint(`Target Server: ${target}`);
  ns.tprint(`Executing Server: ${thisServer}`);

  if (!ns.serverExists(target)) {
    ns.tprint(`❌ FATAL ERROR: Target server ${target} does not exist. Exiting.`);
    return;
  }

  if (target === "home" || target === thisServer) {
    ns.tprint(`❌ FATAL ERROR: Target cannot be 'home' or the executing server (${thisServer}). Exiting.`);
    return;
  }

  if (!ns.fileExists("Formulas.exe", "home")) {
    ns.tprint("ERROR: Missing Formulas.exe. Exiting.");
    return;
  }

  // NOVA VERIFICAÇÃO DE ARQUIVOS BÁSICOS
  if (!ns.fileExists(HACK_PATH, thisServer) || !ns.fileExists(WEAKEN_PATH, thisServer) || !ns.fileExists(GROW_PATH, thisServer)) {
    ns.tprint(`❌ FATAL ERROR: One or more batch scripts are missing on ${thisServer} in the /smart/ directory.`);
    ns.tprint(`Check Paths: Hack=${HACK_PATH}, Weaken=${WEAKEN_PATH}, Grow=${GROW_PATH}`);
    return;
  }
  ns.tprint("Script Files check: OK");
  ns.tprint("--------------------");

  // Funções helper para obter dados do servidor e player
  function S() { return ns.getServer(target); }
  function P() { return ns.getPlayer(); }

  // ============================================================
  // ROOT & PREP (UNCHANGED LOGIC)
  // ============================================================
  if (!ns.hasRootAccess(target)) {
    if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(target);
    if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(target);
    if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(target);
    if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(target);
    if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(target);
    ns.nuke(target);
  }

  if (!ns.hasRootAccess(target)) {
    ns.tprint(`❌ FATAL ERROR: Failed to get Root Access on ${target}. Exiting.`);
    return;
  }

  ns.tprint(`Prepping ${target} to minSec and maxMoney...`);

  // Obtém RAM dos scripts com o caminho absoluto
  const weakenRam = ns.getScriptRam(WEAKEN_PATH);
  const growRam = ns.getScriptRam(GROW_PATH);
  const hackRam = ns.getScriptRam(HACK_PATH);

  if (weakenRam === 0 || growRam === 0 || hackRam === 0) {
    ns.tprint(`❌ FATAL ERROR: RAM calculation failed. This should not happen if file check passed. Exiting.`);
    return;
  }

  ns.tprint(`RAM Check: Weaken=${ns.formatRam(weakenRam)} | Grow=${ns.formatRam(growRam)} | Hack=${ns.formatRam(hackRam)}`);

  // Helper: waits until there is enough free RAM for one thread of a script 
  async function waitForRam(requiredRam) {
    while (true) {
      const free = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
      if (free >= requiredRam) return;
      await ns.sleep(50);
    }
  }

  async function runWeakenFull() {
    await waitForRam(weakenRam);
    const free = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
    const threads = Math.floor(free / weakenRam);
    ns.print(`runWeakenFull: free=${Math.floor(free)} threads=${threads}`);
    if (threads > 0) {
      ns.exec(WEAKEN_PATH, thisServer, threads, target, 0);
    }
    return threads;
  }

  async function runGrowFull() {
    await waitForRam(growRam);
    const free = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
    const threads = Math.floor(free / growRam);
    ns.print(`runGrowFull: free=${Math.floor(free)} threads=${threads}`);
    if (threads > 0) {
      ns.exec(GROW_PATH, thisServer, threads, target, 0);
    }
    return threads;
  }

  // -------- LOWER SECURITY & MAX MONEY -------- 
  while (S().hackDifficulty > S().minDifficulty) {
    const t = await runWeakenFull();
    if (t === 0) {
      ns.tprint(`⚠️ WARNING: Not enough RAM (1 thread = ${ns.formatRam(weakenRam)}) to run Weaken. Prep phase stalled.`);
      await ns.sleep(1000);
    }
    await ns.sleep(200);
  }

  while (S().moneyAvailable < S().moneyMax) {
    await runGrowFull();
    await ns.sleep(200);
    await runWeakenFull();
    await ns.sleep(200);
  }

  // ============================================================ 
  // FORMULAS CALCULATIONS 
  // ============================================================ 
  const player = P();
  const server = S();

  const hackTime = ns.formulas.hacking.hackTime(server, player);
  const growTime = ns.formulas.hacking.growTime(server, player);
  const weakenTime = ns.formulas.hacking.weakenTime(server, player);

  const hackPercent = ns.formulas.hacking.hackPercent(server, player);
  const stealRatio = 0.10;

  if (hackPercent <= 0) {
    ns.tprint(`❌ FATAL ERROR: HackPercent is 0 or negative! Player Hacking Level is too low for ${target}. Exiting.`);
    return;
  }

  const hackThreads = Math.max(1, Math.floor(stealRatio / hackPercent));
  const secPerHack = 0.002 * hackThreads;
  const secPerGrowThread = 0.004;
  const weakReduce = 0.05;

  const growMultiplier = 1 / (1 - stealRatio);
  const growThreads = Math.max(1, Math.ceil(ns.formulas.hacking.growThreads(server, player, growMultiplier)));

  const weakenThreadsHack = Math.max(1, Math.ceil(secPerHack / weakReduce));
  const weakenThreadsGrow = Math.max(1, Math.ceil((growThreads * secPerGrowThread) / weakReduce));

  // ============================================================ 
  // PRINT CALCULATIONS
  // ============================================================ 
  ns.tprint(`===== CALCULATED VALUES FOR ${target} =====`);
  ns.tprint(`HackTime:   ${ns.formatNumber(hackTime)} ms (${(hackTime / 1000).toFixed(2)} sec)`);
  ns.tprint(`GrowTime:   ${ns.formatNumber(growTime)} ms (${(growTime / 1000).toFixed(2)} sec)`);
  ns.tprint(`WeakenTime: ${ns.formatNumber(weakenTime)} ms (${(weakenTime / 1000).toFixed(2)} sec)`);
  ns.tprint("HackPercent: " + (hackPercent * 100).toFixed(6) + "%");
  ns.tprint("StealRatio: " + (stealRatio * 100).toFixed(0) + "%");
  ns.tprint("HackThreads: " + hackThreads);
  ns.tprint("GrowThreads: " + growThreads);
  ns.tprint("WeakenThreads(Hack): " + weakenThreadsHack);
  ns.tprint("WeakenThreads(Grow): " + weakenThreadsGrow);
  ns.tprint("Total Weaken Threads: " + (weakenThreadsHack + weakenThreadsGrow));
  ns.tprint("------------------------------------------");

  // RAM check for the batch
  const totalBatchRam = (hackThreads * hackRam) +
    (weakenThreadsHack * weakenRam) +
    (growThreads * growRam) +
    (weakenThreadsGrow * weakenRam);

  ns.tprint(`Total Batch RAM required: ${ns.formatRam(totalBatchRam)}`);
  if (totalBatchRam > ns.getServerMaxRam(thisServer)) {
    ns.tprint(`❌ WARNING: Total RAM for one batch exceeds maximum RAM on ${thisServer}!`);
  }

  // ============================================================ 
  // EXEC LOOP WITH SAFETY RECOVERY (uses 20% of maxMoney as threshold) 
  // ============================================================ 
  ns.tprint(`Starting batches for ${target} ...`);

  let batchPids = [];
  var countRuns = 1;

  while (true) {
    if (countRuns > 1000000000) {
      countRuns = 1;
    }
    // ======================================================== 
    // SAFETY CHECK & RAM CHECK ANTES DO BATCH
    // ======================================================== 
    const money = S().moneyAvailable;
    const sec = S().hackDifficulty;
    const minSec = S().minDifficulty;
    const maxMoney = S().moneyMax;
    const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);

    const threshold = 0.20 * maxMoney;

    if (money < threshold || sec > minSec + 0.5 || freeRam < totalBatchRam) { // <-- Verificação de RAM adicionada aqui
      ns.print("--- DEBUG SAFETY CHECK TRIGGERED ---");
      ns.print(`Money: ${ns.formatNumber(money)} (Threshold: ${ns.formatNumber(threshold)})`);
      ns.print(`Security: ${sec.toFixed(2)} (MinSec+0.5: ${(minSec + 0.5).toFixed(2)})`);
      if (freeRam < totalBatchRam) {
        ns.print(`RAM: ${ns.formatRam(freeRam)} (Needed: ${ns.formatRam(totalBatchRam)}) - RAM BLOCK TRIGGERED!`);
      }
      ns.print("------------------------------------");

      ns.print("Stopping hacks and restoring target...");

      // ... (Lógica de espera e restauração inalterada) ...

      // VERIFICAR E ESPERAR PROCESSOS TERMINAREM 
      if (batchPids.length > 0) {
        ns.print(`Waiting for ${batchPids.length} batch processes to finish...`);

        while (batchPids.length > 0) {
          await ns.sleep(500);

          const activePids = new Set(ns.ps(thisServer).map(p => p.pid));
          const runningPids = batchPids.filter(pid => activePids.has(pid));

          if (runningPids.length < batchPids.length) {
            ns.print(`${batchPids.length - runningPids.length} processes finished. ${runningPids.length} remaining.`);
          }

          batchPids = runningPids;
        }
        ns.print("All batch processes finished. Proceeding to restore.");
      }

      // RESTORE TARGET TO MAX MONEY + MIN SEC 
      while (S().moneyAvailable < maxMoney || S().hackDifficulty > minSec) {

        if (S().hackDifficulty > minSec) {
          ns.print("Restoring security...");
          await runWeakenFull();
        }

        if (S().moneyAvailable < maxMoney) {
          ns.print("Restoring money...");
          await runGrowFull();
          await runWeakenFull();
        }

        await ns.sleep(200);
      }

      ns.print("Target fully restored. Resuming batches...");
      await ns.sleep(100);
      continue; // Volta para checar tudo novamente
    }

    // ======================================================== 
    // NORMAL BATCHING 
    // ======================================================== 
    const now = Date.now();
    const tHackStart = now + weakenTime - hackTime - 1;
    const tWeaken1Start = now + weakenTime - 1;
    const tGrowStart = now + weakenTime - growTime - 1;
    const tWeaken2Start = now;

    (countRuns % 500 === 0) && ns.print("Preparing batch " + countRuns);

    // 1. Hack (H) - Execução com atraso e caminhos absolutos
    const pidHack = ns.exec(HACK_PATH, thisServer, hackThreads, target, tHackStart);
    await ns.sleep(5);

    // 2. Weaken 1 (W1)
    const pidWeaken1 = ns.exec(WEAKEN_PATH, thisServer, weakenThreadsHack, target, tWeaken1Start);
    await ns.sleep(5);

    // 3. Grow (G)
    const pidGrow = ns.exec(GROW_PATH, thisServer, growThreads, target, tGrowStart);
    await ns.sleep(5);

    // 4. Weaken 2 (W2)
    const pidWeaken2 = ns.exec(WEAKEN_PATH, thisServer, weakenThreadsGrow, target, tWeaken2Start);

    // Debug Detalhado da Falha (Para identificar exatamente qual falhou)
    if (pidHack === 0) ns.tprint(`❌ ERROR: Hack script (${HACK_PATH}) failed. PID=0.`);
    if (pidWeaken1 === 0) ns.tprint(`❌ ERROR: Weaken1 script (${WEAKEN_PATH}) failed. PID=0.`);
    if (pidGrow === 0) ns.tprint(`❌ ERROR: Grow script (${GROW_PATH}) failed. PID=0.`);
    if (pidWeaken2 === 0) ns.tprint(`❌ ERROR: Weaken2 script (${WEAKEN_PATH}) failed. PID=0.`);

    if (pidHack === 0 || pidWeaken1 === 0 || pidGrow === 0 || pidWeaken2 === 0) {
      // Se este bloco for acionado, significa que a RAM ficou indisponível no meio da execução 
      // (apesar do check inicial). Vamos retornar para evitar loops de falha.
      ns.tprint(`❌ CRITICAL FAILURE: Batch execution failed unexpectedly. Free RAM: ${ns.formatRam(ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer))}`);
      ns.tprint(`Hack PID: ${pidHack} | Weaken1 PID: ${pidWeaken1} | Grow PID: ${pidGrow} | Weaken2 PID: ${pidWeaken2}`);
      return;
    }

    batchPids.push(pidHack, pidWeaken1, pidGrow, pidWeaken2);

    await ns.sleep(100);
    countRuns = countRuns + 1;
  }
}
