/**
 * VERSION: 1.0.0
 *
 * TOR + Darkweb Unified Buyer
 * - Purchases TOR Router (if not exists)
 * - Purchases all Dark Web programs (prioritizes port hackers)
 * - Uses only official APIs
 *
 * Requirements:
 * - TOR Router (purchased automatically)
 *
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  ns.tprint("==================================================================");
  ns.tprint("🌐 TOR + DARKWEB AUTOMATED BUYER");
  ns.tprint("==================================================================");

  // ============================================================
  // PRECHECKS
  // ============================================================

  if (!ns.singularity) {
    ns.tprint("❌ FATAL: Singularity API not available (SF4 required).");
    return;
  }

  // ============================================================
  // TOR ROUTER
  // ============================================================

  const TOR_COST = 200_000;

  if (ns.hasTorRouter()) {
    ns.tprint("✅ TOR Router already installed.");
  } else {
    const money = ns.getServerMoneyAvailable("home");

    ns.tprint(`🔍 Checking TOR Router... Cost: $${ns.formatNumber(TOR_COST)}`);

    if (money < TOR_COST) {
      ns.tprint(`🟡 Insufficient funds for TOR Router. (${ns.formatNumber(money)})`);
      return;
    }

    if (ns.singularity.purchaseTor()) {
      ns.tprint("✅ SUCCESS: TOR Router purchased!");
    } else {
      ns.tprint("❌ FAILURE: Failed to purchase TOR Router.");
      return;
    }
  }

  // ============================================================
  // DARK WEB PROGRAMS
  // ============================================================

  const darkwebPrograms = [
    // Port Hackers (priority)
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",

    // Utilities
    "ServerProfiler.exe",
    "DeepscanV1.exe",
    "DeepscanV2.exe",
    "AutoLink.exe",
    "Formulas.exe",
  ];

  ns.tprint("🛒 Starting Dark Web programs purchase...");

  let purchased = 0;

  for (const program of darkwebPrograms) {
    if (ns.fileExists(program, "home")) {
      ns.print(`   - Skip: ${program} (already exists)`);
      continue;
    }

    let ok = false;
    try {
      ok = ns.singularity.purchaseProgram(program);
    } catch (err) {
      ns.tprint(`❌ CRITICAL ERROR purchasing ${program}: ${err}`);
      return;
    }

    if (ok) {
      ns.tprint(`✅ Purchased: ${program}`);
      purchased++;
    } else {
      ns.tprint(`🟡 Could not purchase ${program} (insufficient funds or unavailable).`);
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  if (purchased === 0) {
    ns.tprint("ℹ️ No new programs were purchased.");
  } else {
    ns.tprint(`✅ Purchase completed. Total acquired: ${purchased}`);
  }

  ns.tprint("==================================================================");
}
