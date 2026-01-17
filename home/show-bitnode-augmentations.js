// VERSION 1.0.0

/**
 * Displays installed Augmentations and obtained Source Files.
 *
 * Purpose:
 *   Shows all augmentations installed in the current BitNode and lists
 *   all Source Files obtained from completing BitNodes.
 *
 * Parameters:
 *   @param {NS} ns - Netscript object providing game API access
 *
 * Dependencies:
 *   - Requires SF4 (The Singularity) for augmentation checking
 *   - Uses ns.singularity.getOwnedAugmentations()
 *   - Uses ns.singularity.getOwnedSourceFiles()
 *
 * Usage:
 *   run show-bitnode-augmentations.js
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // ============================================
  // 1. INSTALLED AUGMENTATIONS (Requires SF4)
  // ============================================

  let installedAugments = [];
  let augmentsCheckSuccess = false;

  // getOwnedAugmentations requires SF4 (The Singularity)
  try {
    installedAugments = ns.singularity.getOwnedAugmentations(true);
    augmentsCheckSuccess = true;
  } catch (e) {
    // Ignore error and mark check as failed
  }

  ns.tprint("==============================================");
  ns.tprint("🧠 INSTALLED AUGMENTATIONS IN CURRENT BITNODE");
  ns.tprint("==============================================");

  if (augmentsCheckSuccess) {
    if (installedAugments.length > 0) {
      ns.tprint(`Total Installed Augments: ${installedAugments.length}`);

      // Logic to consolidate NeuroFlux Governor
      const augmentCounts = {};
      installedAugments.forEach(augment => {
        augmentCounts[augment] = (augmentCounts[augment] || 0) + 1;
      });

      Object.keys(augmentCounts).forEach(augment => {
        if (augment === "NeuroFlux Governor") {
          ns.tprint(`- ${augment} (Level: ${augmentCounts[augment]})`);
        } else {
          ns.tprint(`- ${augment}`);
        }
      });

    } else {
      ns.tprint("No Augments (besides Source Files) installed in this BitNode yet.");
    }
  } else {
    ns.tprint("Status: Unable to check installed Augments. (SF4 'The Singularity' locked).");
  }

  // ============================================
  // 2. OBTAINED SOURCE FILES (Persistent BitNode Augments)
  // ============================================

  ns.tprint("=============================================");
  ns.tprint("💾 OBTAINED SOURCE FILES");
  ns.tprint("=============================================");

  // Using ns.singularity.getOwnedSourceFiles()
  try {
    const ownedSourceFiles = ns.singularity.getOwnedSourceFiles();

    if (ownedSourceFiles.length > 0) {
      ownedSourceFiles.forEach(sf => {
        ns.tprint(`- Source File ${sf.n}: Rank ${sf.lvl}`);
      });
    } else {
      ns.tprint("No Source Files listed (unlikely error, since SF1 was detected).");
    }
  } catch (e) {
    ns.tprint("FATAL ERROR: ns.singularity.getOwnedSourceFiles() function failed.");
  }

  ns.tprint("=============================================");
}
