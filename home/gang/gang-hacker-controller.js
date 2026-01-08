/**
 * Enhanced Hacker Gang Controller — V4.0.0
 * Features: Dynamic Ascension | Linear Regression | Smart Logging | Budget Control
 * @param {NS} ns
 */
export async function main(ns) {
  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "gang/gang-hacker-controller.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: gang-hacker-controller.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }

  ns.disableLog("ALL");
  ns.ui.openTail();
  ns.ui.resizeTail(950, 600);

  // ============================================================
  // CONFIG
  // ============================================================

  const TRAIN_TASK = "Train Hacking";
  const TRAIN_CHA_TASK = "Train Charisma";
  const RESPECT_TASK = "Cyberterrorism";
  const PLANT_VIRUS_TASK = "Plant Virus";
  const WANTED_TASK = "Ethical Hacking";
  const MONEY_TASK = "Money Laundering";
  const RANSOMWARE_TASK = "Ransomware";

  const HACK_THRESHOLD = 200;
  const CHA_THRESHOLD = 20;
  const getDynamicAscensionThreshold = (info) => {
    if (info.hack_asc_mult < 10) return 1.6;   // Early game: quick ascensions
    if (info.hack_asc_mult < 100) return 1.4;  // Mid game: balanced growth
    return 1.3;                                // Late game: incremental gains
  };

  const RESPECT_SLOTS = 2;
  const getDynamicWantedMin = (memberCount) => {
    if (memberCount >= 11) return 0.90;  // Full gang: more aggressive
    if (memberCount >= 7) return 0.93;   // Medium gang: balanced
    return 0.95;                         // Small gang: conservative
  };

  const MONEY_TREND_WINDOW = 6;
  const MONEY_GROWTH_EPSILON = 0.01;

  const FAILSAFE_MAX_PHASE_TIME = 60 * 60 * 1000;
  const PURCHASE_PORT = 3;

  const GEAR = [
    "BitWire",
    "DataJack",
    "Neuralstimulator",
    "NUKE Rootkit",
    "Soulstealer Rootkit",
    "Hmap Node",
    "Demon Rootkit",
    "Jack the Ripper"
  ];

  const VEHICLES = [
    "Ford Flex V20",
    "ATX1070 Superbike",
    "Mercedes-Benz S9001",
    "White Ferrari"
  ];

  // ============================================================
  // STATE
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
    ns.print(`  HACKER GANG CONTROL v4.0.0 | ${new Date().toLocaleTimeString()} | Respect: ${ns.formatNumber(gang.respect)}`);
    ns.print(`  State: ${state} | Efficiency: ${(gang.wantedPenalty * 100).toFixed(2)}% | Members: ${ns.gang.getMemberNames().length}/12`);
    ns.print(`  Linear Regression | Dynamic Thresholds | Smart Ascension | Budget Control`);
    ns.print("------------------------------------------------------------------------------------------------");
  };

  const printStatus = (gang, force = false) => {
    const currEff = (gang.wantedPenalty * 100).toFixed(1);
    const canBuy = ns.peek(PURCHASE_PORT) !== "DISABLE";
    const memberCount = ns.gang.getMemberNames().length;
    const minEff = (getDynamicWantedMin(memberCount) * 100).toFixed(0);

    if (force || Math.abs(parseFloat(currEff) - lastLoggedEfficiency) >= 0.5) {
      ns.print(`${getTS()}[STATUS] 📊 ${state} | $${ns.formatNumber(gang.moneyGainRate)}/s | Eff: ${currEff}%/${minEff}% | Buy: ${canBuy ? "✅" : "🛑"}`);
      if (!canBuy) ns.toast("Hacker Gang: Global Purchases are DISABLED (Port 3)", "warning", 120000);
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
    ns.print(`${getTS()}[TASK] 💻 ${m} (H:${Math.floor(info.hack)} C:${Math.floor(info.cha)}) -> ${task}`);
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
      if (v === "Ford Flex V20" && info.cha >= 20) continue;
      if (v === "ATX1070 Superbike" && info.cha >= 50) continue;
      if (v === "Mercedes-Benz S9001" && info.cha >= 100) continue;
      if (v === "White Ferrari" && info.cha >= 150) continue;

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

    if (r.hack >= threshold) {
      if (ns.gang.ascendMember(m)) {
        const mult = info.hack_asc_mult.toFixed(1);
        ns.print(`${getTS()}[ASCEND] ✨ ${m} (${mult}x mult, ${threshold}x threshold) (H:${r.hack?.toFixed(2)})`);
        return true;
      }
    }
    return false;
  };

  const assignBestMoney = (m) => {
    const info = ns.gang.getMemberInformation(m);
    if (ns.gang.getTaskNames().includes(MONEY_TASK)) {
      assign(m, MONEY_TASK);
      return;
    }
    let best = null;
    let bestScore = -1;
    const gang = ns.gang.getGangInformation();
    for (const t of ns.gang.getTaskNames()) {
      const s = ns.gang.getTaskStats(t);
      if (s.baseMoney <= 0) continue;
      if (t === RANSOMWARE_TASK && info.hack >= HACK_THRESHOLD) continue;
      const money = s.baseMoney * info.hack * gang.wantedPenalty;
      const wanted = Math.max(s.baseWanted, 0.001);
      const score = money / wanted;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    assign(m, best ?? MONEY_TASK);
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
      const name = `Hacker-${members.length + 1}`;
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
        if (members.every(m => ns.gang.getMemberInformation(m).hack >= 50)) {
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
          if (info.hack < HACK_THRESHOLD) {
            assign(m, TRAIN_TASK);
            growthReady = false;
          } else if (info.cha < CHA_THRESHOLD) {
            assign(m, TRAIN_CHA_TASK);
            growthReady = false;
          } else {
            assign(m, RESPECT_TASK);
          }
        });
        if (anyAscGrowth) enter(State.RESET);
        else if (growthReady) enter(State.PRODUCTION);
        break;

      case State.PRODUCTION:
        members.sort((a, b) => ns.gang.getMemberInformation(b).hack - ns.gang.getMemberInformation(a).hack);
        members.forEach((m, i) => {
          buyGear(m);
          if (i < RESPECT_SLOTS) {
            const info = ns.gang.getMemberInformation(m);
            if (info.hack < HACK_THRESHOLD) assign(m, PLANT_VIRUS_TASK);
            else assign(m, RESPECT_TASK);
          } else {
            assignBestMoney(m);
          }
        });

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
          if (info.hack < HACK_THRESHOLD || info.cha < CHA_THRESHOLD) resetReady = false;
        });
        enter(resetReady ? State.PRODUCTION : State.GROWTH);
        break;
    }

    await ns.sleep(10000);
  }
}
