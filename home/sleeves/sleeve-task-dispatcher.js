// VERSION 1.2.0
/**
 * Sleeve Task Dispatcher
 * Opens a popup to select an activity and applies it to all sleeves.
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
 * Usage: run sleeve-task-dispatcher.js
 */

/** @param {NS} ns */
export async function main(ns) {
  const numSleeves = ns.sleeve.getNumSleeves();

  if (numSleeves === 0) {
    ns.tprint("❌ Error: No sleeves available.");
    return;
  }

  const activityType = await ns.prompt("Select activity type for ALL sleeves:", {
    type: "select",
    choices: ["Crime", "Gym", "University", "Travel", "Shock Recovery", "Synchronize", "Bladeburner"]
  });

  if (!activityType) {
    ns.tprint("🟡 Operation cancelled.");
    return;
  }

  let count = 0;
  let details = "";

  if (activityType === "Crime") {
    const crimes = ["Shoplift", "Rob Store", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassinate", "Heist"];
    const selectedCrime = await ns.prompt("Select crime:", {
      type: "select",
      choices: crimes
    });

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

    const selectedGym = await ns.prompt("Select gym:", {
      type: "select",
      choices: gyms
    });

    if (!selectedGym) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    const selectedStat = await ns.prompt("Select stat to train:", {
      type: "select",
      choices: stats
    });

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

    const selectedUniversity = await ns.prompt("Select university:", {
      type: "select",
      choices: universities
    });

    if (!selectedUniversity) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    const selectedCourse = await ns.prompt("Select course:", {
      type: "select",
      choices: courses
    });

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

    const selectedCity = await ns.prompt("Select destination city:", {
      type: "select",
      choices: cities
    });

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
    const actionTypes = ["General", "Contracts", "Operations"];
    const selectedType = await ns.prompt("Select Bladeburner action type:", {
      type: "select",
      choices: actionTypes
    });

    if (!selectedType) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    let actions = [];
    if (selectedType === "General") {
      actions = ["Training", "Field Analysis", "Recruitment", "Diplomacy", "Hyperbolic Regeneration Chamber"];
    } else if (selectedType === "Contracts") {
      actions = ["Tracking", "Bounty Hunter", "Retirement"];
    } else if (selectedType === "Operations") {
      actions = ["Investigation", "Undercover Operation", "Sting Operation", "Raid", "Stealth Retirement Operation", "Assassination"];
    }

    const selectedAction = await ns.prompt(`Select ${selectedType} action:`, {
      type: "select",
      choices: actions
    });

    if (!selectedAction) {
      ns.tprint("🟡 Operation cancelled.");
      return;
    }

    for (let i = 0; i < numSleeves; i++) {
      if (ns.sleeve.setToBladeburnerAction(i, selectedAction)) {
        count++;
      }
    }
    details = `Bladeburner: ${selectedAction}`;
  }

  ns.tprint(`✅ Success! ${count}/${numSleeves} sleeves assigned to: ${details}`);
  ns.toast(`🤖 ${count} sleeves → ${details}`, "success");
}
