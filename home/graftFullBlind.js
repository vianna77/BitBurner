/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();
  ns.ui.resizeTail(1200, 470);

  const WAIT_INTERVAL = 60000; // 1 minute wait between full cycles
  const BLACKLIST = [
    "PCMatrix",
    "Enhanced Social Interaction Implant",
    "TITN-41 Gene-Modification Injection",
    "Speech Processor Implant",
    "Nuoptimal Nootropic Injector Implant",
    "Speech Enhancement"
  ];

  const getTS = () => `[${new Date().toLocaleTimeString("en-US", { hour12: false })}] `;

  // Prevent multiple instances
  const running = ns.ps("home").filter(
    p => p.filename === ns.getScriptName() && p.pid !== ns.pid
  );
  if (running.length > 0) {
    ns.print(`${getTS()}❌ ERROR: Script already running.`);
    return;
  }

  // Check if graftMaster.js is running
  const conflictingScript = ns.ps("home").find(p => p.filename === "graftMaster.js");
  if (conflictingScript) {
    ns.print(`${getTS()}❌ ERROR: graftMaster.js is already running (PID: ${conflictingScript.pid})!`);
    ns.print(`${getTS()}Cannot run both grafting scripts simultaneously.`);
    return;
  }

  while (true) {
    // 1. Re-evaluate owned and available grafts via function call
    const grafts = getGraftList(ns, BLACKLIST);

    if (grafts.length === 0) {
      ns.print(`${getTS()}No eligible grafts found. Checking again in ${WAIT_INTERVAL / 1000}s...`);
      await ns.sleep(WAIT_INTERVAL);
      continue;
    }

    ns.print("=================================================");
    ns.print(`${ns.getScriptName()} v1.0.0`);
    ns.print(`Queue: ${grafts.length} augmentations`);
    for (const aug of grafts) {
      ns.print(` > ${aug.name} (${ns.formatNumber(aug.cost)})`);
    }
    ns.print("=================================================");

    // 2. Sequential Execution
    for (const aug of grafts) {
      // Safety: Wait for any ongoing graft (even if started externally)
      await ns.grafting.waitForOngoingGrafting();

      // Money skip: If not enough, pass to the next graft in the list
      if (ns.getPlayer().money < aug.cost) {
        ns.print(`${getTS()}[SKIP] 💸 Insufficient funds for ${aug.name}: ${ns.formatNumber(aug.cost)}`);
        continue;
      }

      ns.print("-------------------------------------------------");
      ns.print(`${getTS()}⚙️ Target: ${aug.name}`);

      const graftTime = ns.grafting.getAugmentationGraftTime(aug.name);
      ns.print(`${getTS()}⏳ Est. Time: ${ns.tFormat(graftTime)}`);

      ns.print(`${getTS()}🚀 Starting: ${aug.name} (${ns.formatNumber(aug.cost)})`);

      let success = ns.grafting.graftAugmentation(aug.name, true);

      if (success) {
        ns.print(`${getTS()}✅ Graft initiated. Waiting for completion...`);
        await ns.grafting.waitForOngoingGrafting();
        ns.print(`${getTS()}🎉 Successfully installed ${aug.name}`);
      } else {
        ns.print(`${getTS()}❌ Failed to start ${aug.name}. Skipping.`);
        continue;
      }
    }

    ns.print("=================================================");
    ns.print(`${getTS()}Cycle processed. Re-scanning for skipped or newly available grafts...`);
    await ns.sleep(WAIT_INTERVAL);
  }
}

/** * Scans, filters and sorts available grafts
 * @param {NS} ns
 * @param {string[]} blacklist
 */
function getGraftList(ns, blacklist) {
  const owned = ns.singularity.getOwnedAugmentations(true);
  return ns.grafting.getGraftableAugmentations()
    .filter(a => !owned.includes(a))
    .filter(a => !blacklist.includes(a))
    .map(a => ({
      name: a,
      cost: ns.grafting.getAugmentationGraftPrice(a)
    }))
    .sort((a, b) => b.cost - a.cost);
}
