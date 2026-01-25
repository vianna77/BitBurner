// VERSION: 1.9.3
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
        let bestContract = null;
        let pChance = 0;

        // 1. Retirement (Priority: Max Chance >= 100%)
        if (bb.getActionCountRemaining("Contract", "Retirement") > 0) {
          const [, max] = bb.getActionEstimatedSuccessChance("Contract", "Retirement");
          if (max >= 1.0) {
            bestContract = "Retirement";
            pChance = max;
          }
        }

        // 2. Bounty Hunter (Priority: Max Chance >= 100%)
        if (!bestContract && bb.getActionCountRemaining("Contract", "Bounty Hunter") > 0) {
          const [, max] = bb.getActionEstimatedSuccessChance("Contract", "Bounty Hunter");
          if (max >= 1.0) {
            bestContract = "Bounty Hunter";
            pChance = max;
          }
        }

        // 3. Tracking (Fallback)
        if (!bestContract && bb.getActionCountRemaining("Contract", "Tracking") > 0) {
          bestContract = "Tracking";
          const [, max] = bb.getActionEstimatedSuccessChance("Contract", "Tracking");
          pChance = max;
        }

        if (bestContract) {
          ns.print(`🎯 ${bestContract} (Max: ${(pChance * 100).toFixed(0)}%) in ${currentCity}.`);
          bb.startAction("Contract", bestContract);
          const time = bb.getActionTime("Contract", bestContract);
          await ns.sleep(time);
        } else {
          const nextCity = CITIES[(CITIES.indexOf(currentCity) + 1) % CITIES.length];
          ns.print(`🟡 No contracts in ${currentCity}. Moving to ${nextCity}...`);
          bb.switchCity(nextCity);
          await ns.sleep(200);
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
