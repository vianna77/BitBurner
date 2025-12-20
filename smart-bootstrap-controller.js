// VERSION: BN4 Startup Script v2.8.4
// Updates: Simplified STUDY_HACK by moving network/requirement logic to NETWORK_ATTACK and PREP_FACTION.

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  const t = () => {
    const date = new Date();
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}]`;
  };

  const player = ns.getPlayer();
  ns.print(`${t()} [LOCATION] Current City: ${player.city}`);

  ns.tprint(`
    ${t()} === BN4 Startup Script v2.8.4 ===
    Updates: Trying to fix minor bugs.
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
  const CUSTOM_BY_MONEY_SCRIPT = "buy-custom-server-by-money-available.js";
  const RUN_SIMPLEHACK_ON_PSERVERS_SCRIPT = "run-simplehack-on-pservers.js";
  const HACK_SCRIPT = "init-hack-into-own-server.js";
  const BOOTSTRAP_SCRIPT = "bn4/smart-bootstrap-controller.js";

  const SHOPLIFT = "Shoplift";
  const MUG = "Mug";
  const LARCENY = "Larceny";
  const ROB_STORE = "Rob Store";

  const GYM = "Powerhouse Gym";

  const CRIME_LOOP_INTERVAL = 60_000;
  const LOOP_INTERVAL = 300_000;
  const WAITING_EXECUTION_TIME = 10_000;
  const GYM_SESSION_TIME = 10_000;

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

  const TARGET_AUGMENTS = [
    { faction: "Chongqing", name: "Speech Enhancement", price: 625000, rep: 1250 },
    { faction: "CyberSec", name: "Neurotrainer I", price: 4000000, rep: 1000 },
    { faction: "CyberSec", name: "Synaptic Enhancement Implant", price: 7500000, rep: 2000 },
    { faction: "Tian Di Hui", name: "Social Negotiation Assistant (S.N.A)", price: 8000000, rep: 6250 },
    { faction: "CyberSec", name: "BitWire", price: 10000000, rep: 3750 },
    { faction: "NiteSec", name: "Embedded Netburner Module", price: 15000000, rep: 15000 },
    { faction: "Chongqing", name: "Nuoptimal Nootropic Injector Implant", price: 20000000, rep: 5000 },
    { faction: "NiteSec", name: "Neurotrainer II", price: 45000000, rep: 10000 },
    { faction: "Tian Di Hui", name: "ADR-V1 Pheromone Gene", price: 45000000, rep: 3750 },
    { faction: "Chongqing", name: "Speech Processor Implant", price: 50000000, rep: 7500 },
    { faction: "NiteSec", name: "Cranial Signal Processors - Gen I", price: 70000000, rep: 1250 },
    { faction: "NiteSec", name: "Artificial Synaptic Potentiation", price: 80000000, rep: 6250 },
    { faction: "NiteSec", name: "Cranial Signal Processors - Gen II", price: 125000000, rep: 10000 },
    { faction: "NiteSec", name: "CRTX42-AA Gene Modification", price: 225000000, rep: 45000 },
    { faction: "NiteSec", name: "Neural-Retention Enhancement", price: 250000000, rep: 20000 },
    { faction: "Chongqing", name: "Neuregen Gene Modification", price: 375000000, rep: 37500 },
    { faction: "The Black Hand", name: "Cranial Signal Processors - Gen III", price: 550000000, rep: 50000 },
    { faction: "Tian Di Hui", name: "Neuroreceptor Management Implant", price: 550000000, rep: 75000 },
    { faction: "The Black Hand", name: "The Black Hand", price: 550000000, rep: 100000 },
    { faction: "BitRunners", name: "Enhanced Myelin Sheathing", price: 1375000000, rep: 100000 },
    { faction: "BitRunners", name: "DataJack", price: 450000000, rep: 112500 },
    { faction: "BitRunners", name: "Cranial Signal Processors - Gen IV", price: 1100000000, rep: 125000 },
    { faction: "BitRunners", name: "Embedded Netburner Module Core Implant", price: 2500000000, rep: 175000 },
    { faction: "BitRunners", name: "Neural Accelerator", price: 1750000000, rep: 200000 }
  ];

  const FACTION_REQS = {
    "Tian Di Hui": { money: 1_200_000, hack: 50, city: "Chongqing", backdoor: null },
    "Chongqing": { money: 20_200_000, hack: 0, city: "Chongqing", backdoor: null },
    "CyberSec": { backdoor: "CSEC" },
    "NiteSec": { backdoor: "avmnite-02h" },
    "The Black Hand": { backdoor: "I.I.I.I" },
    "BitRunners": { backdoor: "run4theh111z" }
  };

  const STATE = {
    WARMUP: "WARMUP",
    CRIME: "CRIME",
    STUDY_HACK: "STUDY_HACK",
    NETWORK_ATTACK: "NETWORK_ATTACK",
    PROGRESSION: "PROGRESSION",
    PREP_FACTION: "PREP_FACTION",
    FACTION_WORK: "FACTION_WORK"
  };

  const ownedAugs = ns.singularity.getOwnedAugmentations(true);
  const targetAug = TARGET_AUGMENTS.find(aug => !ownedAugs.includes(aug.name));
  ns.print(`${t()} [TARGET] ${targetAug.name} | Faction: ${targetAug.faction} | Price: ${ns.formatNumber(targetAug.price)} Rep | Req: ${ns.formatNumber(targetAug.rep)} Rep`);
  ns.tprint(`${t()} [TARGET] ${targetAug.name} | Faction: ${targetAug.faction}| Price: ${ns.formatNumber(targetAug.price)} Rep | Req: ${ns.formatNumber(targetAug.rep)} Rep`);

  let state = STATE.WARMUP;
  let lastLoggedState = "";

  // =========================
  // HELPER FUNCTIONS
  // =========================
  function travelTo(destination) {
    const player = ns.getPlayer();
    const money = ns.getServerMoneyAvailable("home");
    if (player.city !== destination && money >= TRAVEL_COST) {
      const success = ns.singularity.travelToCity(destination);
      if (success) {
        ns.print(`${t()} [TRAVEL] Moved to ${destination}`);
        return true;
      } else {
        ns.print(`${t()} [TRAVEL FAIL] Could not move to ${destination}`);
      }
    }
    return player.city === destination;
  }

  async function handleAugmentations() {
    const target = TARGET_AUGMENTS.find(aug => !ownedAugs.includes(aug.name));

    if (!target) return;

    const player = ns.getPlayer();
    if (player.factions.includes(target.faction)) {
      const price = ns.singularity.getAugmentationPrice(target.name);
      const rep = ns.singularity.getFactionRep(target.faction);

      if (ns.getServerMoneyAvailable("home") >= price && rep >= target.rep) {
        if (ns.singularity.purchaseAugmentation(target.faction, target.name)) {
          ns.print(`${t()} [AUGMENT] Purchased ${target.name} from ${target.faction}. Installing...`);
          ns.singularity.installAugmentations(BOOTSTRAP_SCRIPT);
        }
      }
    }
  }

  async function installBackdoor(target) {
    if (!ns.hasRootAccess(target)) {
      if (ns.fileExists("BruteSSH.exe")) ns.brutessh(target);
      if (ns.fileExists("FTPCrack.exe")) ns.ftpcrack(target);
      if (ns.fileExists("relaySMTP.exe")) ns.relaysmtp(target);
      if (ns.fileExists("HTTPWorm.exe")) ns.httpworm(target);
      if (ns.fileExists("SQLInject.exe")) ns.sqlinject(target);
      try { ns.nuke(target); } catch (e) {
        ns.print(`${t()} [installBackdoor -> FAILED NUKE] Exception ${e}`);
      }
    }

    if (!ns.hasRootAccess(target)) {
      ns.print(`${t()} [installBackdoor] has not root access ${target} `);
      return;
    }

    const path = [];
    const visited = new Set();
    function findPath(current, goal, path) {
      visited.add(current);
      if (current === goal)
        return true;
      for (const n of ns.scan(current)) {
        if (!visited.has(n)) {
          path.push(n);
          if (findPath(n, goal, path))
            return true;
          path.pop();
        }
      }
      return false;
    }
    if (findPath("home", target, path)) {
      for (const node of path) {
        ns.singularity.connect(node);
      }
      let isBackdoorInstalled = ns.getServer(target).backdoorInstalled;
      if (!isBackdoorInstalled) {
        await ns.singularity.installBackdoor();
        isBackdoorInstalled = ns.getServer(target).backdoorInstalled;
        if (isBackdoorInstalled) {
          ns.print(`${t()} [SUCCESS] Backdoor active on ${target}`);
        } else {
          ns.print(`${t()} [FAILED] Could not install backdoor on ${target}`);
        }
      } else {
        ns.print(`${t()} [NOTICE] Backdoor already installed in ${target}`);
      }
      ns.singularity.connect("home");
    }
  }

  // =========================
  // BOOTSTRAP
  // =========================
  if (ns.getServerMaxRam("home") >= 4) {
    if (!ns.fileExists("share.js", "home")) {
    } else if (!ns.isRunning("share.js", "home")) {
      ns.exec("share.js", "home", 35);
    }
  }

  // =========================
  // MAIN LOOP
  // =========================
  while (true) {
    const money = ns.getServerMoneyAvailable("home");
    const player = ns.getPlayer();

    if (targetAug) {
      const invitations = ns.singularity.checkFactionInvitations();
      if (invitations.includes(targetAug.faction)) {
        ns.singularity.joinFaction(targetAug.faction);
      }
    }

    await handleAugmentations();

    if (state !== lastLoggedState) {
      ns.print(`${t()} [STATE] Entering ${state}`);
      lastLoggedState = state;
    }

    switch (state) {

      case STATE.WARMUP: {
        const needsStats = GYM_STATS.some(s => player.skills[s] < TARGET_STATS[s]);
        const hasTravelMoney = money >= TRAVEL_COST;

        if (!needsStats && hasTravelMoney) {
          ns.print(`${t()} [STATE TRANSITION] WARMUP -> CRIME. Reason: Stats >= 10 and Money (${ns.formatNumber(money)}) >= ${ns.formatNumber(TRAVEL_COST)}`);
          state = STATE.CRIME;
          break;
        }

        const work = ns.singularity.getCurrentWork();

        if (money >= MIN_WARMUP_MONEY && needsStats) {
          const statToTrain = GYM_STATS.find(s => player.skills[s] < TARGET_STATS[s]);
          if (!work || work.type !== "GYM" || work.gymStat?.toLowerCase() !== statToTrain) {
            ns.singularity.stopAction();
            ns.singularity.gymWorkout(GYM, statToTrain, true);
            ns.print(`${t()} [WARMUP] Training ${statToTrain}. Sleeping ${GYM_SESSION_TIME / 1000}s.`);
            await ns.sleep(GYM_SESSION_TIME);
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
        if (targetAug && !player.factions.includes(targetAug.faction)) {
          const reqs = FACTION_REQS[targetAug.faction];
          if (!reqs.money || money >= reqs.money) {
            state = STATE.PREP_FACTION;
            break;
          }
        }

        if (money >= MIN_MONEY_FOR_UPGRADE) {
          ns.print(`${t()} [STATE TRANSITION] CRIME -> STUDY_HACK. Reason: Money (${ns.formatNumber(money)}) >= ${ns.formatNumber(MIN_MONEY_FOR_UPGRADE)}.`);
          state = STATE.STUDY_HACK;
          break;
        }

        travelTo(TARGET_CITY);

        let bestCrime = SHOPLIFT;
        if (ns.singularity.getCrimeChance(ROB_STORE) >= 0.85) {
          bestCrime = ROB_STORE;
        }
        if (ns.singularity.getCrimeChance(MUG) >= 0.50) {
          bestCrime = MUG;
        }
        if (ns.singularity.getCrimeChance(LARCENY) >= 1.0) {
          bestCrime = LARCENY;
        }

        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CRIME" || (work.type === "CRIME" && work.crimeType !== bestCrime)) {
          ns.singularity.stopAction();
          ns.singularity.commitCrime(bestCrime, true);
          ns.print(`${t()} [CRIME] Committing ${bestCrime} (Chance: ${Math.round(ns.singularity.getCrimeChance(bestCrime) * 100)}%)`);
        }

        await ns.sleep(CRIME_LOOP_INTERVAL);
        break;
      }

      case STATE.PREP_FACTION: {
        if (!targetAug) { state = STATE.CRIME; break; }
        if (player.factions.includes(targetAug.faction)) {
          ns.print(`${t()} [STATE TRANSITION] PREP_FACTION -> FACTION_WORK. Reason: Faction membership confirmed.`);
          state = STATE.FACTION_WORK;
          break;
        }

        const reqs = FACTION_REQS[targetAug.faction];
        if (reqs) {
          if (reqs.money && money < reqs.money) {
            ns.print(`${t()} [STATE TRANSITION] PREP_FACTION -> CRIME. Reason: Insufficient funds for application.`);
            state = STATE.CRIME;
            break;
          }

          if (reqs.hack && ns.getHackingLevel() < reqs.hack) {
            ns.print(`${t()} [STATE TRANSITION] PREP_FACTION -> STUDY_HACK. Reason: Hacking Level < ${reqs.hack}.`);
            state = STATE.STUDY_HACK;
            break;
          }

          if (reqs.city) travelTo(reqs.city);

          if (reqs.backdoor && !ns.getServer(reqs.backdoor).backdoorInstalled) {
            const portsOwned = PORT_PROGRAMS.filter(progName => ns.fileExists(progName, "home")).length;
            const portsReq = ns.getServerNumPortsRequired(reqs.backdoor);

            if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(reqs.backdoor) && portsOwned >= portsReq) {
              await installBackdoor(reqs.backdoor);
            } else {
              if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(reqs.backdoor)) {
                ns.print(`${t()} [STATE TRANSITION] PREP_FACTION -> STUDY_HACK. Reason: Need more hacking level.`);
                state = STATE.STUDY_HACK;
                break;
              }
              if (portsOwned < portsReq) {
                ns.print(`${t()} [STATE TRANSITION] PREP_FACTION -> NETWORK_ATTACK. Reason: Need to buy more port programs.`);
                state = STATE.NETWORK_ATTACK;
                break;
              }
            }
          }
        }

        await ns.sleep(WAITING_EXECUTION_TIME);
        break;
      }

      case STATE.STUDY_HACK: {
        if (money <= MIN_MONEY_TO_STUDY) {
          ns.print(`${t()} [STATE TRANSITION] STUDY_HACK -> CRIME. Reason: Money (${ns.formatNumber(money)}) <= ${ns.formatNumber(MIN_MONEY_TO_STUDY)} safety limit.`);
          state = STATE.CRIME;
          break;
        }

        travelTo(TARGET_CITY);

        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS") {
          ns.singularity.stopAction();
          ns.singularity.universityCourse(UNIVERSITY, COURSE, true);
          ns.print(`${t()} [STUDY] Studying Algorithms at ${UNIVERSITY}`);
        }

        await ns.sleep(WAITING_EXECUTION_TIME);

        const reqs = FACTION_REQS[targetAug.faction];
        let targetLevel = 0;
        if (reqs) {
          if (reqs.hack) targetLevel = reqs.hack;
          if (reqs.backdoor) {
            const backdoorLevel = ns.getServerRequiredHackingLevel(reqs.backdoor);
            if (backdoorLevel > targetLevel) targetLevel = backdoorLevel;
          }
        }

        if (ns.getHackingLevel() >= targetLevel) {
          ns.print(`${t()} [STATE TRANSITION] STUDY_HACK -> NETWORK_ATTACK. Reason: Target level ${targetLevel} reached.`);
          state = STATE.NETWORK_ATTACK;
        } else {
          ns.print(`${t()} [STUDY] Current: ${ns.getHackingLevel()} / Target: ${targetLevel}. Continuing...`);
        }
        break;
      }

      case STATE.NETWORK_ATTACK: {
        const currentHackLvl = ns.getHackingLevel();
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

        const portsOwned = PORT_PROGRAMS.filter(progName => ns.fileExists(progName, "home")).length;
        let pendingProg = false;

        for (const server of servers) {
          if (
            server === "home" ||
            server === "darkweb" ||
            server.startsWith("p-") ||
            ns.getServerRequiredHackingLevel(server) > currentHackLvl) {
            continue;
          }

          const portsRequired = ns.getServerNumPortsRequired(server);

          if (portsOwned < portsRequired) {
            const reqs = FACTION_REQS[targetAug.faction];
            const isRelevant =
              (reqs?.backdoor === server) ||
              (ns.getServerMaxMoney(server) > 20_000_000);

            if (isRelevant) {
              if (!ns.hasTorRouter()) {
                pendingProg = true;
              } else if (PORT_PROGRAMS.some(p => !ns.fileExists(p, "home"))) {
                pendingProg = true;
              }
            }
            continue;
          }


          if (!ns.hasRootAccess(server)) {
            if (ns.fileExists("BruteSSH.exe")) ns.brutessh(server);
            if (ns.fileExists("FTPCrack.exe")) ns.ftpcrack(server);
            if (ns.fileExists("relaySMTP.exe")) ns.relaysmtp(server);
            if (ns.fileExists("HTTPWorm.exe")) ns.httpworm(server);
            if (ns.fileExists("SQLInject.exe")) ns.sqlinject(server);
            try { ns.nuke(server); ns.print(`${t()} [NUKE] ${server} rooted.`); } catch (e) { }
            if (ns.getServerMaxMoney(server) > 20000000) {
              ns.exec(CUSTOM_BY_MONEY_SCRIPT, "home", 1, 64);
              ns.exec(RUN_SIMPLEHACK_ON_PSERVERS_SCRIPT, "home", 1);
            }
          }

          if (ns.hasRootAccess(server)) {
            const reqs = FACTION_REQS[targetAug.faction];
            if ((reqs && reqs.backdoor && reqs.backdoor == server) && currentHackLvl >= ns.getServerRequiredHackingLevel(server)) {
              await installBackdoor(server);
            }

            if (ns.getServerMaxRam(server) >= 8 && !ns.isRunning(HACK_SCRIPT, server, server.toString(), "true")) {
              ns.exec(HACK_SCRIPT, "home", 1, server, server.toString(), "true");
              ns.print(`${t()} [DEPLOY] ${HACK_SCRIPT} on ${server}`);
            }
          }
          await ns.sleep(100);
        }

        if (pendingProg) {
          ns.print(`${t()} [STATE TRANSITION] NETWORK_ATTACK -> PROGRESSION. Reason: Missing port programs.`);
          state = STATE.PROGRESSION;
        } else {
          ns.print(`${t()} [STATE TRANSITION] NETWORK_ATTACK -> PREP_FACTION. Reason: No blockers.`);
          state = STATE.PREP_FACTION;
        }
        break;
      }

      case STATE.FACTION_WORK: {
        if (!targetAug || !player.factions.includes(targetAug.faction) || money < MIN_MONEY_TO_STUDY) {
          ns.print(`${t()} [STATE TRANSITION] FACTION_WORK -> CRIME. Reason: Lost faction access or low funds.`);
          state = STATE.CRIME;
          break;
        }

        const currentRep = ns.singularity.getFactionRep(targetAug.faction);
        if (currentRep >= targetAug.rep) {
          ns.print(`${t()} [STATE TRANSITION] FACTION_WORK -> CRIME. Reason: Target Rep reached (${ns.formatNumber(currentRep)}).`);
          state = STATE.CRIME;
          break;
        }

        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "FACTION" || work.factionName !== targetAug.faction) {
          ns.singularity.stopAction();
          ns.singularity.workForFaction(targetAug.faction, "Hacking Contracts", true);
          ns.print(`${t()} [FACTION] Working for ${targetAug.faction} to aquire ${targetAug.name}`);
        }
        await ns.sleep(LOOP_INTERVAL);
        ns.print(`${t()} [STATE TRANSITION] FACTION_WORK -> NETWORK_ATTACK. Reason: Periodic network attack check.`);
        state = STATE.NETWORK_ATTACK;
        break;
      }

      case STATE.PROGRESSION: {
        if (!ns.hasTorRouter()) {
          if (ns.singularity.purchaseTor())
            ns.print(`${t()} [PROGRESSION] TOR purchased.`);
          await ns.sleep(1000);
          break;
        }

        const prog = PORT_PROGRAMS.find(p => !ns.fileExists(p, "home"));
        if (prog) {
          const cost = ns.singularity.getDarkwebProgramCost(prog);
          if (money >= cost) {
            if (ns.singularity.purchaseProgram(prog)) {
              ns.print(`${t()} [PROGRESSION] Bought ${prog} [STATE TRANSITION] PROGRESSION -> PREP_FACTION`);
              state = STATE.PREP_FACTION;
            } else {
              ns.print(`${t()} [PROGRESSION] Failed to purchase ${prog} but we have funds! Game bug? `);
            }
          } else {
            ns.print(`${t()} [STATE TRANSITION] PROGRESSION -> CRIME. Reason: Insufficient funds for ${prog} have/need (${ns.formatNumber(money)}/${ns.formatNumber(cost)}).`);
            state = STATE.CRIME;
          }
        } else {
          ns.print(`${t()} [STATE TRANSITION] PROGRESSION -> PREP_FACTION. Reason: Prog returned ${prog}. There is no program to buy.`);
          state = STATE.PREP_FACTION;
        }
        await ns.sleep(1000);
        break;
      }
    }
    await ns.sleep(200);
  }
}
