// VERSION: 2.4.0
// Sleeve Bladeburner Controller - Strict Rules Implementation

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  // Sleeve and Contract Configuration (Rules 1, 2, 3)
  const CONTRACT_RULES = [
    { id: 0, name: "Tracking" },
    { id: 1, name: "Bounty Hunter" },
    { id: 2, name: "Retirement" }
  ];

  // Initial state
  let currentState = "START"; // Possible states: START, NORMAL, SAFETY
  const sleeveInfiltrating = [false, false, false];

  ns.print("🤖 Sleeve Bladeburner Controller v2.4.0 Started");

  while (true) {
    ns.print(`\n--- LOOP START --- Current State: ${currentState} ---`);
    const bb = ns.bladeburner;

    // ============================================================
    // 1. DATA ANALYSIS (OBSERVATION)
    // ============================================================
    let minChance = Infinity;
    let anyContractEmpty = false;
    let allContractsFull = true;
    let minContractCount = Infinity;
    ns.print(`[DATA] Analyzing contracts...`);
    for (const rule of CONTRACT_RULES) {
      const [low, high] = bb.getActionEstimatedSuccessChance("Contract", rule.name);
      ns.print(`[DATA] Contract '${rule.name}' success chance: [${(low * 100).toFixed(2)}% - ${(high * 100).toFixed(2)}%]`);
      if (low < minChance) minChance = low;

      const count = bb.getActionCountRemaining("Contract", rule.name);
      if (count < 1) anyContractEmpty = true;
      if (count < 100) allContractsFull = false;
      if (count < minContractCount) minContractCount = count;
    }
    ns.print(`[DATA] Overall minChance: ${(minChance * 100).toFixed(2)}% | anyContractEmpty: ${anyContractEmpty} | allContractsFull: ${allContractsFull}`);

    // ============================================================
    // 2. TRANSITION LOGIC (TRANSITION)
    // ============================================================
    let nextState = currentState;
    if (currentState === "START") nextState = "NORMAL";

    if (minChance < 1.0) {
      if (currentState !== "SAFETY") nextState = "SAFETY";
    }
    else if (currentState === "SAFETY") {
      if (minChance >= 1.0) nextState = "NORMAL";
    }
    if (nextState !== currentState) {
      ns.print(`[TRANSITION] State will change: ${currentState} -> ${nextState}`);
    } else {
      ns.print(`[TRANSITION] State remains: ${currentState}`);
    }

    // ============================================================
    // 3. STATE CHANGE EXECUTION (ACTION ON CHANGE)
    // ============================================================
    if (nextState !== currentState) {
      ns.print(`[STATE CHANGE] Executing change from ${currentState} -> ${nextState}`);
      currentState = nextState;
      // Short pause to allow state to settle before next loop
      await ns.sleep(100);
    }

    // ============================================================
    // 4. STATE MAINTENANCE (ACTION)
    // ============================================================
    ns.print(`[MAINTENANCE] Performing actions for state: ${currentState}`);
    const numSleeves = ns.sleeve.getNumSleeves();

    for (let i = 0; i < numSleeves; i++) {
      let success = false; // Variable to hold action success
      ns.print(`-- Sleeve ${i} --`);
      const sleeveInfo = ns.sleeve.getSleeve(i);
      if (sleeveInfo.shock > 0) {
        const currentTask = ns.sleeve.getTask(i);
        if (currentTask?.type !== "RECOVERY") {
          ns.print(`[Sleeve ${i}] Shock > 0 (${sleeveInfo.shock}). Setting to Shock Recovery.`);
          success = ns.sleeve.setToShockRecovery(i);
          ns.print(`[Sleeve ${i}] -> setToShockRecovery() returned: ${success}`);
        }
        continue;
      }

      const task = ns.sleeve.getTask(i);
      const isBladeburner = task && task.type === "BLADEBURNER";
      ns.print(`[Sleeve ${i}] Current Task: ${task ? `${task.type} - ${task.actionName || ''}` : 'IDLE'}`);

      switch (currentState) {
        case "NORMAL":
          if (minChance >= 1.0) {
            ns.print(`[Sleeve ${i}] State is NORMAL and chance is SAFE. Evaluating contract rules.`);
            if (i === 0) {
              const count = bb.getActionCountRemaining("Contract", "Tracking");
              if (count < 1) sleeveInfiltrating[0] = true;
              if (count >= 100) sleeveInfiltrating[0] = false;
              if (sleeveInfiltrating[0]) {
                if (task?.type !== "INFILTRATE") {
                  ns.print(`[Sleeve ${i}] Contract empty, infiltrating (${count}/100)`);
                  success = ns.sleeve.setToBladeburnerAction(i, "Infiltrate Synthoids");
                  ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Infiltrate Synthoids') returned: ${success}`);
                }
              } else {
                if (!isBladeburner || task.actionName !== "Tracking") {
                  ns.print(`[Sleeve ${i}] Assigning contract: Tracking`);
                  success = ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Tracking");
                  ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Tracking') returned: ${success}`);
                }
              }
            } else if (i === 1) {
              const count = bb.getActionCountRemaining("Contract", "Bounty Hunter");
              if (count < 1) sleeveInfiltrating[1] = true;
              if (count >= 100) sleeveInfiltrating[1] = false;
              if (sleeveInfiltrating[1]) {
                if (task?.type !== "INFILTRATE") {
                  ns.print(`[Sleeve ${i}] Contract empty, infiltrating (${count}/100)`);
                  success = ns.sleeve.setToBladeburnerAction(i, "Infiltrate Synthoids");
                  ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Infiltrate Synthoids') returned: ${success}`);
                }
              } else {
                if (!isBladeburner || task.actionName !== "Bounty Hunter") {
                  ns.print(`[Sleeve ${i}] Assigning contract: Bounty Hunter`);
                  success = ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Bounty Hunter");
                  ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Bounty Hunter') returned: ${success}`);
                }
              }
            } else if (i === 2) {
              const count = bb.getActionCountRemaining("Contract", "Retirement");
              if (count < 1) sleeveInfiltrating[2] = true;
              if (count >= 100) sleeveInfiltrating[2] = false;
              if (sleeveInfiltrating[2]) {
                if (task?.type !== "INFILTRATE") {
                  ns.print(`[Sleeve ${i}] Contract empty, infiltrating (${count}/100)`);
                  success = ns.sleeve.setToBladeburnerAction(i, "Infiltrate Synthoids");
                  ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Infiltrate Synthoids') returned: ${success}`);
                }
              } else {
                if (!isBladeburner || task.actionName !== "Retirement") {
                  ns.print(`[Sleeve ${i}] Assigning contract: Retirement`);
                  success = ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Retirement");
                  ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Retirement') returned: ${success}`);
                }
              }
            } else {
              if (!isBladeburner || task.actionName !== "Field Analysis") {
                ns.print(`[Sleeve ${i}] Assigning: Field Analysis`);
                success = ns.sleeve.setToBladeburnerAction(i, "Field Analysis");
                ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Field Analysis') returned: ${success}`);
              }
            }
          } else {
            ns.print(`[Sleeve ${i}] State is NORMAL but chance is LOW (${(minChance * 100).toFixed(1)}%). Assigning Field Analysis as a precaution.`);
            if (!isBladeburner || task.actionName !== "Field Analysis") {
              success = ns.sleeve.setToBladeburnerAction(i, "Field Analysis");
              ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Field Analysis') returned: ${success}`);
            }
          }
          break;

        case "SAFETY":
          ns.print(`[Sleeve ${i}] State is SAFETY. Assigning Field Analysis.`);
          if (!isBladeburner || task.actionName !== "Field Analysis") {
            success = ns.sleeve.setToBladeburnerAction(i, "Field Analysis");
            ns.print(`[Sleeve ${i}] -> setToBladeburnerAction('Field Analysis') returned: ${success}`);
          }
          break;
      }
    }

    // Logging for non-normal states
    if (currentState === "SAFETY") {
      ns.print(`🛡️ SAFETY: Recovering chances... (Min: ${(minChance * 100).toFixed(1)}%)`);
    }

    ns.print(`--- LOOP END ---`);
    await ns.sleep(2000);
  }
}
