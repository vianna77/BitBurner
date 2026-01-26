/** @param {NS} ns */
export async function main(ns) {
  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "gang/gang-combat-controller.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: gang-combat-controller.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }
  // ============================================================
  // CONFIGURATION
  // ============================================================

  const PURCHASE_PORT = 3;

  // Combat-specific thresholds
  const STR_THRESHOLD = 100;
  const CHA_THRESHOLD = 10;
  const getDynamicAscensionThreshold = (info) => {
    const maxMultiplier = Math.max(info.str_asc_mult, info.def_asc_mult, info.dex_asc_mult, info.agi_asc_mult);
    if (maxMultiplier < 10) return 1.6;   // Early game: quick ascensions
    if (maxMultiplier < 100) return 1.4;  // Mid game: balanced growth
    return 1.3;                           // Late game: incremental gains
  };

  // Combat Tasks
  const TRAIN_TASK = "Train Combat";
  const RESPECT_TASK = "Territory Warfare";
  const MONEY_TASK = "Human Trafficking";
  const WANTED_TASK = "Vigilante Justice";
  const TERRORISM_TASK = "Terrorism";
  const ARMS_TRAFFICKING_TASK = "Traffick Illegal Arms";

  // Timing
  const FAILSAFE_MAX_PHASE_TIME = 30 * 60 * 1000;
  const MONEY_TREND_WINDOW = 10;
  const MONEY_GROWTH_EPSILON = 0.01;
  const getDynamicWantedMin = (memberCount) => {
    if (memberCount >= 11) return 0.65;  // Full gang: more aggressive
    if (memberCount >= 7) return 0.80;   // Medium gang: balanced
    return 0.85;                         // Small gang: conservative
  };
  const RESPECT_SLOTS = 6;

  // Combat Equipment
  const GEAR = [
    "Baseball Bat", "Katana", "Glock 18C", "P90C", "Steyr AUG", "AK-47", "M15A10 Assault Rifle", "AWM Sniper Rifle",
    "Bulletproof Vest", "Full Body Armor", "Liquid Body Armor", "Graphene Plating Armor",
    "Bionic Arms", "Bionic Legs", "Bionic Spine", "BrachiBlades", "Nanofiber Weave", "Synthetic Heart", "Synfibril Muscle", "Graphene Bone Lacings"
  ];

  const VEHICLES = [
    "Ford Flex V20", "ATX1070 Superbike", "Mercedes-Benz S9001", "White Ferrari"
  ];

  // ============================================================
  // STATE MACHINE
  // ============================================================

  const State = {
    BOOTSTRAP: "BOOTSTRAP",
    GROWTH: "GROWTH",
    PRODUCTION: "PRODUCTION",
    REDUCTION: "REDUCTION",
    RESET: "RESET"
  };

  let state = State.BOOTSTRAP;
  let stateStart = Date.now();
  let moneyHistory = [];
  let prodStartRespect = 0;
  let lastLoggedEfficiency = 0;
  let lastHeaderTime = 0;

  // ============================================================
  // HELPERS
  // ============================================================

  const getTS = () => `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] `;

  const printHeader = (gang) => {
    ns.print("------------------------------------------------------------------------------------------------");
    ns.print(`  COMBAT GANG CONTROL v1.3.0 | ${new Date().toLocaleTimeString()} | Respect: ${ns.formatNumber(gang.respect)}`);
    ns.print(`  State: ${state} | Efficiency: ${(gang.wantedPenalty * 100).toFixed(2)}% | Members: ${ns.gang.getMemberNames().length}/12`);
    ns.print(`  Linear Regression | Dynamic Thresholds | Smart Ascension | Late Game Optimization`);
    ns.print("------------------------------------------------------------------------------------------------");
  };

  const printStatus = (gang, force = false) => {
    const currEff = (gang.wantedPenalty * 100).toFixed(1);
    const canBuy = ns.peek(PURCHASE_PORT) !== "DISABLE";
    const memberCount = ns.gang.getMemberNames().length;
    const minEff = (getDynamicWantedMin(memberCount) * 100).toFixed(0);

    if (force || Math.abs(parseFloat(currEff) - lastLoggedEfficiency) >= 0.5) {
      ns.print(`${getTS()}[STATUS] 📊 ${state} | $${ns.formatNumber(gang.moneyGainRate)}/s | Eff: ${currEff}%/${minEff}% | Buy: ${canBuy ? "✅" : "🛑"}`);
      if (!canBuy) ns.toast("Combat Gang: Global Purchases are DISABLED (Port 3)", "warning", 120000);
      lastLoggedEfficiency = parseFloat(currEff);
    }
  };

  const enter = (s) => {
    const gangInfo = ns.gang.getGangInformation();
    const currRespect = gangInfo.respect;
    if (state === State.PRODUCTION) {
      const gainRes = currRespect - prodStartRespect;
      ns.print(`${getTS()}[GAIN] 📈 PRODUCTION Cycle: Respect: +${ns.formatNumber(gainRes)}`);
    }
    ns.print(`${getTS()}[STATE] 🔄 ${state} -> ${s}`);
    state = s;
    stateStart = Date.now();
    moneyHistory = [];
    printStatus(gangInfo, true);
    if (s === State.PRODUCTION) prodStartRespect = currRespect;
  };

  const failsafe = () => Date.now() - stateStart > FAILSAFE_MAX_PHASE_TIME;

  const trackMoney = (v) => {
    moneyHistory.push(v);
    if (moneyHistory.length > MONEY_TREND_WINDOW) moneyHistory.shift();
  };

  const moneySaturated = () => {
    if (moneyHistory.length < MONEY_TREND_WINDOW) return false;

    const n = moneyHistory.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = moneyHistory[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / Math.max((n * sumXX - sumX * sumX), 1);
    const avg = sumY / n;

    return slope / Math.max(avg, 1) < MONEY_GROWTH_EPSILON;
  };

  const assign = (m, task) => {
    const info = ns.gang.getMemberInformation(m);
    if (info.task === task) return;
    ns.gang.setMemberTask(m, task);
    ns.print(`${getTS()}[TASK] 🥊 ${m} (S:${Math.floor(info.str)} D:${Math.floor(info.def)} X:${Math.floor(info.dex)} A:${Math.floor(info.agi)} C:${Math.floor(info.cha)}) -> ${task}`);
  };

  const needsCharismaTraining = (info) => {
    return info.cha < CHA_THRESHOLD;
  };

  const buyGear = (m) => {
    if (ns.peek(PURCHASE_PORT) === "DISABLE") return;
    const info = ns.gang.getMemberInformation(m);
    const cash = ns.getServerMoneyAvailable("home");

    // Buy regular gear first
    for (const g of GEAR) {
      if (info.upgrades.includes(g) || info.augmentations.includes(g)) continue;
      const cost = ns.gang.getEquipmentCost(g);
      if (cash < cost) continue;
      if (ns.gang.purchaseEquipment(m, g)) {
        ns.print(`${getTS()}[GEAR] 📦 ${m} purchased ${g}`);
      }
    }

    // Buy vehicles with cost limit
    for (const v of VEHICLES) {
      if (info.upgrades.includes(v) || info.augmentations.includes(v)) continue;
      if (v === "Ford Flex V20" && info.agi >= 20) continue;
      if (v === "ATX1070 Superbike" && info.agi >= 50) continue;
      if (v === "Mercedes-Benz S9001" && info.agi >= 100) continue;
      if (v === "White Ferrari" && info.agi >= 150) continue;

      const cost = ns.gang.getEquipmentCost(v);
      if (cost > cash * 0.3) continue;
      if (ns.gang.purchaseEquipment(m, v)) {
        ns.print(`${getTS()}[VEHICLE] 🚗 ${m} purchased ${v}`);
      }
    }
  };

  const tryAscend = (m) => {
    const r = ns.gang.getAscensionResult(m);
    if (!r) return false;

    const info = ns.gang.getMemberInformation(m);
    const threshold = getDynamicAscensionThreshold(info);

    if (r.str >= threshold || r.def >= threshold || r.dex >= threshold || r.agi >= threshold) {
      if (ns.gang.ascendMember(m)) {
        const mult = Math.max(info.str_asc_mult, info.def_asc_mult, info.dex_asc_mult, info.agi_asc_mult).toFixed(1);
        ns.print(`${getTS()}[ASCEND] ✨ ${m} (${mult}x mult, ${threshold}x threshold) (S:${r.str?.toFixed(2)} D:${r.def?.toFixed(2)} X:${r.dex?.toFixed(2)} A:${r.agi?.toFixed(2)})`);
        return true;
      }
    }
    return false;
  };

  const assignBestMoney = (m) => {
    const info = ns.gang.getMemberInformation(m);
    let best = null;
    let bestMoney = -1;
    const gang = ns.gang.getGangInformation();

    for (const t of ns.gang.getTaskNames()) {
      const s = ns.gang.getTaskStats(t);
      if (s.baseMoney <= 0) continue;

      const statValue = (info.str * s.strWeight + info.def * s.defWeight + info.dex * s.dexWeight + info.agi * s.agiWeight + info.cha * s.chaWeight) / 100;
      const money = s.baseMoney * statValue * gang.wantedPenalty;

      if (money > bestMoney) {
        bestMoney = money;
        best = t;
      }
    }
    assign(m, best ?? MONEY_TASK);
  };

  const getLowestCombatStat = (info) => {
    return Math.min(info.str, info.def, info.dex, info.agi);
  };

  const hasEnoughReputation = (gang) => {
    try {
      const faction = gang.faction;

      // Check faction reputation, not gang respect
      const factionRep = ns.singularity.getFactionRep(faction);
      const LATE_GAME_THRESHOLD = 2500000; // 2.5m faction reputation

      const result = factionRep >= LATE_GAME_THRESHOLD;
      ns.print(`${getTS()}[DEBUG] 🔍 Faction: ${faction}, Late Game Threshold: ${ns.formatNumber(LATE_GAME_THRESHOLD)}, Current Faction Rep: ${ns.formatNumber(factionRep)}, Gang Respect: ${ns.formatNumber(gang.respect)}, Result: ${result}`);

      return result;
    } catch (e) {
      ns.print(`${getTS()}[DEBUG] ⚠️ hasEnoughReputation error: ${e.message}`);
      return false;
    }
  };

  // ============================================================
  // MAIN LOOP
  // ============================================================

  while (true) {
    const gang = ns.gang.getGangInformation();
    let members = ns.gang.getMemberNames();
    const now = Date.now();

    if (now - lastHeaderTime > 600000) {
      printHeader(gang);
      lastHeaderTime = now;
    }

    trackMoney(gang.moneyGainRate);
    printStatus(gang);

    if (ns.gang.canRecruitMember()) {
      const name = `Member-${members.length + 1}`;
      ns.gang.recruitMember(name);
      ns.print(`${getTS()}[RECRUIT] 👥 ${name}`);
      members = ns.gang.getMemberNames();
    }

    switch (state) {
      case State.BOOTSTRAP: {
        members.forEach(m => {
          tryAscend(m);
          const info = ns.gang.getMemberInformation(m);
          if (needsCharismaTraining(info)) {
            assign(m, "Train Charisma");
          } else {
            assign(m, TRAIN_TASK);
          }
          buyGear(m);
        });
        if (members.every(m => {
          const info = ns.gang.getMemberInformation(m);
          return getLowestCombatStat(info) >= 50 && info.cha >= CHA_THRESHOLD;
        })) {
          enter(State.GROWTH);
        }
        break;
      }

      case State.GROWTH: {
        let growthReady = true;
        let anyAscGrowth = false;
        members.forEach(m => {
          if (tryAscend(m)) anyAscGrowth = true;
          const info = ns.gang.getMemberInformation(m);
          buyGear(m);

          if (needsCharismaTraining(info)) {
            assign(m, "Train Charisma");
            growthReady = false;
          } else {
            const lowestStat = getLowestCombatStat(info);
            if (lowestStat < STR_THRESHOLD) {
              assign(m, TRAIN_TASK);
              growthReady = false;
            } else {
              assign(m, RESPECT_TASK);
            }
          }
        });
        if (anyAscGrowth) enter(State.RESET);
        else if (growthReady) enter(State.PRODUCTION);
        break;
      }

      case State.PRODUCTION: {
        members.sort((a, b) => {
          const infoA = ns.gang.getMemberInformation(a);
          const infoB = ns.gang.getMemberInformation(b);
          const avgA = (infoA.str + infoA.def + infoA.dex + infoA.agi) / 4;
          const avgB = (infoB.str + infoB.def + infoB.dex + infoB.agi) / 4;
          return avgB - avgA;
        });

        const hasMaxRep = hasEnoughReputation(gang);
        ns.print(`${getTS()}[DEBUG] 🔍 hasMaxRep: ${hasMaxRep}, gang.respect: ${ns.formatNumber(gang.respect)}, gang.faction: ${gang.faction}`);

        if (hasMaxRep) {
          ns.print(`${getTS()}[STRATEGY] 💰 Late Game Mode: Max reputation achieved, focusing on money generation`);
        } else {
          ns.print(`${getTS()}[STRATEGY] 📈 Early/Mid Game Mode: Building reputation and stats`);
        }

        members.forEach((m, i) => {
          buyGear(m);
          const info = ns.gang.getMemberInformation(m);

          if (needsCharismaTraining(info)) {
            assign(m, "Train Charisma");
          } else if (hasMaxRep) {
            // Late game: start with everyone on money
            assign(m, ARMS_TRAFFICKING_TASK);
          } else {
            // Early/mid game: current strategy
            if (i < RESPECT_SLOTS) {
              const lowestStat = getLowestCombatStat(info);
              if (lowestStat < STR_THRESHOLD) {
                assign(m, TRAIN_TASK);
              } else {
                assign(m, TERRORISM_TASK);
              }
            } else {
              assignBestMoney(m);
            }
          }
        });

        // Dynamic wanted control for late game
        if (hasMaxRep) {
          const currentWanted = gang.wantedLevelGainRate;
          ns.print(`${getTS()}[DEBUG] 🔍 Wanted Growth Rate: ${currentWanted.toFixed(6)}/sec`);

          if (currentWanted > 0) {
            // Find weakest member and assign to wanted control
            let weakestMember = null;
            let weakestAvg = Infinity;

            for (const m of members) {
              const info = ns.gang.getMemberInformation(m);
              if (info.task === WANTED_TASK) continue;

              const avg = (info.str + info.def + info.dex + info.agi) / 4;
              if (avg < weakestAvg) {
                weakestAvg = avg;
                weakestMember = m;
              }
            }

            if (weakestMember) {
              assign(weakestMember, WANTED_TASK);
              ns.print(`${getTS()}[WANTED] 👮 ${weakestMember} (avg: ${weakestAvg.toFixed(1)}) assigned to wanted control`);
            }
          }
        }

        let goToReduction = true;
        const currentWantedMin = getDynamicWantedMin(members.length);
        if (gang.wantedPenalty < currentWantedMin) {
          ns.print(`${getTS()}[TRANSITION] 🟡 Reason: Efficiency dropped below ${(currentWantedMin * 100).toFixed(0)}%`);
        } else if (moneySaturated()) {
          ns.print(`${getTS()}[TRANSITION] 💸 Reason: Money growth saturated`);
        } else if (failsafe()) {
          ns.print(`${getTS()}[TRANSITION] ⏱️ Reason: Failsafe timer reached`);
        } else {
          goToReduction = false;
        }
        if (goToReduction) enter(State.REDUCTION);
        break;
      }

      case State.REDUCTION: {
        let anyAscendedThisTick = false;
        for (const m of members) {
          if (tryAscend(m)) anyAscendedThisTick = true;
          buyGear(m);
          assign(m, WANTED_TASK);
        }

        let leaveReduction = true;
        if (gang.wantedPenalty >= 0.99) {
          ns.print(`${getTS()}[TRANSITION] ✅ Reason: Efficiency restored to 99%`);
        } else if (gang.wantedLevel <= 1) {
          ns.print(`${getTS()}[TRANSITION] 👮 Reason: Wanted level cleared`);
        } else if (anyAscendedThisTick) {
          ns.print(`${getTS()}[TRANSITION] ✨ Reason: Member ascended, resetting stats`);
        } else {
          leaveReduction = false;
        }

        if (leaveReduction) enter(State.RESET);
        break;
      }

      case State.RESET: {
        let resetReady = true;
        members.forEach(m => {
          tryAscend(m);
          buyGear(m);
          const info = ns.gang.getMemberInformation(m);
          const lowestStat = getLowestCombatStat(info);
          if (lowestStat < STR_THRESHOLD) resetReady = false;
        });
        enter(resetReady ? State.PRODUCTION : State.GROWTH);
        break;
      }
    }

    await ns.sleep(10000);
  }
}
