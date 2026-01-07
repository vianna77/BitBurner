/**
 * VERSION: 1.0.0
 * BASIC GROW SCRIPT
 *
 * DESCRIPTION:
 * Performs grow operation on target server with optional timing delay.
 *
 * USAGE:
 * run basic-grow.js [target] [startTime]
 * - target: Server hostname to grow
 * - startTime: Optional timestamp to delay execution until specific time
 */

/** @param {NS} ns **/
export async function main(ns) {
  const [target, start] = ns.args;
  const delay = start ? Math.max(0, start - Date.now()) : 0;
  await ns.sleep(delay);
  await ns.grow(target);
}
