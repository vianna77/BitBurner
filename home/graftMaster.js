// VERSION 1.4.0
/**
 * This script handles the grafting of specified augmentations.
 * It processes one augmentation completely (start and wait for completion)
 * before moving to the next.
 *
 * It will process a default list or a list provided via arguments.
 *
 * @param {NS} ns The Netscript API.
 */
export async function main(ns) {
  ns.disableLog('ALL');

  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === ns.getScriptName() && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint(`❌ ERROR: ${ns.getScriptName()} is already running on home server!`);
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }

  // --- CONFIGURATION ---
  const defaultAugmentations = [
    "SPTN-97 Gene Modification",
    "CordiARC Fusion Reactor",
    "Xanipher",
    "ECorp HVMind Implant",
    "OmniTek InfoLoad",
  ];
  const travelCity = "New Tokyo";
  const waitInterval = 30000; // 30 seconds

  // --- SCRIPT START ---
  ns.ui.openTail();

  const augmentationsToGraft = ns.args.length > 0 ? ns.args : defaultAugmentations;

  // --- HELPERS ---
  const getTS = () => `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] `;

  // --- HEADER ---
  ns.print("=================================================");
  ns.print("GRAFT MASTER v1.4.0");
  ns.print(`Grafting Queue: ${augmentationsToGraft.length} augmentation(s)`);
  augmentationsToGraft.forEach((aug, i) => ns.print(`  ${i + 1}. ${aug}`));
  ns.print("=================================================");

  // --- MAIN LOGIC ---

  // 1. Travel to New Tokyo if not already there
  if (ns.getPlayer().location !== travelCity) {
    ns.print(`${getTS()}[INFO] ✈️ Traveling to ${travelCity}...`);
    if (!ns.singularity.travelToCity(travelCity)) {
      const msg = `Failed to travel to ${travelCity}. Stopping script.`;
      ns.print(`${getTS()}[ERROR] ❌ ${msg}`);
      ns.toast(msg, "error", 10000);
      return;
    }
  }
  ns.print(`${getTS()}[SUCCESS] ✅ Player is in ${travelCity}.`);

  // 2. Process each augmentation in the queue
  for (const augName of augmentationsToGraft) {
    ns.print("-------------------------------------------------");
    ns.print(`${getTS()}[INFO] ⚙️ Processing augmentation: ${augName}`);

    // Check if augmentation is already installed
    const ownedAugs = ns.singularity.getOwnedAugmentations(true);
    if (ownedAugs.includes(augName)) {
      ns.print(`${getTS()}[SKIP] ⏭️ ${augName} is already installed. Skipping.`);
      continue;
    }

    // Safety check: ensure no other graft is running before we start.
    // This handles cases where the script is started while a graft is
    // already in progress.
    ns.print(`${getTS()}[INFO] ⏳ Verifying no graft is in progress...`);
    await ns.grafting.waitForOngoingGrafting();
    ns.print(`${getTS()}[SUCCESS] ✅ Ready to start new graft.`);

    // Check money and wait if necessary
    const cost = ns.grafting.getAugmentationGraftPrice(augName);
    ns.print(`${getTS()}[INFO] 💰 Cost for ${augName}: ${ns.formatNumber(cost)}`);

    while (ns.getPlayer().money < cost) {
      ns.print(`${getTS()}[WAIT] 💸 Not enough money. Need ${ns.formatNumber(cost)}. Waiting ${waitInterval / 1000}s...`);
      await ns.sleep(waitInterval);
    }
    ns.print(`${getTS()}[SUCCESS] ✅ Money requirement met.`);

    // Start grafting
    ns.print(`${getTS()}[INFO] 🚀 Attempting to start graft for ${augName}...`);
    const graftStarted = ns.grafting.graftAugmentation(augName, true);

    if (!graftStarted) {
      const msg = `Failed to start grafting ${augName}. It might not be graftable or another issue occurred. Skipping.`;
      ns.print(`${getTS()}[ERROR] ❌ ${msg}`);
      ns.toast(msg, "error", 10000);
      continue;
    }

    const startMsg = `Successfully started grafting ${augName}.`;
    ns.print(`${getTS()}[SUCCESS] ✅ ${startMsg}`);
    ns.toast(startMsg, "success", 10000);

    ns.print(`${getTS()}[INFO] ⏳ Now waiting for ${augName} to complete... This may take a while.`);
    await ns.grafting.waitForOngoingGrafting();
    ns.print(`${getTS()}[SUCCESS] 🎉 Graft for ${augName} is complete.`);
  }

  ns.print("=================================================");
  const finalMsg = "All augmentations in the queue have been grafted. Exiting script.";
  ns.print(`${getTS()}[SUCCESS] 🎉 ${finalMsg}`);
  ns.toast(finalMsg, "success");
}
