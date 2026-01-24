// VERSION: 1.4.3
const CITIES = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/**
 * Bladeburner Initial Automation
 * Handles basic Bladeburner loop using a State Machine approach.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const bb = ns.bladeburner;
  ns.disableLog("ALL");

  let state = "WORK";

  while (true) {
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

        if (isLowHealth) {
          ns.print(`🚑 Low Health: ${player.hp.current.toFixed(0)}/${player.hp.max}. Healing...`);
        } else {
          ns.print(`🔋 Low Stamina: ${currentStamina.toFixed(1)}/${maxStamina}. Resting...`);
        }
        const currentAction = bb.getCurrentAction();
        if (currentAction.type !== "General" || currentAction.name !== "Hyperbolic Regeneration Chamber") {
          bb.startAction("General", "Hyperbolic Regeneration Chamber");
        }
        await ns.sleep(1000);
        break;
      }
      case "WORK": {
        const count = bb.getActionCountRemaining("Contract", "Tracking");
        if (count > 0) {
          ns.print(`🎯 Tracking synths in ${currentCity}.`);
          bb.startAction("Contract", "Tracking");
          const time = bb.getActionTime("Contract", "Tracking");
          await ns.sleep(time);
        } else {
          const nextCity = CITIES[(CITIES.indexOf(currentCity) + 1) % CITIES.length];
          ns.print(`⚠️ No Tracking contracts in ${currentCity}. Moving to ${nextCity}...`);
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
