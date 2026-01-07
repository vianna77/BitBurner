/**
 * VERSION: 1.0.0
 * FACTION WORK SCRIPT
 *
 * DESCRIPTION:
 * Starts work for specified faction using Singularity API.
 *
 * USAGE:
 * run faction-work.js [factionName] [workType] [focus]
 * - factionName: Name of the faction to work for
 * - workType: Type of work (hacking, field, security)
 * - focus: Optional boolean for focus mode (default: true)
 */

/** @param {NS} ns */
export async function main(ns) {
  const [faction, workType, focus = true] = ns.args;
  ns.singularity.workForFaction(faction, workType, focus);
}
