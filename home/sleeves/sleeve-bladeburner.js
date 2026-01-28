// VERSION: 2.1.0
// Sleeve Bladeburner FSM — strict rules implementation

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const CONTRACTS = [
    { sleeve: 0, name: "Tracking" },
    { sleeve: 1, name: "Bounty Hunter" },
    { sleeve: 2, name: "Retirement" }
  ];

  const ACTION_CONTRACT = "Take on contracts";
  const ACTION_FIELD = "Field Analysis";
  const ACTION_INFIL = "Infiltrate Synthoids";
  const TYPE_CONTRACT = "Contract";

  let state = "NORMAL";

  while (true) {

    /* ---------- OBSERVATION PHASE ---------- */

    let anyChanceLow = false;
    let allCounts100 = true;
    let cannotExecute = false;

    for (const c of CONTRACTS) {
      const [minChance] =
        ns.bladeburner.getActionEstimatedSuccessChance(TYPE_CONTRACT, c.name);

      if (minChance < 1) anyChanceLow = true;

      const count =
        ns.bladeburner.getActionCountRemaining(TYPE_CONTRACT, c.name);

      if (count < 100) allCounts100 = false;

      // HARD EXECUTION TEST (source of truth)
      const ok = ns.sleeve.setToBladeburnerAction(
        c.sleeve,
        ACTION_CONTRACT,
        c.name
      );

      if (!ok) cannotExecute = true;
    }

    /* ---------- TRANSITION PHASE ---------- */

    if (anyChanceLow) {
      state = "SAFETY";
    } else if (state === "NORMAL" && cannotExecute) {
      state = "INFILTRATE";
    } else if (state === "INFILTRATE" && allCounts100) {
      state = "NORMAL";
    } else if (state === "SAFETY" && !anyChanceLow) {
      state = cannotExecute ? "INFILTRATE" : "NORMAL";
    }

    ns.print(`FSM=${state}`);

    /* ---------- ACTION PHASE ---------- */

    const sleeves = ns.sleeve.getNumSleeves();

    if (state === "NORMAL") {
      for (let i = 0; i < sleeves; i++) {
        if (i === 0)
          ns.sleeve.setToBladeburnerAction(i, ACTION_CONTRACT, "Tracking");
        else if (i === 1)
          ns.sleeve.setToBladeburnerAction(i, ACTION_CONTRACT, "Bounty Hunter");
        else if (i === 2)
          ns.sleeve.setToBladeburnerAction(i, ACTION_CONTRACT, "Retirement");
        else
          ns.sleeve.setToBladeburnerAction(i, ACTION_FIELD);
      }
    }

    if (state === "INFILTRATE") {
      for (let i = 0; i < sleeves; i++) {
        ns.sleeve.setToBladeburnerAction(i, ACTION_INFIL);
      }
    }

    if (state === "SAFETY") {
      for (let i = 0; i < sleeves; i++) {
        ns.sleeve.setToBladeburnerAction(i, ACTION_FIELD);
      }
    }

    await ns.sleep(2000);
  }
}
