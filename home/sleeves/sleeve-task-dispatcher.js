// VERSION 1.0.0
/**
 * Sleeve Task Dispatcher
 * Opens a popup to select an activity and applies it to all sleeves.
 * 
 * Activities supported:
 * - Crime: Commits a selected crime
 * - Gym: Trains a selected stat at a selected gym
 * - Shock Recovery: Recovers from shock
 * - Synchronize: Increases synchronization
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
    choices: ["Crime", "Gym", "Shock Recovery", "Synchronize"]
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
  }

  ns.tprint(`✅ Success! ${count}/${numSleeves} sleeves assigned to: ${details}`);
  ns.toast(`🤖 ${count} sleeves → ${details}`, "success");
}
