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
 * @version 2.0.0
 */

/**
 * @param {NS} ns The Netscript API.
 */
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
    ns.tprint("📋 Listing all chargeable fragments of Stanek's Gift:");
    fragments.forEach((fragment, i) => {
      ns.tprint(`  [${i}] ID: ${fragment.id} | Coords: (${fragment.x}, ${fragment.y}) | Charge: ${fragment.numCharge.toFixed(2)} | Best: ${fragment.highestCharge.toFixed(2)}`);
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

  ns.tprint(`⚡ Targeting fragment ID ${id} at index [${index}] (${x}, ${y}). Starting continuous charge...`);

  // Infinite loop to continuously charge the fragment.
  // The charge effect is based on the script's thread count.
  while (true) {
    try {
      await ns.stanek.chargeFragment(x, y);
    } catch (error) {
      ns.tprint(`❌ ERROR: Failed to charge fragment at (${x}, ${y}). It might have been moved or become invalid.`);
      ns.tprint("Please list the fragments again to check their status. Exiting script.");
      ns.exit();
    }
  }
}
