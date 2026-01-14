/**
 * VERSION: 8.5.0
 * Smart Momentum Maker
 *
 * DESCRIPTION:
 * Optimized for stock market manipulation by creating clear price trends.
 * Uses shadow objects for precise calculations and single large executions.
 *
 * STRATEGY:
 * 1. WEAKEN: Reduce security to minimum
 * 2. HACK: Drain money for 10 minutes (stock price drops)
 * 3. GROW: Fill money back up (stock price rises)
 * 4. Loop
 *
 * PARAMETERS:
 * - target: Server hostname to manipulate
 *
 * PORT USAGE:
 * - Port 80: Sends {target: "servername", phase: "HACK"/"GROW"} on state transitions only
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

const STATE = {
  WEAKEN: "WEAKEN",
  HACK: "HACK",
  GROW: "GROW"
};

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

  if (!ns.fileExists("Formulas.exe", "home")) {
    ns.tprint(`${t()} ❌ FATAL ERROR: Missing Formulas.exe - required for thread calculations.`);
    return;
  }

  const weakenRam = ns.getScriptRam(WEAKEN_PATH);
  const growRam = ns.getScriptRam(GROW_PATH);
  const hackRam = ns.getScriptRam(HACK_PATH);

  const getS = () => ns.getServer(target);
  const getP = () => ns.getPlayer();

  const shadowServer = (base, money, security) => ({
    ...base,
    moneyAvailable: money,
    hackDifficulty: security
  });

  const shadowPlayer = (base, hackLevel) => ({
    city: base.city,
    exp: base.exp,
    hp: base.hp,
    mults: base.mults,
    skills: {
      ...base.skills,
      hacking: hackLevel
    },
    entropy: base.entropy,
    factions: base.factions,
    jobs: base.jobs,
    karma: base.karma,
    location: base.location,
    money: base.money,
    numPeopleKilled: base.numPeopleKilled,
    totalPlaytime: base.totalPlaytime
  });

  function isScriptRunning(scriptPath) {
    return ns.ps(thisServer).some(p => p.filename === scriptPath);
  }

  ns.tprint(`${t()} 🚀 Starting Smart Momentum Maker on ${target}`);

  let currentState = STATE.HACK;
  let hackPhaseStartTime = Date.now();
  let growPhaseStartTime = 0;

  while (true) {
    const s = getS();
    const money = s.moneyAvailable;
    const maxMoney = s.moneyMax;
    const sec = s.hackDifficulty;
    const minSec = s.minDifficulty;

    ns.print(`${t()} [STATE=${currentState}] money=${ns.formatNumber(money)}/${ns.formatNumber(maxMoney)} (${(money / maxMoney * 100).toFixed(1)}%) | sec=${sec.toFixed(2)}/${minSec.toFixed(2)}`);

    // Check if security needs fixing first
    if (sec > minSec + 5) {
      currentState = STATE.WEAKEN;
    }

    switch (currentState) {
      case STATE.WEAKEN: {
        if (isScriptRunning(HACK_PATH) || isScriptRunning(GROW_PATH) || isScriptRunning(WEAKEN_PATH)) {
          await ns.sleep(2000);
          break;
        }

        const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
        const threads = Math.floor(freeRam / weakenRam);

        if (threads > 0) {
          const realPlayer = getP();
          const realServer = getS();
          const optimalServer = shadowServer(realServer, realServer.moneyMax, realServer.minDifficulty);
          const optimalPlayer = shadowPlayer(realPlayer, realPlayer.skills.hacking);
          const weakenTime = ns.formulas.hacking.weakenTime(optimalServer, optimalPlayer);

          ns.print(`${t()} 🔒 [WEAKEN] Executing ${threads} threads`);
          ns.exec(WEAKEN_PATH, thisServer, threads, target, Date.now());

          const duration = weakenTime + 500;
          ns.print(`${t()} ⏳ [WEAKEN] Waiting ${(duration / 1000).toFixed(1)}s...`);
          await ns.sleep(duration);

          let waitCount = 0;
          const currentProcesses = ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js');
          while (currentProcesses.length > 0 && waitCount < 10) {
            ns.print(`${t()} 🟡 [WEAKEN] Still running, waiting 1s more... (${currentProcesses.length} processes)`);
            await ns.sleep(1000);
            waitCount++;
            currentProcesses.splice(0);
            currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js'));
          }
        }

        if (sec <= minSec + 5) {
          currentState = STATE.HACK;
          hackPhaseStartTime = Date.now();
        }
        break;
      }

      case STATE.HACK: {
        if (isScriptRunning(GROW_PATH) || isScriptRunning(WEAKEN_PATH) || isScriptRunning(HACK_PATH)) {
          await ns.sleep(2000);
          break;
        }

        const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
        const realPlayer = getP();
        const realServer = getS();
        const optimalServer = shadowServer(realServer, realServer.moneyMax, realServer.minDifficulty);
        const optimalPlayer = shadowPlayer(realPlayer, realPlayer.skills.hacking);

        const hackPercent = ns.formulas.hacking.hackPercent(optimalServer, optimalPlayer);
        const hackTime = ns.formulas.hacking.hackTime(optimalServer, optimalPlayer);
        const weakenTime = ns.formulas.hacking.weakenTime(optimalServer, optimalPlayer);

        const maxPossibleHackThreads = Math.floor(freeRam / (hackRam + (weakenRam * (HACK_SECURITY / WEAKEN_SECURITY))));
        const hackThreads = Math.max(1, maxPossibleHackThreads);
        const weakenThreads = Math.max(1, Math.ceil((hackThreads * HACK_SECURITY) / WEAKEN_SECURITY));
        const totalRamUsed = (hackThreads * hackRam) + (weakenThreads * weakenRam);

        ns.print(`${t()} 📉 [HACK] H=${hackThreads} W=${weakenThreads} RAM=${ns.formatRam(totalRamUsed)}`);

        ns.exec(HACK_PATH, thisServer, hackThreads, target, Date.now());
        ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, Date.now() + 1);

        const duration = Math.max(hackTime, weakenTime) + 500;
        ns.print(`${t()} ⏳ [HACK] Waiting ${(duration / 1000).toFixed(1)}s...`);
        await ns.sleep(duration);

        let waitCount = 0;
        const currentProcesses = ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js');
        while (currentProcesses.length > 0 && waitCount < 10) {
          ns.print(`${t()} 🟡 [HACK] Still running, waiting 1s more... (${currentProcesses.length} processes)`);
          await ns.sleep(1000);
          waitCount++;
          currentProcesses.splice(0);
          currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js'));
        }

        const afterHackMoney = getS().moneyAvailable;
        ns.print(`${t()} ✅ [HACK] Complete! Money: ${ns.formatNumber(afterHackMoney)}`);

        if (afterHackMoney < maxMoney * 0.1 && (Date.now() - hackPhaseStartTime > 600000)) {
          currentState = STATE.GROW;
          growPhaseStartTime = Date.now();
          hackPhaseStartTime = 0;
          ns.writePort(80, JSON.stringify({ target: target, phase: "GROW" }));
          ns.print(`${t()} 🔄 [TRANSITION] HACK → GROW`);
        }
        break;
      }

      case STATE.GROW: {
        if (isScriptRunning(HACK_PATH) || isScriptRunning(WEAKEN_PATH) || isScriptRunning(GROW_PATH)) {
          await ns.sleep(2000);
          break;
        }

        const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
        const realPlayer = getP();
        const realServer = getS();
        const optimalPlayer = shadowPlayer(realPlayer, realPlayer.skills.hacking);
        const currentServerForGrow = shadowServer(realServer, realServer.moneyAvailable, realServer.minDifficulty);

        const growIdeal = Math.max(1, Math.ceil(ns.formulas.hacking.growThreads(currentServerForGrow, optimalPlayer, maxMoney)));
        const weakenIdeal = Math.max(1, Math.ceil((growIdeal * GROW_SECURITY) / WEAKEN_SECURITY));
        const totalIdealRam = (growIdeal * growRam) + (weakenIdeal * weakenRam);

        let growThreads, weakenThreads;
        if (totalIdealRam <= freeRam) {
          growThreads = growIdeal;
          weakenThreads = weakenIdeal;
        } else {
          const maxGrowThreads = Math.floor(freeRam / growRam);
          growThreads = Math.min(growIdeal, maxGrowThreads);
          const growRamUsed = growThreads * growRam;
          const ramLeftAfterGrow = freeRam - growRamUsed;
          const maxWeakenThreads = Math.floor(ramLeftAfterGrow / weakenRam);
          weakenThreads = Math.min(weakenIdeal, maxWeakenThreads);
        }

        if (growThreads > 0 && weakenThreads > 0) {
          const realPlayer = getP();
          const realServer = getS();
          const optimalServer = shadowServer(realServer, realServer.moneyMax, realServer.minDifficulty);
          const optimalPlayer = shadowPlayer(realPlayer, realPlayer.skills.hacking);

          const growTime = ns.formulas.hacking.growTime(optimalServer, optimalPlayer);
          const weakenTime = ns.formulas.hacking.weakenTime(optimalServer, optimalPlayer);

          const totalRamUsed = (growThreads * growRam) + (weakenThreads * weakenRam);
          ns.print(`${t()} 📈 [GROW] G=${growThreads}/${growIdeal} W=${weakenThreads}/${weakenIdeal} RAM=${ns.formatRam(totalRamUsed)}`);

          ns.exec(GROW_PATH, thisServer, growThreads, target, Date.now());
          ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, Date.now() + 1);

          const duration = Math.max(growTime, weakenTime) + 500;
          ns.print(`${t()} ⏳ [GROW] Waiting ${(duration / 1000).toFixed(1)}s...`);
          await ns.sleep(duration);

          let waitCount = 0;
          const currentProcesses = ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js');
          while (currentProcesses.length > 0 && waitCount < 10) {
            ns.print(`${t()} 🟡 [GROW] Still running, waiting 1s more... (${currentProcesses.length} processes)`);
            await ns.sleep(1000);
            waitCount++;
            currentProcesses.splice(0);
            currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js'));
          }

          const afterGrowMoney = getS().moneyAvailable;
          ns.print(`${t()} ✅ [GROW] Complete! Money: ${ns.formatNumber(afterGrowMoney)}`);

          if (afterGrowMoney >= maxMoney * 0.95 && (Date.now() - growPhaseStartTime > 600000)) {
            currentState = STATE.HACK;
            growPhaseStartTime = 0;
            hackPhaseStartTime = Date.now();
            ns.writePort(80, JSON.stringify({ target: target, phase: "HACK" }));
            ns.print(`${t()} 🔄 [TRANSITION] GROW → HACK`);
          }
        } else if (growThreads > 0) {
          const realPlayer = getP();
          const realServer = getS();
          const optimalServer = shadowServer(realServer, realServer.moneyMax, realServer.minDifficulty);
          const optimalPlayer = shadowPlayer(realPlayer, realPlayer.skills.hacking);
          const growTime = ns.formulas.hacking.growTime(optimalServer, optimalPlayer);

          ns.print(`${t()} 🟡 [GROW] Only grow fits - G=${growThreads}`);
          ns.exec(GROW_PATH, thisServer, growThreads, target, Date.now());

          const duration = growTime + 500;
          await ns.sleep(duration);

          let waitCount = 0;
          const currentProcesses = ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js');
          while (currentProcesses.length > 0 && waitCount < 10) {
            await ns.sleep(1000);
            waitCount++;
            currentProcesses.splice(0);
            currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename !== 'smart/smartMomentumMaker.js'));
          }
        } else {
          await ns.sleep(5000);
        }
        break;
      }
    }

    await ns.sleep(2000);
  }
}
