/**
 * VERSION: 9.7.0
 * Smart Momentum Maker - Ultra Simplified
 *
 * DESCRIPTION:
 * Port-controlled hacking script that switches between HACK and GROW modes.
 * Automatically kills previous scripts when switching modes.
 * Used together with stock-momentum-maker.js for automated stock trading and hacking coordination.
 *
 * STRATEGY:
 * - Waits for command on port 85 ("HACK" or "GROW")
 * - Automatically kills any running hack/grow/weaken scripts before starting new mode
 * - GROW mode: Continuous grow + weaken loop with synchronized timing
 * - HACK mode: Continuous hack + weaken loop with synchronized timing
 *
 * PARAMETERS:
 * - target: Server hostname to manipulate
 *
 * PORT USAGE:
 * - Port 85: Receives "HACK" or "GROW" commands to switch modes
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

  ns.tprint(`${t()} 🚀 Starting Smart Momentum Maker on ${target}`);
  ns.tprint(`${t()} 📡 Waiting for command on port 85 (HACK or GROW)...`);

  let currentMode = "";

  while (true) {
    const portData = ns.readPort(85);
    if (portData !== "NULL PORT DATA") {
      const cmd = String(portData).toUpperCase().trim();
      if (cmd === "HACK" || cmd === "GROW") {
        // Kill any running hack/grow/weaken scripts before switching
        const allProcesses = ns.ps(thisServer).filter(p =>
          p.filename === HACK_PATH || p.filename === GROW_PATH || p.filename === WEAKEN_PATH
        );
        for (const proc of allProcesses) {
          ns.kill(proc.pid);
        }
        if (allProcesses.length > 0) {
          ns.print(`${t()} ☠️ Killed ${allProcesses.length} processes before switching to ${cmd}`);
        }

        currentMode = cmd;
        ns.print(`${t()} 🔄 Mode switched to: ${currentMode}`);
      }
    }

    if (!currentMode) {
      await ns.sleep(1000);
      continue;
    }

    const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer);
    const realPlayer = getP();
    const realServer = getS();
    const optimalServer = shadowServer(realServer, realServer.moneyMax, realServer.minDifficulty);
    const optimalPlayer = shadowPlayer(realPlayer, realPlayer.skills.hacking);

    if (currentMode === "GROW") {
      const currentServerForGrow = shadowServer(realServer, realServer.moneyAvailable, realServer.minDifficulty);
      const growIdeal = Math.max(1, Math.ceil(ns.formulas.hacking.growThreads(currentServerForGrow, optimalPlayer, realServer.moneyMax)));
      const weakenIdeal = Math.max(1, Math.ceil((growIdeal * GROW_SECURITY) / WEAKEN_SECURITY));
      const totalIdealRam = (growIdeal * growRam) + (weakenIdeal * weakenRam);

      let growThreads, weakenThreads;
      if (totalIdealRam <= freeRam) {
        growThreads = Math.max(1, growIdeal - 10);
        weakenThreads = Math.max(1, weakenIdeal - 10);
      } else {
        growThreads = Math.floor(freeRam / (growRam + (weakenRam * (GROW_SECURITY / WEAKEN_SECURITY))));
        growThreads = Math.max(1, growThreads - 10);
        weakenThreads = Math.ceil((growThreads * GROW_SECURITY) / WEAKEN_SECURITY);
        weakenThreads = Math.max(1, weakenThreads - 10);
      }

      if (growThreads > 0 && weakenThreads > 0) {
        const growTime = ns.formulas.hacking.growTime(optimalServer, optimalPlayer);
        const weakenTime = ns.formulas.hacking.weakenTime(optimalServer, optimalPlayer);

        ns.print(`${t()} 📈 [GROW] G=${growThreads} W=${weakenThreads}`);
        ns.exec(GROW_PATH, thisServer, growThreads, target, Date.now());
        ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, Date.now() + 1);

        const duration = Math.max(growTime, weakenTime) + 500;
        await ns.sleep(duration);

        let waitCount = 0;
        const currentProcesses = ns.ps(thisServer).filter(p => p.filename === GROW_PATH || p.filename === WEAKEN_PATH);
        while (currentProcesses.length > 0 && waitCount < 10) {
          await ns.sleep(1000);
          waitCount++;
          currentProcesses.splice(0);
          currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename === GROW_PATH || p.filename === WEAKEN_PATH));
        }
      }
    } else if (currentMode === "HACK") {
      const maxPossibleHackThreads = Math.floor(freeRam / (hackRam + (weakenRam * (HACK_SECURITY / WEAKEN_SECURITY))));
      const hackThreads = Math.max(1, maxPossibleHackThreads - 10);
      const weakenThreads = Math.max(1, Math.ceil((hackThreads * HACK_SECURITY) / WEAKEN_SECURITY) - 10);

      if (hackThreads > 0 && weakenThreads > 0) {
        const hackTime = ns.formulas.hacking.hackTime(optimalServer, optimalPlayer);
        const weakenTime = ns.formulas.hacking.weakenTime(optimalServer, optimalPlayer);

        ns.print(`${t()} 📉 [HACK] H=${hackThreads} W=${weakenThreads}`);
        ns.exec(HACK_PATH, thisServer, hackThreads, target, Date.now());
        ns.exec(WEAKEN_PATH, thisServer, weakenThreads, target, Date.now() + 1);

        const duration = Math.max(hackTime, weakenTime) + 500;
        await ns.sleep(duration);

        let waitCount = 0;
        const currentProcesses = ns.ps(thisServer).filter(p => p.filename === HACK_PATH || p.filename === WEAKEN_PATH);
        while (currentProcesses.length > 0 && waitCount < 10) {
          await ns.sleep(1000);
          waitCount++;
          currentProcesses.splice(0);
          currentProcesses.push(...ns.ps(thisServer).filter(p => p.filename === HACK_PATH || p.filename === WEAKEN_PATH));
        }
      }
    }

    await ns.sleep(100);
  }
}
