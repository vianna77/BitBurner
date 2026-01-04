/** @param {NS} ns */
export async function main(ns) {
  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  const PURCHASE_PORT = 3;
  
  // Combat-specific thresholds
  const STR_THRESHOLD = 100;
  const ASCENSION_THRESHOLD = 1.5;
  
  // Combat Tasks
  const TRAIN_TASK = "Train Combat";
  const RESPECT_TASK = "Territory Warfare";
  const MONEY_TASK = "Human Trafficking";
  const WANTED_TASK = "Vigilante Justice";
  const TERRORISM_TASK = "Terrorism";
  
  // Timing
  const FAILSAFE_MAX_PHASE_TIME = 30 * 60 * 1000;
  const MONEY_TREND_WINDOW = 10;
  const MONEY_GROWTH_EPSILON = 0.01;
  const WANTED_PENALTY_MIN = 0.85;
  const RESPECT_SLOTS = 6;
  
  // Combat Equipment
  const GEAR = [
    "Baseball Bat", "Katana", "Glock 18C", "P90C", "Steyr AUG", "AK-47", "M15A10 Assault Rifle", "AWM Sniper Rifle",
    "Bulletproof Vest", "Full Body Armor", "Liquid Body Armor", "Graphene Plating Armor",
    "Ford Flex V20", "ATX1070 Superbike", "Mercedes-Benz S9001", "White Ferrari",
    "Bionic Arms", "Bionic Legs", "Bionic Spine", "BrachiBlades", "Nanofiber Weave", "Synthetic Heart", "Synfibril Muscle", "Graphene Bone Lacings"
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
    ns.print(`  COMBAT GANG CONTROL v1.0.0 | ${new Date().toLocaleTimeString()} | Respect: ${ns.formatNumber(gang.respect)}`);
    ns.print(`  State: ${state} | Efficiency: ${(gang.wantedPenalty * 100).toFixed(2)}% | Members: ${ns.gang.getMemberNames().length}/12`);
    ns.print("------------------------------------------------------------------------------------------------");
  };

  const printStatus = (gang, force = false) => {
    const currEff = (gang.wantedPenalty * 100).toFixed(1);
    const canBuy = ns.peek(PURCHASE_PORT) !== "DISABLE";
    
    if (force || Math.abs(parseFloat(currEff) - lastLoggedEfficiency) >= 0.5) {
      ns.print(`${getTS()}[STATUS] 📊 ${state} | $${ns.formatNumber(gang.moneyGainRate)}/s | Eff: ${currEff}% | Buy: ${canBuy ? "✅" : "🛑"}`);
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
    const a = moneyHistory[0];
    const b = moneyHistory[moneyHistory.length - 1];
    return (b - a) / Math.max(a, 1) < MONEY_GROWTH_EPSILON;
  };

  const assign = (m, task) => {
    const info = ns.gang.getMemberInformation(m);
    if (info.task === task) return;
    ns.gang.setMemberTask(m, task);
    ns.print(`${getTS()}[TASK] 🥊 ${m} (S:${Math.floor(info.str)} D:${Math.floor(info.def)} X:${Math.floor(info.dex)} A:${Math.floor(info.agi)}) -> ${task}`);
  };

  const buyGear = (m) => {
    if (ns.peek(PURCHASE_PORT) === "DISABLE") return;
    const info = ns.gang.getMemberInformation(m);
    const cash = ns.getServerMoneyAvailable("home");
    
    for (const g of GEAR) {
      if (info.upgrades.includes(g) || info.augmentations.includes(g)) continue;
      if (g === "Ford Flex V20" && info.agi >= 20) continue;
      if (g === "ATX1070 Superbike" && info.agi >= 50) continue;
      if (g === "Mercedes-Benz S9001" && info.agi >= 100) continue;
      if (g === "White Ferrari" && info.agi >= 150) continue;

      const cost = ns.gang.getEquipmentCost(g);
      if (cash < cost) continue;
      if (ns.gang.purchaseEquipment(m, g)) {
        ns.print(`${getTS()}[GEAR] 📦 ${m} purchased ${g}`);
      }
    }
  };

  const tryAscend = (m) => {
    const r = ns.gang.getAscensionResult(m);
    if (!r) return false;
    if (r.str >= ASCENSION_THRESHOLD || r.def >= ASCENSION_THRESHOLD || r.dex >= ASCENSION_THRESHOLD || r.agi >= ASCENSION_THRESHOLD) {
      if (ns.gang.ascendMember(m)) {
        ns.print(`${getTS()}[ASCEND] ✨ ${m} (S:${r.str?.toFixed(2)} D:${r.def?.toFixed(2)} X:${r.dex?.toFixed(2)} A:${r.agi?.toFixed(2)})`);
        return true;
      }
    }
    return false;
  };

  const assignBestMoney = (m) => {
    const info = ns.gang.getMemberInformation(m);
    let best = null;
    let bestScore = -1;
    const gang = ns.gang.getGangInformation();
    
    for (const t of ns.gang.getTaskNames()) {
      const s = ns.gang.getTaskStats(t);
      if (s.baseMoney <= 0) continue;
      
      const statValue = (info.str * s.strWeight + info.def * s.defWeight + info.dex * s.dexWeight + info.agi * s.agiWeight + info.cha * s.chaWeight) / 100;
      const money = s.baseMoney * statValue * gang.wantedPenalty;
      const wanted = Math.max(s.baseWanted, 0.001);
      const score = money / wanted;
      
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    assign(m, best ?? MONEY_TASK);
  };

  const getLowestCombatStat = (info) => {
    return Math.min(info.str, info.def, info.dex, info.agi);
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
      const name = `Fighter-${members.length + 1}`;
      ns.gang.recruitMember(name);
      ns.print(`${getTS()}[RECRUIT] 👥 ${name}`);
      members = ns.gang.getMemberNames();
    }

    switch (state) {
      case State.BOOTSTRAP:
        members.forEach(m => {
          tryAscend(m);
          assign(m, TRAIN_TASK);
          buyGear(m);
        });
        if (members.every(m => getLowestCombatStat(ns.gang.getMemberInformation(m)) >= 50)) {
          enter(State.GROWTH);
        }
        break;

      case State.GROWTH:
        let growthReady = true;
        let anyAscGrowth = false;
        members.forEach(m => {
          if (tryAscend(m)) anyAscGrowth = true;
          const info = ns.gang.getMemberInformation(m);
          buyGear(m);
          
          const lowestStat = getLowestCombatStat(info);
          if (lowestStat < STR_THRESHOLD) {
            assign(m, TRAIN_TASK);
            growthReady = false;
          } else {
            assign(m, RESPECT_TASK);
          }
        });
        if (anyAscGrowth) enter(State.RESET);
        else if (growthReady) enter(State.PRODUCTION);
        break;

      case State.PRODUCTION:
        members.sort((a, b) => {
          const infoA = ns.gang.getMemberInformation(a);
          const infoB = ns.gang.getMemberInformation(b);
          const avgA = (infoA.str + infoA.def + infoA.dex + infoA.agi) / 4;
          const avgB = (infoB.str + infoB.def + infoB.dex + infoB.agi) / 4;
          return avgB - avgA;
        });
        
        members.forEach((m, i) => {
          buyGear(m);
          if (i < RESPECT_SLOTS) {
            const info = ns.gang.getMemberInformation(m);
            const lowestStat = getLowestCombatStat(info);
            if (lowestStat < STR_THRESHOLD) {
              assign(m, TRAIN_TASK);
            } else {
              assign(m, TERRORISM_TASK);
            }
          } else {
            assignBestMoney(m);
          }
        });

        let goToReduction = true;
        if (gang.wantedPenalty < WANTED_PENALTY_MIN) {
          ns.print(`${getTS()}[TRANSITION] 🟡 Reason: Efficiency dropped below ${WANTED_PENALTY_MIN * 100}%`);
        } else if (moneySaturated()) {
          ns.print(`${getTS()}[TRANSITION] 💸 Reason: Money growth saturated`);
        } else if (failsafe()) {
          ns.print(`${getTS()}[TRANSITION] ⏱️ Reason: Failsafe timer reached`);
        } else {
          goToReduction = false;
        }
        if (goToReduction) enter(State.REDUCTION);
        break;

      case State.REDUCTION:
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

      case State.RESET:
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

    await ns.sleep(10000);
  }
}