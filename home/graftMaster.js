// VERSION 2.0.0
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
  ns.ui.resizeTail(990, 745);
  ns.ui.moveTail(600, 50);
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

  // Check if graftFullBlind.js is running
  const conflictingScript = ns.ps("home").find(p => p.filename === "graftFullBlind.js");
  if (conflictingScript) {
    ns.tprint(`❌ ERROR: graftFullBlind.js is already running (PID: ${conflictingScript.pid})!`);
    ns.tprint("   Cannot run both grafting scripts simultaneously.");
    return;
  }

  // --- CONFIGURATION ---
  const defaultAugmentations = [
    "SPTN-97 Gene Modification",
    "CordiARC Fusion Reactor",
    "Xanipher",
    "Neuroreceptor Management Implant",
    "BrachiBlades",
    "Graphene BrachiBlades Upgrade",
    "nextSENS Gene Modification",
    "Photosynthetic Cells",
    "The Black Hand",
    "OmniTek InfoLoad",
    "ECorp HVMind Implant",
  ];

  // list for hack oriented nodes like BN8:
  // ./graftMaster.js "Neuroreceptor Management Implant" "QLink" "Xanipher" "OmniTek InfoLoad" "BitRunners Neurolink" "ECorp HVMind Implant" "HyperSight Corneal Implant" "Neuregen Gene Modification" "Embedded Netburner Module" "nextSENS Gene Modification" "Embedded Netburner Module Analyze Engine" "Embedded Netburner Module Core Implant" "Embedded Netburner Module Core V2 Upgrade"

  // --- SCRIPT START ---
  ns.ui.openTail();

  const augmentationsToGraft = ns.args.length > 0 ? ns.args : defaultAugmentations;

  const colors = {
    white: "\u001b[37m",
    lightGray: "\u001b[90m",
    reset: "\u001b[0m"
  };

  // --- HELPERS ---
  const getTS = () => `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] `;

  // --- HEADER ---
  ns.print("=================================================");
  ns.print("GRAFT MASTER v2.0.0");
  ns.print(`Initial Grafting Queue: ${augmentationsToGraft.length} augmentation(s)`);
  ns.print("=================================================");

  // --- MAIN LOGIC ---

  // Process each augmentation in the queue
  for (const augName of augmentationsToGraft) {
    ns.print("-------------------------------------------------");

    // Display Queue Status
    ns.print(`${getTS()}[INFO] 📝 Grafting Queue Status:`);
    const ownedAugs = ns.singularity.getOwnedAugmentations(true);
    augmentationsToGraft.forEach((aug, i) => {
      let statusSymbol;
      let augColor;

      if (ownedAugs.includes(aug)) {
        statusSymbol = '✅'; // Done
        augColor = colors.lightGray;
      } else if (aug === augName) {
        statusSymbol = '⚙️'; // Current
        augColor = colors.white;
      } else {
        statusSymbol = '⏳'; // Pending
        augColor = ""; // Default color
      }
      ns.print(`${augColor}${statusSymbol} ${i + 1}. ${aug}${colors.reset}`);
    });
    ns.print("-------------------------------------------------");


    // Check if augmentation is already installed
    if (ownedAugs.includes(augName)) {
      ns.print(`${getTS()}[SKIP] ⏭️ ${augName} is already installed. Skipping.`);
      continue;
    }

    // Safety check: ensure no other graft is running before we start.
    ns.print(`${getTS()}[INFO] ⏳ Verifying no graft is in progress...`);
    await ns.grafting.waitForOngoingGrafting();
    ns.print(`${getTS()}[SUCCESS] ✅ Ready to start new graft.`);

    // Check money
    const cost = ns.grafting.getAugmentationGraftPrice(augName);
    ns.print(`${getTS()}[INFO] 💰 Cost for ${augName}: ${ns.formatNumber(cost)}`);

    if (ns.getPlayer().money < cost) {
      ns.print(`${getTS()}[SKIP] 💸 Insufficient funds for ${augName}. Need ${ns.formatNumber(cost)}. Skipping.`);
      continue;
    }

    // Check time
    const time = ns.grafting.getAugmentationGraftTime(augName);
    ns.print(`${getTS()}[INFO] 🕒 Estimate time for ${augName}: ${ns.tFormat(time)}`);

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
