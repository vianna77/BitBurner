/**
 * Metric-Driven Gang Controller v2.1
 *
 * Improvements:
 * - Fixed dynamic task allocation (real per-task scoring)
 * - Adjusted ascension threshold (2.0 -> 1.75)
 * - RESET can return to GROWTH if gang is weakened
 * - BOOTSTRAP exits based on metrics, not time
 *
 * @param {NS} ns
 */

export function autocomplete(data, args) {
  return [];
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  // ============================================================
  // CONFIGURATION
  // ============================================================

  const TRAIN_TASK = "Train Hacking";
  const RESPECT_TASK = "Cyberterrorism";
  const WANTED_TASK = "Ethical Hacking";

  const HACK_THRESHOLD = 200;
  const ASCENSION_THRESHOLD = 1.75;

  const RESPECT_FARMERS = 1;
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
  let stateStartTime = Date.now();
  let moneyHistory = [];

  // ============================================================
  // HELPERS
  // ============================================================

  const enterState = (next) => {
    ns.print(`[STATE] ${state} -> ${next}`);
    state = next;
    stateStartTime = Date.now();
    moneyHistory = [];
  };

  const failsafe = () =>
    Date.now() - stateStartTime > FAILSAFE_MAX_PHASE_TIME;

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

  const buyGear = (member) => {
    const info = ns.gang.getMemberInformation(member);
    const cash = ns.getServerMoneyAvailable("home");

    for (const item of GEAR) {
      if (
        info.upgrades.includes(item) ||
        info.augmentations.includes(item)
      ) continue;

      const cost = ns.gang.getEquipmentCost(item);
      if (cash < cost) continue;

      const ok = ns.gang.purchaseEquipment(member, item);
      ns.print(
        ok
          ? `[GEAR] ${member} purchased ${item}.`
          : `[GEAR] ${member} FAILED to purchase ${item}.`
      );
    }
  };

  const tryAscend = (member) => {
    const r = ns.gang.getAscensionResult(member);
    if (!r) {
      ns.print(`[ASCEND CHECK] ${member} | no result | SKIP`);
      return;
    }

    ns.print(
      `[ASCEND CHECK] ${member} | Hack x${r.hack.toFixed(3)} | ` +
      `Threshold x${ASCENSION_THRESHOLD}`
    );

    if (r.hack >= ASCENSION_THRESHOLD) {
      const ok = ns.gang.ascendMember(member);
      ns.print(
        ok
          ? `[ASCEND] ${member} ascended`
          : `[ASCEND] ${member} FAILED`
      );
    }
  };

  const assignTask = (m, task) => {
    const info = ns.gang.getMemberInformation(m);
    if (info.task === task) return;
    const ok = ns.gang.setMemberTask(m, task);
    ns.print(
      ok
        ? `[TASK] ${m} -> ${task}`
        : `[TASK] FAILED ${m} -> ${task}`
    );
  };

  /**
   * Real dynamic money task selection.
   * Uses taskStats, not current member gains.
   */
  const assignBestMoneyTask = (member) => {
    const gang = ns.gang.getGangInformation();
    const info = ns.gang.getMemberInformation(member);

    let bestTask = null;
    let bestScore = -Infinity;

    for (const task of ns.gang.getTaskNames()) {
      const stats = ns.gang.getTaskStats(task);
      if (stats.baseMoney <= 0) continue;

      const money =
        stats.baseMoney * gang.wantedPenalty * info.hack;
      const wantedCost =
        Math.max(stats.baseWanted, 0.001);

      const score = money / wantedCost;

      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    if (bestTask) {
      assignTask(member, bestTask);
    } else {
      assignTask(member, RESPECT_TASK);
    }
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
      const name = `GANG-${members.length + 1}`;
      ns.gang.recruitMember(name);
      ns.print(`[RECRUIT] ${name}`);
      members = ns.gang.getMemberNames();
    }

    switch (state) {

      case State.BOOTSTRAP:
        for (const m of members) {
          assignTask(m, TRAIN_TASK);
          buyGear(m);
        }
        if (members.every(m => ns.gang.getMemberInformation(m).hack >= 50)) {
          enterState(State.GROWTH);
        }
        break;

      case State.GROWTH:
        for (const m of members) {
          const info = ns.gang.getMemberInformation(m);
          buyGear(m);
          assignTask(
            m,
            info.hack < HACK_THRESHOLD ? TRAIN_TASK : RESPECT_TASK
          );
        }
        if (moneyHistory.length >= MONEY_TREND_WINDOW) {
          enterState(State.PRODUCTION);
        }
        break;

      case State.PRODUCTION:
        members.sort((a, b) =>
          ns.gang.getMemberInformation(b).hack -
          ns.gang.getMemberInformation(a).hack
        );

        members.forEach((m, i) => {
          buyGear(m);
          i < RESPECT_FARMERS
            ? assignTask(m, RESPECT_TASK)
            : assignBestMoneyTask(m);
        });

        if (
          gang.wantedPenalty < WANTED_PENALTY_MIN ||
          moneySaturated() ||
          failsafe()
        ) {
          enterState(State.REDUCTION);
        }
        break;

      case State.REDUCTION:
        members.forEach(m => assignTask(m, WANTED_TASK));
        if (gang.wantedPenalty >= 0.99) {
          enterState(State.RESET);
        } else if (failsafe()) {
          enterState(State.PRODUCTION);
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

        enterState(
          avgHack < HACK_THRESHOLD
            ? State.GROWTH
            : State.PRODUCTION
        );
        break;
    }

    await ns.sleep(10000);
  }
}
