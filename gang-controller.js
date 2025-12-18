/**
 * Metric-Driven Gang Controller — Final Stable
 *
 * Key rules:
 * - Money Laundering is hard-priority for money
 * - Ransomware only allowed for low-hack members (<200)
 * - Strong members never do Ethical Hacking in PRODUCTION
 * - Respect, money and wanted are explicitly separated
 *
 * @param {NS} ns
 */

export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  // ============================================================
  // CONFIG
  // ============================================================

  const TRAIN_TASK = "Train Hacking";
  const RESPECT_TASK = "Cyberterrorism";
  const WANTED_TASK = "Ethical Hacking";
  const MONEY_TASK = "Money Laundering";
  const RANSOMWARE_TASK = "Ransomware";

  const HACK_THRESHOLD = 200;
  const ASCENSION_THRESHOLD = 1.75;

  const RESPECT_SLOTS = 2;
  const WANTED_PENALTY_MIN = 0.95;

  const MONEY_TREND_WINDOW = 6;
  const MONEY_GROWTH_EPSILON = 0.01;

  const FAILSAFE_MAX_PHASE_TIME = 45 * 60 * 1000;

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

  // ============================================================
  // HELPERS
  // ============================================================

  const enter = (s) => {
    ns.print(`[STATE] ${state} -> ${s}`);
    state = s;
    stateStart = Date.now();
    moneyHistory = [];
  };

  const failsafe = () =>
    Date.now() - stateStart > FAILSAFE_MAX_PHASE_TIME;

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
    ns.print(`[TASK] ${m} -> ${task}`);
  };

  const buyGear = (m) => {
    const info = ns.gang.getMemberInformation(m);
    const cash = ns.getServerMoneyAvailable("home");

    for (const g of GEAR) {
      if (info.upgrades.includes(g) || info.augmentations.includes(g)) continue;
      const cost = ns.gang.getEquipmentCost(g);
      if (cash < cost) continue;
      if (ns.gang.purchaseEquipment(m, g)) {
        ns.print(`[GEAR] ${m} purchased ${g}`);
      }
    }
  };

  const tryAscend = (m) => {
    const r = ns.gang.getAscensionResult(m);
    if (!r) return;
    if (r.hack >= ASCENSION_THRESHOLD) {
      if (ns.gang.ascendMember(m)) {
        ns.print(`[ASCEND] ${m}`);
      }
    }
  };

  // ============================================================
  // MONEY LOGIC (FIXED)
  // ============================================================

  const assignBestMoney = (m) => {
    const info = ns.gang.getMemberInformation(m);

    // Hard priority
    if (ns.gang.getTaskNames().includes(MONEY_TASK)) {
      assign(m, MONEY_TASK);
      return;
    }

    // Fallback: score-based (rare)
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

    trackMoney(gang.moneyGainRate);

    ns.print(
      `[STATUS] ${state} | $${ns.formatNumber(gang.moneyGainRate)}/s | ` +
      `Penalty:${gang.wantedPenalty.toFixed(3)}`
    );

    if (ns.gang.canRecruitMember()) {
      const name = `Hacker-${members.length + 1}`;
      ns.gang.recruitMember(name);
      ns.print(`[RECRUIT] ${name}`);
      members = ns.gang.getMemberNames();
    }

    switch (state) {

      case State.BOOTSTRAP:
        members.forEach(m => {
          assign(m, TRAIN_TASK);
          buyGear(m);
        });
        if (members.every(m => ns.gang.getMemberInformation(m).hack >= 50)) {
          enter(State.GROWTH);
        }
        break;

      case State.GROWTH:
        members.forEach(m => {
          const h = ns.gang.getMemberInformation(m).hack;
          buyGear(m);
          assign(m, h < HACK_THRESHOLD ? TRAIN_TASK : RESPECT_TASK);
        });
        if (moneyHistory.length >= MONEY_TREND_WINDOW) {
          enter(State.PRODUCTION);
        }
        break;

      case State.PRODUCTION:
        members.sort((a, b) =>
          ns.gang.getMemberInformation(b).hack -
          ns.gang.getMemberInformation(a).hack
        );

        members.forEach((m, i) => {
          buyGear(m);
          if (i < RESPECT_SLOTS) {
            assign(m, RESPECT_TASK);
          } else {
            assignBestMoney(m);
          }
        });

        if (
          gang.wantedPenalty < WANTED_PENALTY_MIN ||
          moneySaturated() ||
          failsafe()
        ) {
          enter(State.REDUCTION);
        }
        break;

      case State.REDUCTION:
        members.forEach(m => assign(m, WANTED_TASK));
        if (gang.wantedPenalty >= 0.99) {
          enter(State.RESET);
        }
        break;

      case State.RESET:
        members.forEach(m => {
          tryAscend(m);
          buyGear(m);
        });

        const avgHack =
          members.reduce((a, m) =>
            a + ns.gang.getMemberInformation(m).hack, 0
          ) / members.length;

        enter(avgHack < HACK_THRESHOLD ? State.GROWTH : State.PRODUCTION);
        break;
    }

    await ns.sleep(10000);
  }
}
