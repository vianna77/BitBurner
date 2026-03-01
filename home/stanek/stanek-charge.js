/**
 * This script charges a specified fragment of Stanek's Gift.
 * It can be run in two modes:
 * 1. List mode: run stanek-charge.js
 *    - Displays a list of all active fragments and their properties.
 * 2. Charge mode: run stanek-charge.js <fragment-index>
 *    - Continuously charges the fragment at the specified index.
 *
 * The charge power is determined by the number of threads this script is running with.
 *
 * @version 2.3.0
 */

/**
 * @param {NS} ns The Netscript API.
 */
/**
 * Get fragment effect text
 * @param {NS} ns
 * @param {number} fragmentId
 * @returns {string}
 */
function getFragmentEffect(ns, fragmentId) {
  const definitions = ns.stanek.fragmentDefinitions();
  const definition = definitions.find(def => def.id === fragmentId);
  return definition?.effect ?? "Unknown";
}

/**
 * Check if a fragment is a booster (non-chargeable)
 * @param {NS} ns
 * @param {number} fragmentId
 * @returns {boolean}
 */
function isBooster(ns, fragmentId) {
  const effect = getFragmentEffect(ns, fragmentId);
  return effect.toLowerCase().includes("adjacent");
}

export async function main(ns) {
  const fragmentIndex = ns.args[0];

  let fragments;
  try {
    fragments = ns.stanek.activeFragments();
  } catch (error) {
    ns.tprint("❌ ERROR: Stanek's Gift not found. This script is only usable after installing the augmentation.");
    ns.exit();
  }

  if (fragmentIndex === undefined) {
    ns.tprint("📋 Listing all fragments of Stanek's Gift:");
    fragments.forEach((fragment, i) => {
      const charge = (fragment.numCharge ?? 0).toFixed(2);
      const best = (fragment.highestCharge ?? 0).toFixed(2);
      const effect = getFragmentEffect(ns, fragment.id);
      const booster = isBooster(ns, fragment.id);
      const status = booster ? "🚫 Booster" : "⚡ Chargeable";
      ns.tprint(`  [${i}] ${status} | ID: ${fragment.id} | Coords: (${fragment.x}, ${fragment.y}) | Charge: ${charge} | Best: ${best} | Effect: ${effect}`);
    });
    ns.tprint("\nTo start charging, run the script with the desired fragment index.");
    ns.tprint("Example: run stanek-charge.js 0");
    return;
  }

  const index = Number(fragmentIndex);
  if (isNaN(index) || index < 0 || index >= fragments.length) {
    ns.tprint(`❌ Invalid fragment index: ${fragmentIndex}. Please provide a number between 0 and ${fragments.length - 1}.`);
    return;
  }

  const targetFragment = fragments[index];
  const { x, y, id } = targetFragment;

  if (isBooster(ns, id)) {
    ns.tprint(`🚫 ERROR: Fragment ID ${id} at index [${index}] is a Booster and cannot be charged.`);
    ns.tprint("Boosters enhance adjacent fragments but are not chargeable themselves.");
    return;
  }

  const initialCharge = targetFragment.numCharge ?? 0;
  let chargeCount = 0;

  ns.tprint(`⚡ Targeting fragment ID ${id} at index [${index}] (${x}, ${y}). Starting continuous charge...`);

  // Infinite loop to continuously charge the fragment.
  // The charge effect is based on the script's thread count.
  while (true) {
    try {
      await ns.stanek.chargeFragment(x, y);
      chargeCount++;

      if (chargeCount % 10 === 0) {
        const current = ns.stanek.activeFragments()[index];
        const currentCharge = current?.numCharge ?? 0;
        const gain = currentCharge - initialCharge;
        ns.print(`⚡ Charges: ${chargeCount} | Current: ${currentCharge.toFixed(2)} | Gain: +${gain.toFixed(2)}`);
      }
    } catch (error) {
      ns.tprint(`❌ ERROR: Failed to charge fragment at (${x}, ${y}). It might have been moved or become invalid.`);
      ns.tprint("Please list the fragments again to check their status. Exiting script.");
      ns.exit();
    }
  }
}
