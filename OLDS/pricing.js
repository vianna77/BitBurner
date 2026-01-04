// VERSION: BN4 Server Price Checker v1.0.1

/** * SUMMARY:
 * This script calculates and displays a formatted table of costs for purchasing 
 * private servers at specific RAM intervals. It is designed to assist in 
 * financial planning for server upgrades during Bitnode 4.
 * * PARAMETERS:
 * None.
 * * USAGE:
 * run pricing.js
 */

/** @param {NS} ns */
export async function main(ns) {
  const RAM_SIZES = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
  
  ns.tprint("=== PURCHASED SERVER COST TABLE ===");
  ns.tprint("RAM SIZE      |  UNIT COST");
  ns.tprint("--------------|------------");
  
  for (const ram of RAM_SIZES) {
    const cost = ns.getPurchasedServerCost(ram);
    const ramLabel = `${ram} GB`.padEnd(13);
    const costLabel = ns.formatNumber(cost).padStart(10);
    ns.tprint(`${ramLabel} | ${costLabel}`);
  }
}
