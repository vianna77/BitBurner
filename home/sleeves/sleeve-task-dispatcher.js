// VERSION 1.2.6
/**
 * Sleeve Task Dispatcher
 * Opens a popup to select an activity and applies it to all sleeves.
 * Can also be used with arguments to bypass popups.
 *
 * Activities supported:
 * - Crime: Commits a selected crime
 * - Gym: Trains a selected stat at a selected gym
 * - University: Studies a selected course at a selected university
 * - Travel: Travels all sleeves to a selected city
 * - Shock Recovery: Recovers from shock
 * - Synchronize: Increases synchronization
 * - Bladeburner: Performs Bladeburner actions
 *
 * Usage: run sleeve-task-dispatcher.js [activityType] [param1] [param2]
 * Example: run sleeve-task-dispatcher.js "Travel" "New Tokyo"
 */

/** @param {NS} ns */
export async function main(ns) {
  const numSleeves = ns.sleeve.getNumSleeves();

  if (numSleeves === 0) {
    ns.tprint("❌ Error: No sleeves available.");
    return;
  }

  let activityType = ns.args[0];
  if (!activityType) {
    activityType = await ns.prompt("Select activity type for ALL sleeves:", {
      type: "select",
      choices: ["Crime", "Gym", "University", "Travel", "Shock Recovery", "Synchronize", "Bladeburner"]
    });
  }

  if (!activityType) {
    ns.tprint("🟡 Operation cancelled.");
    return;
  }

  let count = 0;
  let details = "";

  if (activityType === "Crime") {
    const crimes = ["Shoplift", "Rob Store", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassinate", "Heist"];
    let selectedCrime = ns.args[1];
    if (!selectedCrime) {
      selectedCrime = await ns.prompt("Select crime:", {
        type: "select",
        choices: crimes
      });
    }

    if (!selectedCrime) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.setToCommitCrime(i, selectedCrime)) {
        count++;
      }
    }
    details = selectedCrime;

  } else if (activityType === "Gym") {
    const gyms = ["Powerhouse Gym", "Snap Fitness Gym", "Iron Gym", "Millenium Fitness Gym"];
    const stats = ["Strength", "Defense", "Dexterity", "Agility"];

    let selectedGym = ns.args[1];
    if (!selectedGym) {
      selectedGym = await ns.prompt("Select gym:", {
        type: "select",
        choices: gyms
      });
    }

    if (!selectedGym) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    let selectedStat = ns.args[2];
    if (!selectedStat) {
      selectedStat = await ns.prompt("Select stat to train:", {
        type: "select",
        choices: stats
      });
    }

    if (!selectedStat) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.setToGymWorkout(i, selectedGym, selectedStat)) {
        count++;
      }
    }
    details = `${selectedStat} at ${selectedGym}`;

  } else if (activityType === "University") {
    const universities = ["Summit University", "Rothman University", "ZB Institute of Technology"];
    const courses = ["Study Computer Science", "Data Structures", "Networks", "Algorithms", "Management", "Leadership"];

    let selectedUniversity = ns.args[1];
    if (!selectedUniversity) {
      selectedUniversity = await ns.prompt("Select university:", {
        type: "select",
        choices: universities
      });
    }

    if (!selectedUniversity) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    let selectedCourse = ns.args[2];
    if (!selectedCourse) {
      selectedCourse = await ns.prompt("Select course:", {
        type: "select",
        choices: courses
      });
    }

    if (!selectedCourse) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.setToUniversityCourse(i, selectedUniversity, selectedCourse)) {
        count++;
      }
    }
    details = `${selectedCourse} at ${selectedUniversity}`;

  } else if (activityType === "Travel") {
    const cities = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];

    let selectedCity = ns.args[1];
    if (!selectedCity) {
      selectedCity = await ns.prompt("Select destination city:", {
        type: "select",
        choices: cities
      });
    }

    if (!selectedCity) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.travel(i, selectedCity)) {
        count++;
      }
    }
    details = `Travel to ${selectedCity}`;

  } else if (activityType === "Shock Recovery") {
    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.setToShockRecovery(i)) {
        count++;
      }
    }
    details = "Shock Recovery";

  } else if (activityType === "Synchronize") {
    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.setToSynchronize(i)) {
        count++;
      }
    }
    details = "Synchronization";
  } else if (activityType === "Bladeburner") {
    const actionTypes = ["General", "Contracts", "Infiltrate Synthoids", "Support main sleeve"];
    let selectedType = ns.args[1];
    if (!selectedType) {
      selectedType = await ns.prompt("Select Bladeburner action type:", {
        type: "select",
        choices: actionTypes
      });
    }

    if (!selectedType) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    let actionName = "";
    let contractName = "";

    if (selectedType === "General") {
      const actions = ["Training", "Field Analysis", "Recruitment", "Diplomacy", "Hyperbolic Regeneration Chamber"];
      actionName = ns.args[2];
      if (!actionName) {
        actionName = await ns.prompt("Select General Action:", {
          type: "select",
          choices: actions
        });
      }
      if (!actionName) {
        ns.tprint("🟡 Operation cancelled.");
        return;
      }
    } else if (selectedType === "Contracts") {
      const contracts = ["Tracking", "Bounty Hunter", "Retirement"];
      contractName = ns.args[2];
      if (!contractName) {
        contractName = await ns.prompt("Select Contract:", {
          type: "select",
          choices: contracts
        });
      }
      if (!contractName) {
        ns.tprint("🟡 Operation cancelled.");
        return;
      }
      actionName = "Take on contracts";
    } else {
      // For "Infiltrate Synthoids" and "Support main sleeve"
      actionName = selectedType;
    }

    for (let i = 0; i < numSleeves; i++) {
      let success = false;
      if (contractName) {
        success = ns.sleeve.setToBladeburnerAction(i, actionName, contractName);
      } else {
        success = ns.sleeve.setToBladeburnerAction(i, actionName);
      }
      if (success) count++;
    }
    details = `Bladeburner: ${actionName}` + (contractName ? ` - ${contractName}` : "");
  }

  ns.tprint(`✅ Success! ${count}/${numSleeves} sleeves assigned to: ${details}`);
  ns.toast(`🤖 ${count} sleeves → ${details}`, "success");
}
