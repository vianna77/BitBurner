/**
 * VERSION: 1.9.24
 * SLEEVE ORCHESTRATOR
 *
 * DESCRIPTION:
 * Orchestrates sleeve activities using externalized scripts in /sleeves/.
 * Uses player's actual money for gym budget instead of hacknet production.
 *
 * PORT USAGE:
 * - Port 10: Receives JSON from getNumSleeves.js (number) and getSleeveData.js ({stats, task})
 *
 * EXTERNAL FILES:
 * - /sleeves/getNumSleeves.js: Returns total number of sleeves available
 * - /sleeves/getSleeveData.js: Returns sleeve stats and current task for specific sleeve index
 * - /sleeves/setToRecovery.js: Sets sleeve to recovery mode to reduce shock
 * - /sleeves/setToSync.js: Sets sleeve to synchronization mode
 * - /sleeves/setToCrime.js: Assigns crime activity to sleeve
 * - /sleeves/setToGym.js: Assigns gym training to sleeve for specific stat
 */

const SCRIPT_GET_NUM_SLEEVES = "/sleeves/getNumSleeves.js";
const SCRIPT_GET_SLEEVE_DATA = "/sleeves/getSleeveData.js";
const SCRIPT_SET_RECOVERY = "/sleeves/setToRecovery.js";
const SCRIPT_SET_SYNC = "/sleeves/setToSync.js";
const SCRIPT_SET_CRIME = "/sleeves/setToCrime.js";
const SCRIPT_SET_GYM = "/sleeves/setToGym.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "sleeves/sleeves-batcher-earlygame.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: sleeves-batcher-earlygame.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }

  ns.clearPort(10);

  const callNumSleeves = async (port, script) => {
    const pid = ns.run(script, 1);
    if (pid === 0) {
      return null;
    }
    let response = ns.readPort(port);
    let attempts = 0;
    while (response === "NULL PORT DATA" || (typeof response === "string" && !response.startsWith("{") && isNaN(response))) {
      await ns.sleep(50);
      response = ns.readPort(port);
      attempts++;
      if (attempts > 100) {
        return null;
      }
    }
    try {
      return JSON.parse(response);
    } catch (e) {
      return null;
    }
  };

  const callSleeveData = async (port, script, index) => {
    const pid = ns.run(script, 1, index);
    if (pid === 0) {
      return null;
    }
    let response = ns.readPort(port);
    let attempts = 0;
    while (response === "NULL PORT DATA" || (typeof response === "string" && !response.startsWith("{"))) {
      await ns.sleep(50);
      response = ns.readPort(port);
      attempts++;
      if (attempts > 100) {
        return null;
      }
    }
    try {
      return JSON.parse(response);
    } catch (e) {
      return null;
    }
  };

  const callHacknet = async (port, script) => {
    const pid = ns.run(script, 1);
    if (pid === 0) {
      return null;
    }
    let response = ns.readPort(port);
    let attempts = 0;
    while (response === "NULL PORT DATA") {
      await ns.sleep(50);
      response = ns.readPort(port);
      attempts++;
      if (attempts > 100) {
        return null;
      }
    }
    try {
      return JSON.parse(response);
    } catch (e) {
      return null;
    }
  };

  const exec = (script, ...args) => {
    const pid = ns.run(script, 1, ...args);
    if (pid === 0) {
      ns.print(`❌ Exec failed for ${script}`);
    }
  };

  ns.tprint("Sleeve Orchestrator v1.9.24 Online. 🤖");

  while (true) {
    const numSleeves = await callNumSleeves(10, SCRIPT_GET_NUM_SLEEVES);
    const playerMoney = ns.getServerMoneyAvailable("home");

    if (numSleeves === null) {
      ns.print("❌ numSleeves is NULL. Check Port 10 and getNumSleeves.js");
      await ns.sleep(10000);
      continue;
    }

    let trainingSleevesCount = 0;

    for (let i = 0; i < numSleeves; i++) {
      const data = await callSleeveData(10, SCRIPT_GET_SLEEVE_DATA, i);

      if (!data || !data.stats) {
        ns.print(`❌ Failed to retrieve data for Sleeve ${i}`);
        continue;
      }

      const { stats, task } = data;
      const str = Math.round(stats.strength);
      const def = Math.round(stats.defense);
      const dex = Math.round(stats.dexterity);
      const agi = Math.round(stats.agility);

      let currentTaskName = "IDLE";
      if (task) {
        if (task.type === "CLASS") {
          if (task.classType === "str") {
            currentTaskName = "strength";
          } else if (task.classType === "def") {
            currentTaskName = "defense";
          } else if (task.classType === "dex") {
            currentTaskName = "dexterity";
          } else if (task.classType === "agi") {
            currentTaskName = "agility";
          } else {
            currentTaskName = "CLASS";
          }
        } else {
          if (task.gymStatType) {
            currentTaskName = task.gymStatType;
          } else if (task.crimeType) {
            currentTaskName = task.crimeType;
          } else {
            currentTaskName = task.type;
          }
        }
      }

      ns.print(`[Sleeve ${i}] ⚡${Math.round(stats.shock)}% 💪${str}/${def}/${dex}/${agi} 🎭${currentTaskName}`);

      let targetStat = null;
      if (str < 50) {
        targetStat = "strength";
      } else if (def < 50) {
        targetStat = "defense";
      } else if (dex < 50) {
        targetStat = "dexterity";
      } else if (agi < 50) {
        targetStat = "agility";
      }

      const neededBudget = (trainingSleevesCount + 1) * 2500;

      if (stats.shock > 0) {
        if (!task || task.type !== "RECOVERY") {
          ns.print(`Sleeve ${i}: Transitioning to Recovery.`);
          exec(SCRIPT_SET_RECOVERY, i);
        }
      } else if (stats.sync < 100) {
        if (!task || task.type !== "SYNCHRONIZE") {
          ns.print(`🔄 Sleeve ${i}: Transitioning to Sync.`);
          exec(SCRIPT_SET_SYNC, i);
        }
      } else if (targetStat && playerMoney >= neededBudget) {
        if (currentTaskName !== targetStat) {
          ns.print(`🏋️ Sleeve ${i}: Training ${targetStat} at Powerhouse Gym`);
          exec(SCRIPT_SET_GYM, i, "Powerhouse Gym", targetStat);
        }
        trainingSleevesCount++;
      } else if (targetStat && playerMoney < neededBudget) {
        ns.print(`🟡 Sleeve ${i}: Insufficient budget for Gym ($${ns.formatNumber(neededBudget)} needed)`);
      } else {
        const combatAvg = (str + def + dex + agi) / 4;
        let targetCrime;
        if (combatAvg > 100) {
          targetCrime = "Homicide";
        } else if (combatAvg > 30) {
          targetCrime = "Mug";
        } else {
          targetCrime = "Shoplift";
        }

        if (!task || task.type !== "CRIME" || task.crimeType !== targetCrime) {
          ns.print(`🔪 Sleeve ${i}: Upgrading crime ${task?.crimeType || 'none'} -> ${targetCrime}`);
          exec(SCRIPT_SET_CRIME, i, targetCrime);
        }
      }
    }
    await ns.sleep(10000);
  }
}
