// VERSION: 1.5.0
/**
 * Sleeve Bladeburner Manager
 *
 * RULES:
 * 1. Sleeve 0 -> Tracking
 * 2. Sleeve 1 -> Bounty Hunter
 * 3. Sleeve 2 -> Retirement
 * 4. Sleeve 3+ -> Field Analysis
 * 5. GLOBAL TRIGGER: If ANY of the 3 contract types reaches 0 count:
 *    - ALL sleeves switch to "Infiltrate Synthoids".
 *    - They stay on Infiltrate until ALL 3 contract types have >= 100 count.
 * 6. SAFETY TRIGGER: If ANY of the 3 contract types has success chance < 100%:
 *    - ALL sleeves switch to "Field Analysis" until ALL 3 types have 100% chance.
 *
 * USAGE:
 * run /sleeves/sleeve-bladeburner.js
 */

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const ACTION_CONTRACTS = "Take on contracts";
  const ACTION_FIELD_ANALYSIS = "Field Analysis";
  const ACTION_INFILTRATE = "Infiltrate Synthoids";
  const TYPE_CONTRACT = "Contract";

  const CONTRACT_TYPES = ["Tracking", "Bounty Hunter", "Retirement"];

  ns.print("Starting Sleeve Bladeburner Manager v1.5.0...");

  // State variables to maintain hysteresis (the "until" logic)
  let stateSafety = false;
  let stateInfiltrate = false;

  // Attempt to restore state from current actions on startup
  const task0 = ns.sleeve.getTask(0);
  if (task0 && task0.type === "BLADEBURNER") {
    if (task0.actionName === ACTION_INFILTRATE) stateInfiltrate = true;
    // Sleeve 0 only does Field Analysis in Safety Mode (normally it does Tracking)
    if (task0.actionName === ACTION_FIELD_ANALYSIS) stateSafety = true;
  }

  while (true) {
    const numSleeves = ns.sleeve.getNumSleeves();

    // 1. Check Contract Counts & Chances
    const counts = {};
    let allCounts100 = true;
    let anyCountZero = false;
    let allChances100 = true;
    let anyChanceLow = false;

    for (const type of CONTRACT_TYPES) {
      const count = ns.bladeburner.getActionCountRemaining(TYPE_CONTRACT, type);
      const [minChance] = ns.bladeburner.getActionEstimatedSuccessChance(TYPE_CONTRACT, type);

      counts[type] = count;

      if (count < 100) allCounts100 = false;
      if (count === 0) anyCountZero = true;

      if (minChance < 1.0) {
        allChances100 = false;
        anyChanceLow = true;
      }
    }

    // 2. Update States
    // Safety Logic (Priority 1)
    if (stateSafety) {
      if (allChances100) stateSafety = false;
    } else {
      if (anyChanceLow) stateSafety = true;
    }

    // Infiltrate Logic (Priority 2)
    if (stateInfiltrate) {
      if (allCounts100) stateInfiltrate = false;
    } else {
      if (anyCountZero) stateInfiltrate = true;
    }

    // 3. Determine Global Action (if any)
    let globalAction = null;

    if (stateSafety) {
      globalAction = ACTION_FIELD_ANALYSIS;
      ns.print(`🛡️ Safety Mode: Chance < 100%. All Sleeves -> Field Analysis.`);
    } else if (stateInfiltrate) {
      globalAction = ACTION_INFILTRATE;
      ns.print(`🕵️ Infiltrate Mode: Counts low ${JSON.stringify(counts)}. All Sleeves -> Infiltrate.`);
    }

    // 4. Assign Tasks
    for (let i = 0; i < numSleeves; i++) {
      let desiredAction = "";
      let desiredContract = null;

      if (globalAction) {
        desiredAction = globalAction;
      } else {
        // Normal Mode Logic
        if (i === 0) {
          desiredAction = ACTION_CONTRACTS;
          desiredContract = "Tracking";
        } else if (i === 1) {
          desiredAction = ACTION_CONTRACTS;
          desiredContract = "Bounty Hunter";
        } else if (i === 2) {
          desiredAction = ACTION_CONTRACTS;
          desiredContract = "Retirement";
        } else {
          // Sleeve 3+
          desiredAction = ACTION_FIELD_ANALYSIS;
        }
      }

      // Check current task to avoid spamming the API
      const currentTask = ns.sleeve.getTask(i);
      let isAlreadyAssigned = false;

      if (currentTask && currentTask.type === "BLADEBURNER") {
        if (desiredAction === ACTION_CONTRACTS) {
          if (currentTask.actionName === desiredContract) isAlreadyAssigned = true;
        } else {
          if (currentTask.actionName === desiredAction) isAlreadyAssigned = true;
        }
      }

      if (!isAlreadyAssigned) {
        let success = false;
        if (desiredAction === ACTION_CONTRACTS) {
          success = ns.sleeve.setToBladeburnerAction(i, desiredAction, desiredContract);
          if (success) {
            ns.print(`✅ Sleeve ${i}: Assigned to ${desiredContract}`);
          } else {
            ns.print(`❌ Sleeve ${i}: Failed to assign ${desiredContract}`);
          }
        } else {
          success = ns.sleeve.setToBladeburnerAction(i, desiredAction);
          if (success) {
            ns.print(`👉 Sleeve ${i}: Assigned to ${desiredAction}`);
          } else {
            ns.print(`❌ Sleeve ${i}: Failed to assign ${desiredAction}`);
          }
        }
      }
    }

    await ns.sleep(2000);
  }
}
