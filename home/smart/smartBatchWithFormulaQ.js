/**
 * Smart Batch - RAM Optimized HWGW
 * Version 1.2 - ENHANCED PREP
 * 
 * Features:
 * - Automatic server preparation (security + money)
 * - Smart COMBO mode (weaken + grow simultaneously)
 * - RAM-aware thread calculation with fallbacks
 * - Binary search for maximum RAM utilization
 * - HWGW batch execution with timing
 * - Percentage-based success tolerance (20% security, 99% money)
 * - Comprehensive debug logging
 * 
 * @param {NS} ns
 */
export function autocomplete(data, args) {
  if (args.length === 1) {
    return data.servers;
  }
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const t = () => `[${new Date().toLocaleTimeString("en-US", { hour12: false })}]`;

  if (ns.args.length === 0 || ns.args[0] === "-h") {
    ns.tprint(`${t()} USAGE: smartBatchWithFormula.js <target>`);
    return;
  }

  const thisServer = ns.getHostname();
  const target = String(ns.args[0]);

  // Basic validation
  if (!ns.serverExists(target)) {
    ns.tprint(`${t()} ❌ Target server ${target} does not exist`);
    return;
  }

  if (target === "home" || target === thisServer) {
    ns.tprint(`${t()} ❌ Target cannot be 'home' or executing server`);
    return;
  }

  if (!ns.fileExists("Formulas.exe", "home")) {
    ns.tprint(`${t()} ❌ Missing Formulas.exe`);
    return;
  }

  // Script paths
  const WEAKEN_PATH = "/smart/basic-weaken.js";
  const GROW_PATH = "/smart/basic-grow.js";
  const HACK_PATH = "/smart/basic-hack.js";
  
  if (!ns.fileExists(WEAKEN_PATH, thisServer) || !ns.fileExists(GROW_PATH, thisServer) || !ns.fileExists(HACK_PATH, thisServer)) {
    ns.tprint(`${t()} ❌ Missing scripts: ${HACK_PATH}, ${WEAKEN_PATH}, ${GROW_PATH}`);
    return;
  }

  // Get RAM requirements
  const weakenRam = ns.getScriptRam(WEAKEN_PATH);
  const growRam = ns.getScriptRam(GROW_PATH);
  const hackRam = ns.getScriptRam(HACK_PATH);

  // State machine
  const STATE = { PREP: "PREP", BATCH: "BATCH" };
  let currentState = STATE.PREP;
  let stealRatio = 0.25; // Steal 25% of money

  // Main loop
  while (true) {
    const server = ns.getServer(target);
    const player = ns.getPlayer();
    const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
    
    switch (currentState) {
      case STATE.PREP:
        const securityOk = server.hackDifficulty <= server.minDifficulty + 5;
        const moneyOk = server.moneyAvailable >= server.moneyMax * 0.95;
        
        ns.print(`${t()} 🛠️  PREP: Security=${server.hackDifficulty.toFixed(2)}/${server.minDifficulty.toFixed(2)} ${securityOk ? '✅' : '❌'} | Money=${ns.formatNumber(server.moneyAvailable)}/${ns.formatNumber(server.moneyMax)} ${moneyOk ? '✅' : '❌'}`);
        
        if (securityOk && moneyOk) {
          ns.tprint(`${t()} ✅ Server ${target} prepared - starting batch operations`);
          currentState = STATE.BATCH;
          break;
        }
        
        // Wait for running processes to finish
        if (ns.ps(thisServer).length > 1) {
          ns.print(`${t()} ⏳ Waiting for processes to complete...`);
          await ns.sleep(2000);
          break;
        }
        
        // Priority: Fix security and money together when possible
        if (!securityOk && !moneyOk) {
          ns.print(`${t()} 🔄 COMBO: Both security and money need fixing`);
          
          // Calculate weaken needs (limited by available RAM)
          const securityReduction = server.hackDifficulty - server.minDifficulty;
          const weakenIdeal = Math.ceil(securityReduction / 0.05);
          const maxWeakenThreads = Math.floor(freeRam / weakenRam);
          const weakenThreads = Math.min(weakenIdeal, maxWeakenThreads);
          const weakenRamUsed = weakenThreads * weakenRam;
          
          // Calculate grow needs (limited by remaining RAM)
          const ramLeftAfterWeaken = freeRam - weakenRamUsed;
          const growIdeal = Math.ceil(ns.formulas.hacking.growThreads(server, player, server.moneyMax));
          const maxGrowThreads = Math.floor(ramLeftAfterWeaken / growRam);
          const growThreads = Math.min(growIdeal, maxGrowThreads);
          const growRamUsed = growThreads * growRam;
          
          const totalRamUsed = weakenRamUsed + growRamUsed;
          
          if (weakenThreads > 0 && growThreads > 0) {
            ns.print(`${t()} ✨ COMBO EXECUTION: W=${weakenThreads}/${weakenIdeal} + G=${growThreads}/${growIdeal} (${ns.formatRam(totalRamUsed)})`);
            ns.print(`${t()} 📍 EXEC LOCATION: COMBO-WEAKEN (${weakenThreads} threads)`);
            ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, 0);
            ns.print(`${t()} 📍 EXEC LOCATION: COMBO-GROW (${growThreads} threads)`);
            ns.exec(GROW_PATH, thisServer, growThreads, target, 0);
          } else if (weakenThreads > 0) {
            ns.print(`${t()} 🔒 PRIORITY: Only weaken fits - W=${weakenThreads}/${weakenIdeal}`);
            ns.print(`${t()} 📍 EXEC LOCATION: COMBO-WEAKEN-ONLY (${weakenThreads} threads)`);
            ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, 0);
          } else {
            ns.print(`${t()} ❌ Not enough RAM for any operation`);
          }
        } else if (!securityOk) {
          ns.print(`${t()} 🔒 PRIORITY: Security needs fixing (${server.hackDifficulty.toFixed(2)} > ${(server.minDifficulty + 5).toFixed(2)})`);
          // Calculate exact threads needed for weaken
          const securityReduction = server.hackDifficulty - server.minDifficulty;
          const threadsNeeded = Math.ceil(securityReduction / 0.05);
          const maxWeakenThreads = Math.floor(freeRam / weakenRam);
          const weakenThreads = Math.min(threadsNeeded, maxWeakenThreads);
          
          if (weakenThreads > 0) {
            const ramUsed = weakenThreads * weakenRam;
            const ramLeft = freeRam - ramUsed;
            
            ns.print(`${t()} 🔒 Weakening with ${weakenThreads}/${threadsNeeded} threads (${ns.formatRam(ramUsed)})`);
            ns.print(`${t()} 📍 EXEC LOCATION: SECURITY-PRIORITY (${weakenThreads} threads)`);
            ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, 0);
            
            // Use remaining RAM for grow if money also needs fixing
            if (!moneyOk && ramLeft >= growRam) {
              const bonusGrowThreads = Math.floor(ramLeft / growRam);
              ns.print(`${t()} 💰 BONUS: Using leftover RAM for ${bonusGrowThreads} grow threads`);
              ns.print(`${t()} 📍 EXEC LOCATION: SECURITY-BONUS-GROW (${bonusGrowThreads} threads)`);
              ns.exec(GROW_PATH, thisServer, bonusGrowThreads, target, 0);
            }
          } else {
            ns.print(`${t()} ❌ Not enough RAM for weaken: need ${ns.formatRam(weakenRam)}, have ${ns.formatRam(freeRam)}`);
          }
        } else if (!moneyOk) {
          const moneyPercent = (server.moneyAvailable / server.moneyMax) * 100;
          ns.print(`${t()} 💰 PRIORITY: Money needs fixing (${moneyPercent.toFixed(1)}% < 95%)`);
          
          // Calculate optimal threads needed to reach max money
          const formulaResult = ns.formulas.hacking.growThreads(server, player, server.moneyMax);
          const optimalGrowThreads = Math.ceil(formulaResult);
          const maxGrowThreads = Math.floor(freeRam / growRam);
          const growThreads = Math.min(optimalGrowThreads, maxGrowThreads);
          
          if (growThreads > 0) {
            ns.print(`${t()} ✅ EXECUTING: Growing with ${growThreads} threads`);
            ns.print(`${t()} 📍 EXEC LOCATION: MONEY-PRIORITY (${growThreads} threads)`);
            ns.exec(GROW_PATH, thisServer, growThreads, target, 0);
          } else {
            ns.print(`${t()} ❌ Not enough RAM for grow: need ${ns.formatRam(growRam)}, have ${ns.formatRam(freeRam)}`);
          }
        }
        
        await ns.sleep(1000);
        break;
        
      case STATE.BATCH:
        // Check if server is still in optimal state
        const batchSecurityOk = server.hackDifficulty <= server.minDifficulty + 5;
        const batchMoneyOk = server.moneyAvailable >= server.moneyMax * 0.95;
        
        if (!batchSecurityOk || !batchMoneyOk) {
          ns.tprint(`${t()} ⚠️  Server ${target} state degraded - returning to PREP`);
          currentState = STATE.PREP;
          await ns.sleep(1000);
          break;
        }
        
        // Find maximum steal ratio that fits in available RAM
        const hackPercent = ns.formulas.hacking.hackPercent(server, player);
        let maxStealRatio = 0.95; // Start with 95% steal ratio
        let bestBatch = null;
        
        // Binary search for optimal steal ratio
        let minRatio = 0.01;
        let maxRatio = maxStealRatio;
        
        while (maxRatio - minRatio > 0.01) {
          const testRatio = (minRatio + maxRatio) / 2;
          const testHackThreads = Math.max(1, Math.floor(testRatio / hackPercent));
          
          const moneyAfterHack = server.moneyAvailable * (1 - (testHackThreads * hackPercent));
          const testGrowThreads = Math.max(1, Math.ceil(ns.formulas.hacking.growThreads({
            ...server,
            moneyAvailable: moneyAfterHack
          }, player, server.moneyMax)));
          
          const testWeakenHack = Math.max(1, Math.ceil((testHackThreads * 0.002) / 0.05));
          const testWeakenGrow = Math.max(1, Math.ceil((testGrowThreads * 0.004) / 0.05));
          
          const testTotalRam = (testHackThreads * hackRam) + (testGrowThreads * growRam) + 
                              (testWeakenHack * weakenRam) + (testWeakenGrow * weakenRam);
          
          if (testTotalRam <= freeRam) {
            bestBatch = {
              hackThreads: testHackThreads,
              growThreads: testGrowThreads,
              weakenThreadsHack: testWeakenHack,
              weakenThreadsGrow: testWeakenGrow,
              totalRam: testTotalRam,
              stealRatio: testRatio
            };
            minRatio = testRatio;
          } else {
            maxRatio = testRatio;
          }
        }
        
        if (!bestBatch) {
          ns.print(`${t()} ⚠️  Cannot fit even minimal batch in available RAM`);
          await ns.sleep(5000);
          break;
        }
        
        const { hackThreads, growThreads, weakenThreadsHack, weakenThreadsGrow, totalRam, stealRatio: finalStealRatio } = bestBatch;
        
        ns.print(`${t()} 📊 Optimized batch: Steal=${(finalStealRatio*100).toFixed(1)}% RAM=${ns.formatRam(totalRam)}/${ns.formatRam(freeRam)} (${((totalRam/freeRam)*100).toFixed(1)}%)`);
        
        // Calculate timing
        const hackTime = ns.formulas.hacking.hackTime(server, player);
        const growTime = ns.formulas.hacking.growTime(server, player);
        const weakenTime = ns.formulas.hacking.weakenTime(server, player);
        
        const now = Date.now();
        const hackStart = now + weakenTime - hackTime - 20;
        const weaken1Start = now + weakenTime - 10;
        const growStart = now + weakenTime - growTime + 10;
        const weaken2Start = now + 20;
        
        ns.print(`${t()} 🚀 Executing batch: H=${hackThreads} W=${weakenThreadsHack} G=${growThreads} W=${weakenThreadsGrow} (${ns.formatRam(totalRam)})`);
        
        // Execute HWGW
        ns.print(`${t()} 📍 EXEC LOCATION: BATCH-HACK (${hackThreads} threads)`);
        ns.exec(HACK_PATH, thisServer, hackThreads, target, hackStart);
        ns.print(`${t()} 📍 EXEC LOCATION: BATCH-WEAKEN-1 (${weakenThreadsHack} threads)`);
        ns.exec(WEAKEN_PATH, thisServer, weakenThreadsHack, target, weaken1Start);
        ns.print(`${t()} 📍 EXEC LOCATION: BATCH-GROW (${growThreads} threads)`);
        ns.exec(GROW_PATH, thisServer, growThreads, target, growStart);
        ns.print(`${t()} 📍 EXEC LOCATION: BATCH-WEAKEN-2 (${weakenThreadsGrow} threads)`);
        ns.exec(WEAKEN_PATH, thisServer, weakenThreadsGrow, target, weaken2Start);
        
        // Wait for batch to complete, then check results
        const batchDuration = Math.max(hackTime, growTime, weakenTime) + 500; // +500ms buffer
        ns.print(`${t()} ⏳ Waiting ${(batchDuration/1000).toFixed(1)}s for batch completion...`);
        await ns.sleep(batchDuration);
        
        // Ensure all processes are done before continuing
        let waitCount = 0;
        const currentProcesses = ns.ps(thisServer).filter(p => p.filename !== 'smart/smartBatchWithFormulaQ.js');
        while (currentProcesses.length > 0 && waitCount < 10) {
          ns.print(`${t()} ⚠️  Processes still running, waiting 1s more... (${currentProcesses.length} child processes)`);
          await ns.sleep(1000);
          waitCount++;
          currentProcesses.splice(0); // Clear array
          currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename !== 'smart/smartBatchWithFormulaQ.js'));
        }
        
        // Check server state after batch completion
        const postBatchServer = ns.getServer(target);
        const securityDiff = postBatchServer.hackDifficulty - postBatchServer.minDifficulty;
        const securityPercent = ((postBatchServer.hackDifficulty - postBatchServer.minDifficulty) / postBatchServer.minDifficulty) * 100;
        const moneyPercent = (postBatchServer.moneyAvailable / postBatchServer.moneyMax) * 100;
        
        ns.print(`${t()} 📊 BATCH RESULT: Security=${postBatchServer.hackDifficulty.toFixed(2)}/${postBatchServer.minDifficulty.toFixed(2)} (+${securityDiff.toFixed(2)}, +${securityPercent.toFixed(1)}%) | Money=${ns.formatNumber(postBatchServer.moneyAvailable)}/${ns.formatNumber(postBatchServer.moneyMax)} (${moneyPercent.toFixed(1)}%)`);
        
        if (securityPercent <= 20 && moneyPercent >= 99) {
          ns.print(`${t()} ✅ HWGW SUCCESS: Server maintained optimal state!`);
        } else {
          ns.print(`${t()} ⚠️  HWGW ISSUE: Server state not optimal after batch`);
        }
        break;
    }
    
    await ns.sleep(100);
  }
}