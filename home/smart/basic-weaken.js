/**
 * VERSION: 1.0.0
 * BASIC WEAKEN SCRIPT
 *
 * DESCRIPTION:
 * Performs weaken operation on target server with optional timing delay.
 *
 * USAGE:
 * run basic-weaken.js [target] [startTime]
 * - target: Server hostname to weaken
 * - startTime: Optional timestamp to delay execution until specific time
 */

/** @param {NS} ns **/
export async function main(ns) {
  const [target, start] = ns.args;
  const delay = start ? Math.max(0, start - Date.now()) : 0;
  await ns.sleep(delay);
  await ns.weaken(target);
}
