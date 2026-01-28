// VERSION: 1.1.0
/**
 * Sleeve Bladeburner Manager
 *
 * DESCRIPTION:
 * - Assigns the first 3 sleeves (0-2) to unique Bladeburner contracts.
 * - Assigns all other sleeves (3+) to Field Analysis.
 * - Safety Check: If a contract's success chance drops below 100%, the sleeve switches to Field Analysis.
 * - Availability Check: If contracts run out, switch to Infiltrate Synthoids. Switch back only when > 50 contracts available.
 *
 * USAGE:
 * run /sleeves/sleeve-bladeburner.js
 */

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  // Configuration
  const CONTRACT_SLEEVES_COUNT = 3;
  const CONTRACT_TYPES = ["Tracking", "Bounty Hunter", "Retirement"];

  // Action Constants (based on sleeve-task-dispatcher.js logic)
  const ACTION_CONTRACTS = "Take on contracts";
  const ACTION_FIELD_ANALYSIS = "Field Analysis";
  const ACTION_INFILTRATE = "Infiltrate Synthoids";
  const TYPE_CONTRACT = "Contract";

  ns.print("Starting Sleeve Bladeburner Manager...");

  while (true) {
    const numSleeves = ns.sleeve.getNumSleeves();

    for (let i = 0; i < numSleeves; i++) {
      const currentTask = ns.sleeve.getTask(i);
      let desiredAction = ACTION_FIELD_ANALYSIS;
      let desiredContract = null;

      // Logic for the first 3 sleeves (indices 0, 1, 2)
      if (i < CONTRACT_SLEEVES_COUNT) {
        const contractType = CONTRACT_TYPES[i];

        // Check success chance using Bladeburner API
        // Returns [min, max] estimated success chance. We check min >= 1.0 (100%)
        // Note: This uses the player's success chance as a proxy for environment safety (City Chaos)
        const [successChance] = ns.bladeburner.getActionEstimatedSuccessChance(TYPE_CONTRACT, contractType);
        const contractCount = ns.bladeburner.getActionCountRemaining(TYPE_CONTRACT, contractType);

        // If chance is 100%, assign the contract
        if (successChance >= 1.0) {
          const isInfiltrating = currentTask && currentTask.type === "BLADEBURNER" && currentTask.actionName === ACTION_INFILTRATE;

          if (isInfiltrating) {
            // Hysteresis: Only switch back to contracts if > 50 available
            if (contractCount > 50) {
              desiredAction = ACTION_CONTRACTS;
              desiredContract = contractType;
            } else {
              desiredAction = ACTION_INFILTRATE;
            }
          } else {
            if (contractCount > 0) {
              desiredAction = ACTION_CONTRACTS;
              desiredContract = contractType;
            } else {
              desiredAction = ACTION_INFILTRATE;
            }
          }
        } else {
          // If chance < 100%, fallback to Field Analysis to reduce chaos/gain intel
          desiredAction = ACTION_FIELD_ANALYSIS;
        }
      }

      // Check current task to avoid spamming the API
      let isAlreadyAssigned = false;

      if (currentTask && currentTask.type === "BLADEBURNER") {
        if (desiredAction === ACTION_FIELD_ANALYSIS && currentTask.actionName === ACTION_FIELD_ANALYSIS) {
          isAlreadyAssigned = true;
        } else if (desiredAction === ACTION_CONTRACTS && currentTask.actionName === desiredContract) {
          isAlreadyAssigned = true;
        } else if (desiredAction === ACTION_INFILTRATE && currentTask.actionName === ACTION_INFILTRATE) {
          isAlreadyAssigned = true;
        }
      }

      // Apply task if needed
      if (!isAlreadyAssigned) {
        if (desiredAction === ACTION_CONTRACTS) {
          const success = ns.sleeve.setToBladeburnerAction(i, desiredAction, desiredContract);
          if (success) {
            ns.print(`✅ Sleeve ${i}: Assigned to ${desiredContract}`);
          }
        } else {
          const success = ns.sleeve.setToBladeburnerAction(i, desiredAction);
          if (success) {
            ns.print(`👉 Sleeve ${i}: Assigned to ${desiredAction}`);
          }
        }
      }
    }

    await ns.sleep(5000); // Check every 5 seconds
  }
}
