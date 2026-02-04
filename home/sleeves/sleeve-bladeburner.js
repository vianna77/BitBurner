// VERSION: 2.3.0
// Sleeve Bladeburner Controller - Strict Rules Implementation

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const DISPATCHER_SCRIPT = "/sleeves/sleeve-task-dispatcher.js";

  // Sleeve and Contract Configuration (Rules 1, 2, 3)
  const CONTRACT_RULES = [
    { id: 0, name: "Tracking" },
    { id: 1, name: "Bounty Hunter" },
    { id: 2, name: "Retirement" }
  ];

  // Initial state
  let currentState = "START"; // Possible states: START, NORMAL, SAFETY, INFILTRATE

  ns.print("🤖 Sleeve Bladeburner Controller v2.3.0 Started");

  while (true) {
    const bb = ns.bladeburner;

    // ============================================================
    // 1. DATA ANALYSIS (OBSERVATION)
    // ============================================================
    let minChance = 1.0;
    let anyContractEmpty = false;
    let allContractsFull = true; // >= 100
    let minContractCount = Infinity;

    for (const rule of CONTRACT_RULES) {
      // Check success chance (Rule 6)
      const [low, high] = bb.getActionEstimatedSuccessChance("Contract", rule.name);
      if (low < minChance) minChance = low;

      // Check remaining count (Rule 5)
      const count = bb.getActionCountRemaining("Contract", rule.name);
      if (count < 1) anyContractEmpty = true;
      if (count < 100) allContractsFull = false;
      if (count < minContractCount) minContractCount = count;
    }

    // ============================================================
    // 2. TRANSITION LOGIC (TRANSITION)
    // ============================================================
    let nextState = currentState;

    if (currentState === "START") {
      nextState = "NORMAL";
    }

    // RULE 6: SAFETY (Top Priority)
    // If chance drops below 100%, activate SAFETY immediately.
    if (minChance < 1.0) {
      if (currentState !== "SAFETY") {
        nextState = "SAFETY";
      }
    }
    // If already in SAFETY, only exit when ALL return to 100%.
    else if (currentState === "SAFETY") {
      if (minChance >= 1.0) {
        nextState = "NORMAL";
      }
    }
    // RULE 5: RESUPPLY (Secondary Priority)
    // Only consider if not in SAFETY (or needing to go there).
    else {
      // If any contract runs out, go to INFILTRATE
      if (currentState !== "INFILTRATE" && anyContractEmpty) {
        nextState = "INFILTRATE";
      }
      // If already in INFILTRATE, only exit when ALL have >= 100
      else if (currentState === "INFILTRATE") {
        if (allContractsFull) {
          nextState = "NORMAL";
        }
      }
    }

    // ============================================================
    // 3. STATE CHANGE EXECUTION (ACTION ON CHANGE)
    // ============================================================
    if (nextState !== currentState) {
      ns.print(`🔄 State changed: ${currentState} -> ${nextState}`);

      if (nextState === "SAFETY") {
        ns.print(`⚠️ Low chance detected (${(minChance * 100).toFixed(1)}%). Executing Field Analysis.`);
        // Rule 6: Execute dispatcher for Field Analysis
        ns.run(DISPATCHER_SCRIPT, 1, "Bladeburner", "General", "Field Analysis");
      }
      else if (nextState === "INFILTRATE") {
        ns.print(`📉 Contracts depleted. Executing Infiltrate Synthoids.`);
        // Rule 5: Execute dispatcher for Infiltrate Synthoids
        ns.run(DISPATCHER_SCRIPT, 1, "Bladeburner", "Infiltrate Synthoids");
      }
      else if (nextState === "NORMAL") {
        ns.print(`✅ Normal operation resumed.`);
      }

      currentState = nextState;
      // Short pause to ensure dispatcher starts and applies tasks
      await ns.sleep(500);
    }

    // ============================================================
    // 4. STATE MAINTENANCE
    // ============================================================
    if (currentState === "NORMAL") {
      const numSleeves = ns.sleeve.getNumSleeves();

      for (let i = 0; i < numSleeves; i++) {
        const task = ns.sleeve.getTask(i);
        const isBladeburner = task && task.type === "BLADEBURNER";

        // Only execute contracts if chance is 100%
        if (minChance >= 1.0) {
          // Rule 1: Sleeve 0 -> Tracking
          if (i === 0) {
            if (!isBladeburner || task.actionName !== "Tracking") {
              ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Tracking");
            }
          }
          // Rule 2: Sleeve 1 -> Bounty Hunter
          else if (i === 1) {
            if (!isBladeburner || task.actionName !== "Bounty Hunter") {
              ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Bounty Hunter");
            }
          }
          // Rule 3: Sleeve 2 -> Retirement
          else if (i === 2) {
            if (!isBladeburner || task.actionName !== "Retirement") {
              ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Retirement");
            }
          }
          // Rule 4: Sleeve 3 and 4 (and others) -> Field Analysis
          else {
            if (!isBladeburner || task.actionName !== "Field Analysis") {
              ns.sleeve.setToBladeburnerAction(i, "Field Analysis");
            }
          }
        } else {
          // If chance < 100%, all sleeves do Field Analysis
          if (!isBladeburner || task.actionName !== "Field Analysis") {
            ns.sleeve.setToBladeburnerAction(i, "Field Analysis");
          }
        }
      }
    } else {
      // In SAFETY or INFILTRATE, only monitor and log periodically
      // The dispatcher has already defined tasks on state transition.
      if (currentState === "SAFETY") {
        ns.print(`🛡️ SAFETY: Recovering chances... (Min: ${(minChance * 100).toFixed(1)}%)`);
      } else if (currentState === "INFILTRATE") {
        ns.print(`🕵️ INFILTRATE: Farming contracts... (Min: ${minContractCount}/100)`);
      }
    }

    await ns.sleep(2000);
  }
}
