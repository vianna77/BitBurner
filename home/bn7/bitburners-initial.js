// VERSION: 1.9.6
const CITIES = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/**
 * Bladeburner Initial Automation
 * Handles basic Bladeburner loop using a State Machine approach.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "bn7/bitburners-initial.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: bn7/bitburners-initial.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }

  const bb = ns.bladeburner;
  ns.disableLog("ALL");

  let state = "WORK";

  while (true) {
    handleSkills(ns);
    const currentCity = bb.getCity();

    if (state === "WORK") {
      if (shouldRecover(ns)) {
        state = "RECOVER";
      }
    } else if (state === "RECOVER") {
      const [currentStamina, maxStamina] = bb.getStamina();
      const player = ns.getPlayer();
      if (currentStamina >= maxStamina && player.hp.current >= player.hp.max) {
        state = "WORK";
      }
    }

    switch (state) {
      case "RECOVER": {
        const player = ns.getPlayer();
        const [currentStamina, maxStamina] = bb.getStamina();
        const isLowHealth = player.hp.current <= player.hp.max * 0.5;

        const currentAction = bb.getCurrentAction();
        if (currentAction.type !== "General" || currentAction.name !== "Hyperbolic Regeneration Chamber") {
          if (isLowHealth) {
            ns.print(`🚑 Low Health: ${player.hp.current.toFixed(0)}/${player.hp.max}. Healing...`);
          } else {
            ns.print(`🔋 Low Stamina: ${currentStamina.toFixed(1)}/${maxStamina}. Resting...`);
          }
          bb.startAction("General", "Hyperbolic Regeneration Chamber");
        }
        await ns.sleep(1000);
        break;
      }
      case "WORK": {
        let selectedAction = null;
        let actionType = "";

        // Combined priority list: Operations are better than Contracts
        const actions = [
          { type: "Operation", name: "Assassination" },
          { type: "Operation", name: "Undercover Operation" },
          { type: "Operation", name: "Investigation" },
          { type: "Contract", name: "Retirement" },
          { type: "Contract", name: "Bounty Hunter" },
          { type: "Contract", name: "Tracking" }
        ];

        for (const action of actions) {
          if (bb.getActionCountRemaining(action.type, action.name) > 0) {
            const [min] = bb.getActionEstimatedSuccessChance(action.type, action.name);
            // Only select if it's 100% guaranteed to avoid failure penalties
            if (min >= 1.0) {
              selectedAction = action.name;
              actionType = action.type;
              break;
            }
          }
        }

        if (selectedAction) {
          if (actionType === "Operation") {
            const operations = bb.getOperationNames();
            for (const op of operations) {
              if (op !== selectedAction) {
                if (bb.getTeamSize("Operation", op) > 0) {
                  bb.setTeamSize("Operation", op, 0);
                }
              }
            }
            const available = bb.getTeamSize();
            const assigned = bb.getTeamSize("Operation", selectedAction);
            bb.setTeamSize("Operation", selectedAction, available + assigned);
          }

          ns.print(`🎯 ${selectedAction} (100%) in ${currentCity}.`);
          bb.startAction(actionType, selectedAction);
          const time = bb.getActionTime(actionType, selectedAction);
          await ns.sleep(time + 100);
        } else {
          // If no 100% action exists here, check if it's due to lack of intel
          const [minTrack, maxTrack] = bb.getActionEstimatedSuccessChance("Contract", "Tracking");
          if (maxTrack >= 1.0 && minTrack < 1.0) {
            ns.print(`🔍 Uncertain data in ${currentCity}. Analyzing field...`);
            bb.startAction("General", "Field Analysis");
            await ns.sleep(bb.getActionTime("General", "Field Analysis") + 100);
          } else {
            // Move to next city to find 100% actions
            const nextCity = CITIES[(CITIES.indexOf(currentCity) + 1) % CITIES.length];
            ns.print(`🟡 No safe work in ${currentCity}. Moving to ${nextCity}...`);
            bb.switchCity(nextCity);
            await ns.sleep(200);
          }
        }
        break;
      }
    }
  }
}

/**
 * Checks if recovery is needed based on Stamina or Health.
 * @param {NS} ns
 */
function shouldRecover(ns) {
  const bb = ns.bladeburner;
  const STAMINA_THRESHOLD = 0.5;
  const [currentStamina, maxStamina] = bb.getStamina();
  const player = ns.getPlayer();
  const isLowHealth = player.hp.current <= player.hp.max * 0.5;
  return currentStamina < maxStamina * STAMINA_THRESHOLD || isLowHealth;
}

/**
 * Handles automatic skill upgrades based on priority.
 * @param {NS} ns
 */
function handleSkills(ns) {
  const bb = ns.bladeburner;
  const priorities = [
    { name: "Blade's Intuition", count: 25 },
    { name: "Cloak", count: 10 },
    { name: "Short-Circuit", count: 10 },
    { name: "Overclock", count: 10 }
  ];

  for (const skill of priorities) {
    const currentLevel = bb.getSkillLevel(skill.name);
    if (currentLevel < skill.count) {
      const cost = bb.getSkillUpgradeCost(skill.name, 1);
      if (bb.getSkillPoints() >= cost) {
        bb.upgradeSkill(skill.name, 1);
        ns.print(`🆙 Upgraded ${skill.name} to level ${currentLevel + 1}`);
      }
      return;
    }
  }
}
