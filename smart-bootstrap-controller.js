// VERSION: BN4 Startup Script v2.0.9

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  // Helper para Timestamp HH:MM
  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}]`;
  };

  ns.tprint(`
    ${t()} === BN4 Startup Script v2.0.9 ===
    Updates: Added explicit travel failure logging in checkTravel.
    =================================
  `);

  // =========================
  // CONSTANTS
  // =========================
  const MIN_MONEY_FOR_UPGRADE = 2_000_000;
  const MIN_MONEY_TO_STUDY = 1_800;
  const MIN_WARMUP_MONEY = 50_000;
  const TRAVEL_COST = 200_000;

  const TARGET_CITY = "Volhaven";
  const UNIVERSITY = "ZB Institute of Technology";
  const COURSE = "Algorithms";
  const HACK_SCRIPT = "init-hack-into-own-server.js";

  const SHOPLIFT = "Shoplift";
  const MUG = "Mug";
  const ROB_STORE = "Rob Store";

  const GYM = "Powerhouse Gym";

  const CRIME_LOOP_INTERVAL = 60_000;
  const LOOP_INTERVAL = 300_000;
  const WAITING_EXECUTION_TIME = 10_000;

  const TARGET_STATS = {
    strength: 10,
    defense: 10,
    dexterity: 10,
    agility: 10,
  };

  const GYM_STATS = ["strength", "defense", "dexterity", "agility"];

  const PORT_PROGRAMS = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
  ];

  const PRIORITY_FACTIONS = ["The Black Hand", "NiteSec", "CyberSec", "Tian Di Hui"];
  const FACTION_SERVERS = {
    "The Black Hand": "I.I.I.I",
    "NiteSec": "avmnite-02h",
    "CyberSec": "CSEC"
  };

  const STATE = {
    WARMUP: "WARMUP",
    CRIME: "CRIME",
    STUDY_HACK: "STUDY_HACK",
    PROGRESSION: "PROGRESSION",
    FACTION_WORK: "FACTION_WORK",
  };

  let state = STATE.WARMUP;
  let currentFaction = "";

  // =========================
  // HELPER FUNCTIONS
  // =========================
  function checkTravel(player, money) {
    if (player.city !== TARGET_CITY && money >= TRAVEL_COST) {
      const success = ns.singularity.travelToCity(TARGET_CITY);
      if (success) {
        ns.print(`${t()} [TRAVEL] Moved to ${TARGET_CITY}`);
        return true;
      } else {
        ns.print(`${t()} [TRAVEL FAIL] Could not move to ${TARGET_CITY}`);
      }
    }
    return false;
  }

  async function installBackdoor(target) {
    const path = [];
    const visited = new Set();
    function findPath(current, goal, p) {
      visited.add(current);
      if (current === goal) return true;
      for (const n of ns.scan(current)) {
        if (!visited.has(n)) {
          p.push(n);
          if (findPath(n, goal, p)) return true;
          p.pop();
        }
      }
      return false;
    }
    if (findPath("home", target, path)) {
      for (const node of path) ns.singularity.connect(node);
      await ns.singularity.installBackdoor();
      ns.getServer(target).backdoorInstalled ?
        ns.print(`${t()} [SUCCESS] Backdoor active on ${target}`) :
        ns.print(`${t()} [PENDING] Backdoor not installed on ${target}`);
      ns.singularity.connect("home");
    }
  }

  // =========================
  // BOOTSTRAP
  // =========================
  if (ns.getServerMaxRam("home") >= 4) {
    ns.exec("simpleHack.js", "home", 30, "n00dles");
  }

  // =========================
  // MAIN LOOP
  // =========================
  while (true) {
    const money = ns.getServerMoneyAvailable("home");
    const p = ns.getPlayer();

    const invitations = ns.singularity.checkFactionInvitations();
    for (const inv of invitations) {
      if (PRIORITY_FACTIONS.includes(inv)) ns.singularity.joinFaction(inv);
    }

    switch (state) {

      case STATE.WARMUP: {
        const needsStats = GYM_STATS.some(s => p.skills[s] < TARGET_STATS[s]);
        const hasTravelMoney = money >= TRAVEL_COST;

        ns.print(`${t()} [DEBUG WARMUP] Stats: Str:${p.skills.strength}/${TARGET_STATS.strength}, Def:${p.skills.defense}/${TARGET_STATS.defense}, Dex:${p.skills.dexterity}/${TARGET_STATS.dexterity}, Agi:${p.skills.agility}/${TARGET_STATS.agility}`);

        if (!needsStats && hasTravelMoney) {
          ns.print(`${t()} [STATE TRANSITION] WARMUP -> CRIME: Stats and travel funds ready.`);
          state = STATE.CRIME;
          break;
        }

        const work = ns.singularity.getCurrentWork();

        if (money >= MIN_WARMUP_MONEY && needsStats) {
          const statToTrain = GYM_STATS.find(s => p.skills[s] < TARGET_STATS[s]);
          if (!work || work.type !== "GYM" || work.gymStat?.toLowerCase() !== statToTrain) {
            ns.singularity.stopAction();
            ns.singularity.gymWorkout(GYM, statToTrain, true);
            ns.print(`${t()} [WARMUP] Training ${statToTrain}`);
          }
        } else {
          if (!work || work.type !== "CRIME") {
            ns.singularity.stopAction();
            ns.singularity.commitCrime(SHOPLIFT, true);
            ns.print(`${t()} [WARMUP FUNDING] Farming money for stats or travel.`);
          }
        }
        await ns.sleep(2000);
        break;
      }

      case STATE.CRIME: {
        checkTravel(p, money);

        let bestCrime = SHOPLIFT;
        if (ns.singularity.getCrimeChance(MUG) > 0.75) {
          bestCrime = MUG;
        } else if (ns.singularity.getCrimeChance(ROB_STORE) > 0.85) {
          bestCrime = ROB_STORE;
        }

        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CRIME" || (work.type === "CRIME" && work.crimeType !== bestCrime)) {
          ns.singularity.stopAction();
          ns.singularity.commitCrime(bestCrime, true);
          ns.print(`${t()} [CRIME] Committing ${bestCrime}`);
        }

        const factionToWork = PRIORITY_FACTIONS.find(f => p.factions.includes(f));
        if (factionToWork) {
          currentFaction = factionToWork;
          state = STATE.FACTION_WORK;
          ns.print(`${t()} [STATE TRANSITION] CRIME -> FACTION_WORK (${factionToWork})`);
          break;
        }

        if (money >= MIN_MONEY_FOR_UPGRADE) {
          ns.print(`${t()} [STATE TRANSITION] CRIME -> STUDY_HACK`);
          state = STATE.STUDY_HACK;
          break;
        }
        await ns.sleep(CRIME_LOOP_INTERVAL);
        break;
      }

      case STATE.STUDY_HACK: {
        if (money <= MIN_MONEY_TO_STUDY) {
          ns.print(`${t()} [STATE TRANSITION] STUDY_HACK -> CRIME: Funding low.`);
          state = STATE.CRIME;
          break;
        }

        checkTravel(p, money);

        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS") {
          ns.singularity.stopAction();
          ns.singularity.universityCourse(UNIVERSITY, COURSE, true);
          ns.print(`${t()} [STUDY] Studying Algorithms at ${UNIVERSITY}`);
        }

        const visited = new Set(["home"]);
        const stack = ["home"];
        const servers = [];
        while (stack.length) {
          const host = stack.pop();
          for (const n of ns.scan(host)) {
            if (!visited.has(n)) {
              visited.add(n);
              stack.push(n);
              servers.push(n);
            }
          }
        }

        const hackLvl = ns.getHackingLevel();
        const portsOwned = PORT_PROGRAMS.filter(progName => ns.fileExists(progName, "home")).length;

        for (const server of servers) {
          if (
            server === "home" ||
            server.startsWith("p-") ||
            ns.getServerRequiredHackingLevel(server) > hackLvl ||
            ns.getServerMaxRam(server) < 8 ||
            ns.isRunning(HACK_SCRIPT, server, server.toString(), "true")
          ) {
            continue;
          }

          const portsRequired = ns.getServerNumPortsRequired(server);

          if (portsOwned < portsRequired) {
            const nextProgram = PORT_PROGRAMS[portsOwned];
            const cost = ns.singularity.getDarkwebProgramCost(nextProgram);
            state = (money >= cost) ? STATE.PROGRESSION : STATE.CRIME;
            ns.print(`${t()} [STATE TRANSITION] STUDY_HACK -> ${state} for ${nextProgram} (Target: ${server})`);
            break;
          }

          if (Object.values(FACTION_SERVERS).includes(server) && ns.hasRootAccess(server) && !ns.getServer(server).backdoorInstalled) {
            ns.print(`${t()} Calling installBackdoor for ${server}`);
            await installBackdoor(server);
          }

          ns.exec(HACK_SCRIPT, "home", 1, server);
          ns.print(`${t()} [DEPLOY] ${HACK_SCRIPT} on ${server}`);
          await ns.sleep(WAITING_EXECUTION_TIME);
        }

        const factionToWork = PRIORITY_FACTIONS.find(f => p.factions.includes(f));
        if (factionToWork) {
          currentFaction = factionToWork;
          state = STATE.FACTION_WORK;
          ns.print(`${t()} [STATE TRANSITION] STUDY_HACK -> FACTION_WORK (${factionToWork})`);
          break;
        }

        await ns.sleep(LOOP_INTERVAL);
        break;
      }

      case STATE.FACTION_WORK: {
        const work = ns.singularity.getCurrentWork();
        if (!p.factions.includes(currentFaction) || money < MIN_MONEY_TO_STUDY) {
          state = STATE.CRIME;
          break;
        }
        if (!work || work.type !== "FACTION" || work.factionName !== currentFaction) {
          ns.singularity.stopAction();
          ns.singularity.workForFaction(currentFaction, "Hacking Contracts", true);
          ns.print(`${t()} [FACTION] Working for ${currentFaction}`);
        }
        await ns.sleep(LOOP_INTERVAL);
        ns.print(`${t()} [STATE TRANSITION] FACTION_WORK -> STUDY_HACK (Rescan)`);
        state = STATE.STUDY_HACK;
        break;
      }

      case STATE.PROGRESSION: {
        if (!ns.hasTorRouter()) {
          if (ns.singularity.purchaseTor()) ns.print(`${t()} [PROGRESSION] TOR purchased.`);
          await ns.sleep(1000);
          break;
        }

        const portsOwned = PORT_PROGRAMS.filter(progName => ns.fileExists(progName, "home")).length;
        if (portsOwned < PORT_PROGRAMS.length) {
          const prog = PORT_PROGRAMS[portsOwned];
          const cost = ns.singularity.getDarkwebProgramCost(prog);

          if (money >= cost) {
            if (ns.singularity.purchaseProgram(prog)) ns.print(`${t()} [PROGRESSION] Bought ${prog}`);
          } else {
            state = STATE.CRIME;
          }
        } else {
          state = STATE.STUDY_HACK;
        }
        await ns.sleep(1000);
        break;
      }
    }
  }
}
