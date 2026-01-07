/**
 * VERSION: 1.0.0
 * COMMIT CRIMES SCRIPT
 *
 * DESCRIPTION:
 * Commits specified crime using Singularity API.
 *
 * USAGE:
 * run commit-crimes.js [crimeName] [focus]
 * - crimeName: Name of the crime to commit
 * - focus: Optional boolean for focus mode (default: true)
 */

/** @param {NS} ns */
export async function main(ns) {
  const [crime, focus = true] = ns.args;
  ns.singularity.commitCrime(crime, focus);
}
