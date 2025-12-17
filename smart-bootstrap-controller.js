// VERSION: BN4 Startup Script v1.9.1 AFK grinder

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  ns.tprint(`
    === BN4 Startup Script v1.9.1 ===
    Intent: Automate early BN4 progression (Singularity).
    Updates: Applied user-defined Mug priority logic.
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
  const LOOP_INTERVAL = 30_000;
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

  const STATE = {
    WARMUP: "WARMUP",
    CRIME: "CRIME",
    STUDY_HACK: "STUDY_HACK",
    PROGRESSION: "PROGRESSION",
  };

  let state = STATE.WARMUP;

  // =========================
  // HELPER FUNCTIONS
  // =========================
  function checkTravel(player, money) {
    if (player.city !== TARGET_CITY && money >= TRAVEL_COST) {
      if (ns.singularity.travelToCity(TARGET_CITY)) {
        ns.print(`[TRAVEL] Moved to ${TARGET_CITY}`);
        return true;
      }
    }
    return false;
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

    switch (state) {

      case STATE.WARMUP: {
        const needsStats = GYM_STATS.some(s => p.skills[s] < TARGET_STATS[s]);
        const hasTravelMoney = money >= TRAVEL_COST;

        ns.print(`[DEBUG WARMUP] Stats: Str:${p.skills.strength}/${TARGET_STATS.strength}, Def:${p.skills.defense}/${TARGET_STATS.defense}, Dex:${p.skills.dexterity}/${TARGET_STATS.dexterity}, Agi:${p.skills.agility}/${TARGET_STATS.agility}`);
        
        if (!needsStats && hasTravelMoney) {
          ns.print("[STATE TRANSITION] WARMUP -> CRIME: Stats and travel funds ready.");
          state = STATE.CRIME;
          break;
        }

        const work = ns.singularity.getCurrentWork();

        if (money >= MIN_WARMUP_MONEY && needsStats) {
          const statToTrain = GYM_STATS.find(s => p.skills[s] < TARGET_STATS[s]);
          if (!work || work.type !== "GYM" || work.gymStat?.toLowerCase() !== statToTrain) {
            ns.singularity.stopAction();
            ns.singularity.gymWorkout(GYM, statToTrain, true);
            ns.print(`[WARMUP] Training ${statToTrain}`);
          }
        } else {
          if (!work || work.type !== "CRIME") {
            ns.singularity.stopAction();
            ns.singularity.commitCrime(SHOPLIFT, true);
            ns.print(`[WARMUP FUNDING] Farming money for stats or travel.`);
          }
        }
        await ns.sleep(2000); 
        break;
      }

      case STATE.CRIME: {
        checkTravel(p, money);

        // SUA LÓGICA DE PRIORIDADE:
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
          ns.print(`[CRIME] Committing ${bestCrime}`);
        }

        if (money >= MIN_MONEY_FOR_UPGRADE) {
          ns.print(`[STATE TRANSITION] CRIME -> STUDY_HACK`);
          state = STATE.STUDY_HACK;
          break;
        }
        await ns.sleep(CRIME_LOOP_INTERVAL);
        break;
      }

      case STATE.STUDY_HACK: {
        if (money <= MIN_MONEY_TO_STUDY) {
          ns.print(`[STATE TRANSITION] STUDY_HACK -> CRIME: Funding low.`);
          state = STATE.CRIME;
          break;
        }

        checkTravel(p, money);

        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS") {
          ns.singularity.stopAction();
          ns.singularity.universityCourse(UNIVERSITY, COURSE, true);
          ns.print(`[STUDY] Studying Algorithms at ${UNIVERSITY}`);
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
          ) continue;

          const portsRequired = ns.getServerNumPortsRequired(server);

          if (portsOwned < portsRequired) {
            const nextProgram = PORT_PROGRAMS[portsOwned];
            const cost = ns.singularity.getDarkwebProgramCost(nextProgram);
            state = (money >= cost) ? STATE.PROGRESSION : STATE.CRIME;
            ns.print(`[STATE TRANSITION] STUDY_HACK -> ${state} for ${nextProgram} (Target: ${server})`);
            break;
          }

          ns.exec(HACK_SCRIPT, "home", 1, server);
          ns.print(`[DEPLOY] ${HACK_SCRIPT} on ${server}`);
          await ns.sleep(WAITING_EXECUTION_TIME);
        }

        await ns.sleep(LOOP_INTERVAL);
        break;
      }

      case STATE.PROGRESSION: {
        if (!ns.hasTorRouter()) {
          if (ns.singularity.purchaseTor()) ns.print("[PROGRESSION] TOR purchased.");
          await ns.sleep(1000);
          break;
        }

        const portsOwned = PORT_PROGRAMS.filter(progName => ns.fileExists(progName, "home")).length;
        if (portsOwned < PORT_PROGRAMS.length) {
          const prog = PORT_PROGRAMS[portsOwned];
          const cost = ns.singularity.getDarkwebProgramCost(prog);

          if (money >= cost) {
            if (ns.singularity.purchaseProgram(prog)) ns.print(`[PROGRESSION] Bought ${prog}`);
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
